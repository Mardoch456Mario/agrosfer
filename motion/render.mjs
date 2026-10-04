// Rendu de l'animation en MP4 : Chromium (Playwright) dessine chaque image, ffmpeg encode.
//   node render.mjs --format 16x9            -> ../videos/agrosfer_motion_16x9.mp4
//   node render.mjs --format 9x16            -> ../videos/agrosfer_motion_9x16.mp4
//   node render.mjs --stills 0.5,2.6,7.8     -> out/stills/*.png (contrôle rapide)
// Options : --fps 30 --samples 10 (flou de mouvement) --no-audio
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, []),
);
const format = args.format || '16x9';
const [W, H] = format === '9x16' ? [1080, 1920] : [1920, 1080];
const fps = Number(args.fps || 30);
const samples = Number(args.samples || 10);
const outDir = path.join(here, 'out');
const videoDir = path.join(here, '..', 'videos');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(here, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(here) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e));
await page.goto(url);
await page.evaluate(([w, h]) => AGRO.init(w, h), [W, H]);
const canvas = await page.$('#c');
const duration = await page.evaluate(() => AGRO.DURATION);

async function shot(t) {
  await page.evaluate(([t, fps, s]) => AGRO.renderFrame(t, fps, s), [t, fps, samples]);
  return canvas.screenshot({ type: 'png' });
}

if (args.stills) {
  const dir = path.join(outDir, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of String(args.stills).split(',').map(Number)) {
    fs.writeFileSync(path.join(dir, `${format}_${t.toFixed(2)}.png`), await shot(t));
  }
  console.log('stills ->', dir);
} else {
  // piste son : événements + trajectoire du drone -> sfx.py -> wav
  const base = path.join(videoDir, `agrosfer_motion_${format}`);
  let wav = null;
  if (!args['no-audio']) {
    const meta = await page.evaluate(() => ({ duration: AGRO.DURATION, events: AGRO.SFX, track: AGRO.track(100) }));
    fs.writeFileSync(`${base}.sfx.json`, JSON.stringify(meta));
    wav = `${base}.wav`;
    execSync(`python3 "${path.join(here, 'sfx.py')}" "${base}.sfx.json" "${wav}"`, { stdio: 'inherit' });
  }
  const ff = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      ...(wav ? ['-i', wav] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p',
      '-profile:v', 'high', '-tune', 'animation',
      ...(wav ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
      '-movflags', '+faststart',
      `${base}.mp4`,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const frames = Math.round(duration * fps);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = await shot(i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 30 === 0) process.stdout.write(`\r${format} frame ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  for (const f of [`${base}.sfx.json`, wav]) if (f && fs.existsSync(f)) fs.unlinkSync(f);
  console.log(`\n-> ${base}.mp4`);
}

await browser.close();
server.close();
