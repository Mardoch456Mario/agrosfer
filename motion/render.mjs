// Rendu d'une scène en MP4 : Chromium (Playwright) dessine chaque image, ffmpeg encode.
//   node render.mjs --scene drone --format 9x16   -> ../videos/agrosfer_drone_9x16.mp4
//   node render.mjs --scene studio --format 16x9
//   node render.mjs --scene app --stills 1,4.5,9  -> out/stills/*.png (contrôle rapide)
//   node render.mjs --scene drone --audio-only    -> ../videos/agrosfer_drone.wav
// Options : --fps 30 --samples 16 (flou de mouvement) --no-audio
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
const scene = args.scene || 'drone';
const format = args.format || '16x9';
const [W, H] = format === '9x16' ? [1080, 1920] : [1920, 1080];
const fps = Number(args.fps || 30);
const samples = Number(args.samples || 16);
const outDir = path.join(here, 'out');
const videoDir = path.join(here, '..', 'videos');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' };
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
const url = `http://127.0.0.1:${server.address().port}/index.html?scene=${scene}`;

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e));
page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
await page.goto(url);
await page.evaluate(() => window.sceneReady);
await page.evaluate(([w, h]) => SCENE.init(w, h), [W, H]);
const canvas = await page.$('#c');
const duration = await page.evaluate(() => SCENE.DURATION);
const base = path.join(videoDir, `agrosfer_${scene}_${format}`);

async function shot(t) {
  await page.evaluate(([t, fps, s]) => SCENE.renderFrame(t, fps, s), [t, fps, samples]);
  return canvas.screenshot({ type: 'png' });
}

// piste son : événements + timeline + trajectoire -> audio/mix.py -> wav
function audio(wavPath) {
  return page
    .evaluate(() => ({
      duration: SCENE.DURATION,
      events: SCENE.SFX || [],
      T: SCENE.T || {},
      music: SCENE.MUSIC || null,
      track: SCENE.track ? SCENE.track(100) : [],
    }))
    .then((meta) => {
      const json = `${wavPath}.json`;
      fs.writeFileSync(json, JSON.stringify(meta));
      execSync(`python3 "${path.join(here, 'audio', 'mix.py')}" "${json}" "${wavPath}"`, { stdio: 'inherit' });
      fs.unlinkSync(json);
    });
}

if (args.stills) {
  const dir = path.join(outDir, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of String(args.stills).split(',').map(Number)) {
    fs.writeFileSync(path.join(dir, `${scene}_${format}_${t.toFixed(2)}.png`), await shot(t));
  }
  console.log('stills ->', dir);
} else if (args['audio-only']) {
  await audio(path.join(videoDir, `agrosfer_${scene}.wav`));
} else {
  let wav = null;
  if (!args['no-audio']) {
    wav = `${base}.wav`;
    await audio(wav);
  }
  const ff = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      ...(wav ? ['-i', wav] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
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
    if (i % 30 === 0) process.stdout.write(`\r${scene} ${format} frame ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  if (wav && fs.existsSync(wav)) fs.unlinkSync(wav);
  console.log(`\n-> ${base}.mp4`);
}

await browser.close();
server.close();
