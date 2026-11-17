import { open, type FileHandle } from 'node:fs/promises';

/**
 * Minimal ISO-BMFF (MP4 / MOV) probe: walks boxes with positioned reads, never buffering the file.
 * Handles 64-bit `largesize` boxes, size-0 "to end of file" boxes and a `moov` placed after `mdat`.
 *
 *   moov ─ mvhd                       → timescale, duration
 *        └ trak (first with hdlr=vide)
 *            ├ tkhd                   → width, height (16.16), rotation matrix
 *            └ mdia ─ hdlr            → handler type
 *                   └ minf ─ stbl ─ stsd → first sample entry fourcc (codec)
 */
export interface Mp4Info {
  durationMs: number;
  /** Display width (after rotation). */
  width: number;
  /** Display height (after rotation). */
  height: number;
  rotation: 0 | 90 | 180 | 270;
  /** Sample entry fourcc, e.g. "avc1", "hvc1", "hev1". */
  codec: string;
}

interface Box {
  type: string;
  /** Offset of the box's payload (after size/type/largesize). */
  start: number;
  /** Offset just past the box. */
  end: number;
}

const MAX_BOXES = 10_000;

class Reader {
  constructor(
    private readonly fh: FileHandle,
    readonly fileSize: number,
  ) {}

  async read(position: number, length: number): Promise<Buffer> {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await this.fh.read(buf, 0, length, position);
    if (bytesRead < length) throw new Error(`Unexpected end of file at ${position}`);
    return buf;
  }

  /** Lists the child boxes inside [from, to). */
  async children(from: number, to: number): Promise<Box[]> {
    const boxes: Box[] = [];
    let offset = from;
    while (offset + 8 <= to) {
      if (boxes.length >= MAX_BOXES) throw new Error('Too many boxes');
      const head = await this.read(offset, 8);
      let size = head.readUInt32BE(0);
      const type = head.toString('latin1', 4, 8);
      let headerSize = 8;
      if (size === 1) {
        const large = (await this.read(offset + 8, 8)).readBigUInt64BE(0);
        if (large > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`Box ${type} too large`);
        size = Number(large);
        headerSize = 16;
      } else if (size === 0) {
        size = to - offset; // extends to the end of the enclosing container (the file at top level)
      }
      if (size < headerSize) throw new Error(`Box ${type} has invalid size ${size}`);
      const end = offset + size;
      if (end > to) throw new Error(`Box ${type} overruns its container`);
      boxes.push({ type, start: offset + headerSize, end });
      offset = end;
    }
    return boxes;
  }

  async child(parent: Box, type: string): Promise<Box> {
    const found = (await this.children(parent.start, parent.end)).find((b) => b.type === type);
    if (!found) throw new Error(`Missing ${type} box`);
    return found;
  }

  /** Reads up to `max` payload bytes of a box (at least `min`). */
  async payload(box: Box, min: number, max = 256): Promise<Buffer> {
    const length = Math.min(box.end - box.start, max);
    if (length < min) throw new Error(`Box ${box.type} too short`);
    return this.read(box.start, length);
  }
}

export async function probeMp4(path: string): Promise<Mp4Info> {
  const fh = await open(path, 'r');
  try {
    const reader = new Reader(fh, (await fh.stat()).size);
    const top = await reader.children(0, reader.fileSize);
    const moov = top.find((b) => b.type === 'moov');
    if (!moov) throw new Error('Missing moov box');
    const moovChildren = await reader.children(moov.start, moov.end);

    const mvhdBox = moovChildren.find((b) => b.type === 'mvhd');
    if (!mvhdBox) throw new Error('Missing mvhd box');
    const durationMs = readMvhd(await reader.payload(mvhdBox, 20));

    for (const trak of moovChildren.filter((b) => b.type === 'trak')) {
      const mdia = await reader.child(trak, 'mdia');
      const hdlr = await reader.payload(await reader.child(mdia, 'hdlr'), 12);
      if (hdlr.toString('latin1', 8, 12) !== 'vide') continue;

      const tkhd = readTkhd(await reader.payload(await reader.child(trak, 'tkhd'), 84));
      const stbl = await reader.child(await reader.child(mdia, 'minf'), 'stbl');
      const entry = readStsd(await reader.payload(await reader.child(stbl, 'stsd'), 16, 64));

      // Some muxers leave tkhd width/height at 0: fall back to the sample entry's coded size.
      const stored = tkhd.width > 0 && tkhd.height > 0 ? tkhd : entry;
      if (!(stored.width > 0 && stored.height > 0)) throw new Error('Video track has no dimensions');
      const swap = tkhd.rotation === 90 || tkhd.rotation === 270;
      return {
        durationMs,
        width: swap ? stored.height : stored.width,
        height: swap ? stored.width : stored.height,
        rotation: tkhd.rotation,
        codec: entry.codec,
      };
    }
    throw new Error('No video track');
  } finally {
    await fh.close();
  }
}

/** mvhd (full box): v0 = created(4) modified(4) timescale(4) duration(4); v1 = 8/8/4/8. */
function readMvhd(b: Buffer): number {
  const version = b[0];
  let timescale: number;
  let duration: number;
  if (version === 1) {
    if (b.length < 32) throw new Error('mvhd v1 too short');
    timescale = b.readUInt32BE(20);
    const d = b.readBigUInt64BE(24);
    if (d === 0xffffffffffffffffn) throw new Error('mvhd duration unknown');
    duration = Number(d);
  } else if (version === 0) {
    timescale = b.readUInt32BE(12);
    duration = b.readUInt32BE(16);
    if (duration === 0xffffffff) throw new Error('mvhd duration unknown');
  } else {
    throw new Error(`mvhd version ${version} unsupported`);
  }
  if (timescale === 0) throw new Error('mvhd timescale is 0');
  const ms = Math.round((duration * 1000) / timescale);
  if (!(ms > 0)) throw new Error('mvhd duration is 0');
  return ms;
}

/**
 * tkhd (full box). After the version-dependent times/ids come 16 bytes of reserved/layer/group/volume,
 * then the 3×3 matrix (9 × int32), then width and height as 16.16 fixed point.
 * The rotation is atan2(b, a) of the matrix's first row, rounded to a multiple of 90°.
 */
function readTkhd(b: Buffer): { width: number; height: number; rotation: Mp4Info['rotation'] } {
  const version = b[0];
  if (version !== 0 && version !== 1) throw new Error(`tkhd version ${version} unsupported`);
  const matrixAt = 4 + (version === 1 ? 32 : 20) + 16;
  if (b.length < matrixAt + 44) throw new Error('tkhd too short');
  const a = b.readInt32BE(matrixAt) / 65536;
  const bb = b.readInt32BE(matrixAt + 4) / 65536;
  const degrees = (Math.round((Math.atan2(bb, a) * 180) / Math.PI / 90) * 90 + 360) % 360;
  return {
    width: Math.round(b.readUInt32BE(matrixAt + 36) / 65536),
    height: Math.round(b.readUInt32BE(matrixAt + 40) / 65536),
    rotation: degrees as Mp4Info['rotation'],
  };
}

/**
 * stsd (full box): entry_count(4), then the first sample entry: size(4) fourcc(4) reserved(6)
 * data_reference_index(2) pre_defined/reserved(16) width(2) height(2).
 */
function readStsd(b: Buffer): { codec: string; width: number; height: number } {
  if (b.readUInt32BE(4) < 1) throw new Error('stsd has no entries');
  const codec = b.toString('latin1', 12, 16);
  if (!/^[\x20-\x7e]{4}$/.test(codec)) throw new Error('stsd sample entry type is not a fourcc');
  const hasSize = b.length >= 44;
  return {
    codec,
    width: hasSize ? b.readUInt16BE(8 + 8 + 24) : 0,
    height: hasSize ? b.readUInt16BE(8 + 8 + 26) : 0,
  };
}
