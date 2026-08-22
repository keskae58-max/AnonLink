/**
 * Build a looping water GIF from the static PNG so the background actually plays.
 */
const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');
const GIFEncoder = require('gif-encoder-2');

async function main() {
  const src = path.join(__dirname, '..', 'assets', 'bg-water.png');
  const out = path.join(__dirname, '..', 'assets', 'bg-water.gif');
  const base = await Jimp.read(src);

  const w = 480;
  const h = 720;
  base.cover({ w, h });

  const encoder = new GIFEncoder(w, h);
  encoder.setDelay(100);
  encoder.setRepeat(0);
  encoder.setQuality(20);
  encoder.start();

  const frames = 12;
  for (let i = 0; i < frames; i++) {
    const t = (i / frames) * Math.PI * 2;
    const ox = Math.round(Math.sin(t) * 18);
    const oy = Math.round(Math.cos(t * 0.85) * 14);
    const scale = 1.1 + Math.sin(t) * 0.03;

    const frame = new Jimp({ width: w, height: h, color: 0x030303ff });
    const layer = base.clone();
    const sw = Math.round(w * scale);
    const sh = Math.round(h * scale);
    layer.resize({ w: sw, h: sh });
    frame.composite(layer, Math.round((w - sw) / 2) + ox, Math.round((h - sh) / 2) + oy);
    encoder.addFrame(frame.bitmap.data);
  }

  encoder.finish();
  fs.writeFileSync(out, encoder.out.getData());
  console.log('Wrote', out, (fs.statSync(out).size / 1024 / 1024).toFixed(2), 'MB');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
