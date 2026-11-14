# Seed media

The seed (`npm run db:seed`) copies these files into `api/uploads/media/` under fixed UUID names.

## `images/`
- Real photos: `.jpg` or `.png`, **≤ 1 MB each**, 10–15 of them (Salamiyah streets, Shmemis Castle, cafés, the market, food, sky).
- If this folder has no `.jpg`/`.png` files, the seed generates 12 simple gradient PNGs here (`generated-XX.png`). Delete them once real photos are added.

## `videos/`
- **Vertical** (portrait) `.mp4`, **H.264 (`avc1`)** video, **≤ 15 s**, **≤ 8 MB** each, 6–8 clips.
- HEVC/H.265 clips (the iPhone default) are rejected by the API in Phase 4. On iPhone choose Settings → Camera → Formats → "Most Compatible" before recording.
- Check a clip's codec on Windows with VLC → Tools → Codec Information (you want "H264 - MPEG-4 AVC (part 10) (avc1)").
- If this folder is empty, the seed skips video posts and reels and prints a warning.

Files are used in name order and reused when the seed needs more than are present.
