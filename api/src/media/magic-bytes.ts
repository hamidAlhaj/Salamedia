import { open, type FileHandle } from 'node:fs/promises';

/** The real file type, from the first bytes of the file. The client's declared MIME is never trusted. */
export type DetectedType = 'jpeg' | 'png' | 'webp' | 'isobmff';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** ISO-BMFF brands we accept (major brand, or a compatible brand inside the first 32 bytes). */
const VIDEO_BRANDS = new Set(['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V ', 'qt  ']);

async function readAt(fh: FileHandle, position: number, length: number): Promise<Buffer> {
  const buf = Buffer.alloc(length);
  const { bytesRead } = await fh.read(buf, 0, length, position);
  return buf.subarray(0, bytesRead);
}

/** Reads the first 32 bytes and returns the detected type, or null when it is none of ours. */
export async function detectFileType(path: string): Promise<DetectedType | null> {
  const fh = await open(path, 'r');
  try {
    return detectFromHead(await readAt(fh, 0, 32));
  } finally {
    await fh.close();
  }
}

function detectFromHead(head: Buffer): DetectedType | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (head.length >= 8 && head.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (head.length >= 12 && head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP') {
    return 'webp';
  }
  if (head.length >= 12 && head.toString('latin1', 4, 8) === 'ftyp') {
    // ftyp: size(4) 'ftyp' major_brand(4) minor_version(4) compatible_brands(4 each)
    const boxEnd = Math.min(head.readUInt32BE(0), head.length);
    const brands = [head.toString('latin1', 8, 12)];
    for (let o = 16; o + 4 <= boxEnd; o += 4) brands.push(head.toString('latin1', o, o + 4));
    if (brands.some((b) => VIDEO_BRANDS.has(b))) return 'isobmff';
  }
  return null;
}

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Display width/height from a JPEG, PNG or WebP header (no library, positioned reads only).
 * JPEG EXIF orientations 5–8 swap width and height, because browsers draw the image rotated.
 * Throws when the header is malformed.
 */
export async function readImageSize(path: string, type: Exclude<DetectedType, 'isobmff'>): Promise<ImageSize> {
  const fh = await open(path, 'r');
  try {
    const size = type === 'png' ? await pngSize(fh) : type === 'webp' ? await webpSize(fh) : await jpegSize(fh);
    if (!(size.width > 0 && size.height > 0)) throw new Error('Image has no dimensions');
    return size;
  } finally {
    await fh.close();
  }
}

async function pngSize(fh: FileHandle): Promise<ImageSize> {
  const b = await readAt(fh, 0, 24);
  if (b.length < 24 || b.toString('latin1', 12, 16) !== 'IHDR') throw new Error('PNG without IHDR');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

async function webpSize(fh: FileHandle): Promise<ImageSize> {
  const b = await readAt(fh, 0, 30);
  if (b.length < 30) throw new Error('WebP header too short');
  const chunk = b.toString('latin1', 12, 16);
  if (chunk === 'VP8 ') {
    // Lossy: frame tag (3) + start code 9D 01 2A, then 14-bit width/height.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) throw new Error('WebP VP8 start code missing');
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    if (b[20] !== 0x2f) throw new Error('WebP VP8L signature missing');
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  }
  throw new Error(`Unknown WebP chunk ${chunk}`);
}

/** Walks JPEG markers up to the first SOF; reads the EXIF orientation from APP1 on the way. */
async function jpegSize(fh: FileHandle): Promise<ImageSize> {
  let offset = 2;
  let orientation = 1;
  for (let guard = 0; guard < 1000; guard++) {
    const m = await readAt(fh, offset, 4);
    if (m.length < 2) break;
    if (m[0] !== 0xff) throw new Error('JPEG marker expected');
    const marker = m[1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2; // standalone markers carry no length
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // end of image / start of scan before any SOF
    if (m.length < 4) break;
    const length = m.readUInt16BE(2);
    if (length < 2) throw new Error('JPEG segment length invalid');
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      const sof = await readAt(fh, offset + 4, 5);
      if (sof.length < 5) break;
      const size = { height: sof.readUInt16BE(1), width: sof.readUInt16BE(3) };
      return orientation >= 5 && orientation <= 8 ? { width: size.height, height: size.width } : size;
    }
    if (marker === 0xe1 && orientation === 1) {
      orientation = exifOrientation(await readAt(fh, offset + 4, Math.min(length - 2, 64 * 1024)));
    }
    offset += 2 + length;
  }
  throw new Error('JPEG without a frame header');
}

/** EXIF tag 0x0112 from IFD0 of an APP1 payload; 1 (normal) when absent or unreadable. */
function exifOrientation(app1: Buffer): number {
  if (app1.length < 14 || app1.toString('latin1', 0, 6) !== 'Exif\0\0') return 1;
  const tiff = app1.subarray(6);
  const order = tiff.toString('latin1', 0, 2);
  if (order !== 'II' && order !== 'MM') return 1;
  const le = order === 'II';
  const u16 = (o: number) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o: number) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  try {
    const ifd = u32(4);
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (u16(entry) === 0x0112) return u16(entry + 8);
    }
  } catch {
    // Truncated EXIF: treat as unrotated.
  }
  return 1;
}
