// AgroSfer — film de présentation dans l'esprit "Aldeon Studio" :
// fond noir, typographie cinétique, cartes d'interface, défilements de tags, recherche + clic, planète lumineuse.
(async () => {
  await Core.loadScript('lib/ui.js');
  await Core.loadScript('lib/gl3d.js');
  await Core.loadScript('assets/data/globe_points.js');
  const { clamp, lerp, prog, rad, ease, hash, canvas, text, measure, fitSize, rr, fillRR } = Core;

  const BPM = 120;
  const BEAT = 60 / BPM;
  const T = {
    hello: 0.5, name: 1.1, nameOut: 2.35, pins: 2.7, s1Out: 3.65,
    s2: 4.0, w1: 4.05, w2: 4.5, w3: 5.4, w4: 6.3, s2Out: 7.6,
    s3: 8.0, l1: 8.25, l2: 9.15, l3: 10.05, l4: 10.95, s3Out: 11.75,
    s4: 12.0, line1: 12.2, line2: 13.2, s4Out: 14.35,
    s5: 15.0, s5Out: 17.6,
    s6: 18.0, type0: 18.3, type1: 19.0, enter: 19.15, cursor: 19.55, clickAt: 20.3, s6Out: 20.6,
    s7: 21.0, logo: 21.25, word: 21.9, tag: 22.45, glitch: 25.0, end: 26.0,
  };
  const DURATION = T.end;

  const C = {
    bg: '#040605', white: '#F4F7F5', dim: 'rgba(244,247,245,0.55)', line: 'rgba(255,255,255,0.07)',
    green: '#8CC63F', blue: '#4DA3E0', lemon: '#E8F59A', ink: '#0B120E',
  };

  // ---------------------------------------------------------------- bruitages
  const SFX = [
    { t: 0.0, type: 'whoosh', dur: 1.2, f0: 200, f1: 900, gain: 0.35 },
    { t: T.hello, type: 'glitch', dur: 0.25, gain: 0.35 },
    { t: T.name, type: 'glitch', dur: 0.4, gain: 0.5 },
    { t: T.name + 0.35, type: 'boom', gain: 0.55 },
    { t: T.nameOut, type: 'glitch', dur: 0.3, gain: 0.4 },
    { t: T.pins, type: 'beep', f: 1760, n: 1, gain: 0.45 },
    { t: T.pins + 0.2, type: 'beep', f: 1975, n: 1, gain: 0.45 },
    { t: T.pins + 0.4, type: 'beep', f: 2350, n: 2, gain: 0.45 },
    { t: T.pins + 0.55, type: 'swish', dur: 0.6, gain: 0.35 },
    { t: T.s1Out - 0.1, type: 'whoosh', dur: 0.5, f0: 300, f1: 3000, gain: 0.6 },
    ...[T.w1, T.w2, T.w3, T.w4].map((t, i) => ({ t: t - 0.03, type: 'swish', dur: 0.28, gain: 0.5 + i * 0.03 })),
    ...[T.w2, T.w3, T.w4].map((t, i) => ({ t: t + 0.12, type: 'ui_pop', f: 700 + i * 140, gain: 0.55 })),
    { t: T.s2Out, type: 'whoosh', dur: 0.5, f0: 400, f1: 2600, gain: 0.6 },
    ...[T.l1, T.l2, T.l3, T.l4].map((t) => ({ t, type: 'click', gain: 0.6 })),
    ...[T.l1, T.l2, T.l3, T.l4].map((t, i) => ({ t: t + 0.02, type: 'ui_pop', f: 900 + i * 90, gain: 0.4 })),
    { t: T.s3Out, type: 'whoosh', dur: 0.4, f0: 500, f1: 3500, gain: 0.6 },
    { t: T.line1, type: 'swish', dur: 0.3, gain: 0.5 },
    { t: T.line2, type: 'swish', dur: 0.3, gain: 0.5 },
    { t: T.s4Out, type: 'whoosh', dur: 0.65, f0: 2500, f1: 300, gain: 0.7 },
    { t: T.s5 - 0.05, type: 'whoosh', dur: 0.5, f0: 300, f1: 2000, gain: 0.55 },
    { t: T.s5Out, type: 'whoosh', dur: 0.4, f0: 700, f1: 4000, gain: 0.6 },
    { t: T.type0, type: 'typing', dur: T.type1 - T.type0, rate: 14, gain: 0.7 },
    { t: T.enter, type: 'key', gain: 0.9 },
    { t: T.enter + 0.05, type: 'whoosh', dur: 0.45, f0: 300, f1: 1800, gain: 0.5 },
    { t: T.clickAt, type: 'click', gain: 1.0 },
    { t: T.clickAt + 0.02, type: 'glitch', dur: 0.3, gain: 0.5 },
    { t: T.s6Out, type: 'whoosh', dur: 0.4, f0: 600, f1: 5000, gain: 0.7 },
    { t: T.s7, type: 'boom', gain: 0.8 },
    { t: T.logo + 0.1, type: 'sparkle', gain: 0.6 },
    { t: T.word, type: 'swish', dur: 0.35, gain: 0.45 },
    { t: T.tag, type: 'ui_pop', f: 1200, gain: 0.35 },
    { t: T.glitch, type: 'glitch', dur: 0.4, gain: 0.6 },
  ];

  // ---------------------------------------------------------------- état
  let W, H, u, P, cx, cy, stage, cards, cardList, imgs;
  const txtCache = new Map();
  let mask, maskCtx, glow, glowCtx, planetLayer;

  const GLOBE = (window.GLOBE_POINTS || []).map(([la, lo]) => [rad(la), rad(lo)]);
  const PINS = [
    { name: 'CÔTE D’IVOIRE', lat: 5.36, lon: -4.01 },
    { name: 'BÉNIN', lat: 6.37, lon: 2.42 },
    { name: 'FRANCE', lat: 48.86, lon: 2.35 },
  ];

  // ---------------------------------------------------------------- helpers
  function textCanvas(str, o) {
    const key = str + JSON.stringify(o);
    if (txtCache.has(key)) return txtCache.get(key);
    const tmp = canvas(4, 4).getContext('2d');
    const w = measure(tmp, str, o);
    const pad = o.size * 0.25;
    const cv = canvas(w + pad * 2, o.size * 1.35 + pad * 2);
    const c = cv.getContext('2d');
    text(c, str, pad, cv.height / 2, { ...o, align: 'left' });
    cv.pad = pad;
    txtCache.set(key, cv);
    return cv;
  }

  function blit(c, cv, x, y, o = {}) {
    const s = o.scale ?? 1;
    const w = cv.width * s;
    const h = cv.height * s;
    const ax = o.align === 'left' ? x - (cv.pad || 0) * s : o.align === 'right' ? x - w + (cv.pad || 0) * s : x - w / 2;
    c.save();
    c.globalAlpha *= o.alpha ?? 1;
    if (o.blur) c.filter = `blur(${o.blur}px)`;
    c.drawImage(cv, ax, y - h / 2, w, h);
    c.restore();
  }

  // apparition "pixels" (blocs qui s'allument au hasard, quelques blocs décalés)
  function pixelReveal(c, cv, x, y, p, o = {}) {
    if (p <= 0) return;
    if (p >= 1 && !o.glitch) return blit(c, cv, x, y, o);
    const b = o.block ?? Math.max(6, Math.round(cv.height / 9));
    const w = cv.width;
    const h = cv.height;
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.clearRect(0, 0, w + 4 * b, h);
    maskCtx.fillStyle = '#fff';
    const seed = o.seed ?? 1;
    for (let j = 0; j * b < h; j++) {
      for (let i = 0; i * b < w; i++) {
        const r = hash(i * 13.17 + j * 71.3 + seed * 3.1);
        // progression de gauche à droite + bruit
        const thr = (i * b) / w * 0.45 + r * 0.55;
        if (thr < p) maskCtx.fillRect(i * b, j * b, b, b);
      }
    }
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.drawImage(cv, 0, 0);
    // tranches décalées (glitch) pendant la transition
    const amt = o.glitch ?? Math.sin(Math.PI * clamp(p));
    const s = o.scale ?? 1;
    const ax = o.align === 'left' ? x - (cv.pad || 0) * s : x - (w * s) / 2;
    c.save();
    c.globalAlpha *= o.alpha ?? 1;
    c.drawImage(mask, 0, 0, w, h, ax, y - (h * s) / 2, w * s, h * s);
    if (amt > 0.05) {
      for (let k = 0; k < 4; k++) {
        const sy = hash(seed * 9.1 + k * 4.7 + Math.floor(p * 20)) * h;
        const sh = b * (1 + Math.floor(hash(k * 3.3 + seed) * 2));
        const dx = (hash(k * 1.7 + Math.floor(p * 30)) - 0.5) * b * 6 * amt;
        c.globalAlpha = 0.8 * amt;
        c.drawImage(mask, 0, sy, w, sh, ax + dx * s, y - (h * s) / 2 + sy * s, w * s, sh * s);
      }
    }
    c.restore();
  }

  // dessine une carte (canvas UI.card) centrée
  function drawCard(c, cv, x, y, o = {}) {
    const s = (o.scale ?? 1) / cv.s;
    c.save();
    c.translate(x, y);
    c.rotate(rad(o.rot ?? 0));
    c.globalAlpha *= o.alpha ?? 1;
    if (o.blur) c.filter = `blur(${o.blur}px)`;
    c.drawImage(cv, (-cv.width * s) / 2, (-cv.height * s) / 2, cv.width * s, cv.height * s);
    c.restore();
  }

  function cursor(c, x, y, s = 1, press = 0) {
    c.save();
    c.translate(x, y);
    c.scale(s * u * (1 - press * 0.12), s * u * (1 - press * 0.12));
    const p = new Path2D('M0 0 L0 30 L7.5 23 L12.5 34 L17 32 L12 21.5 L22 21.5 Z');
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 8;
    c.shadowOffsetY = 3;
    c.fillStyle = '#fff';
    c.fill(p);
    c.shadowColor = 'transparent';
    c.lineWidth = 1.6;
    c.strokeStyle = '#000';
    c.stroke(p);
    c.restore();
  }

  // fond : noir, grille fine, repères "+", étiquettes mono
  function background(c, t, o = {}) {
    c.fillStyle = C.bg;
    c.fillRect(0, 0, W, H);
    const a = o.grid ?? 1;
    if (a > 0) {
      c.globalAlpha = a;
      c.fillStyle = C.line;
      const step = 120 * u;
      const off = (t * 18 * u) % step;
      for (let x = (W / 2) % step - step; x < W + step; x += step) c.fillRect(Math.round(x + off * 0), 0, 1, H);
      for (let y = (H / 2) % step - step; y < H + step; y += step) c.fillRect(0, Math.round(y), W, 1);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (const [px, py] of [[0.18, 0.2], [0.82, 0.2], [0.18, 0.8], [0.82, 0.8], [0.5, 0.12]]) {
        const X = Math.round((W * px) / step) * step + ((W / 2) % step);
        const Y = Math.round((H * py) / step) * step + ((H / 2) % step);
        c.fillRect(X - 7 * u, Y - 0.75 * u, 14 * u, 1.5 * u);
        c.fillRect(X - 0.75 * u, Y - 7 * u, 1.5 * u, 14 * u);
      }
      c.globalAlpha = 1;
    }
    if (o.labels !== false) {
      const la = o.labelAlpha ?? 0.55;
      c.globalAlpha = la;
      text(c, 'AGROSFER / FILIÈRES', 48 * u, 52 * u, { size: 16 * u, weight: 500, family: 'JetBrains Mono', color: C.white, tracking: 0.08 });
      text(c, o.section ?? '', W - 48 * u, 52 * u, { size: 16 * u, weight: 500, family: 'JetBrains Mono', color: C.white, tracking: 0.08, align: 'right' });
      text(c, `T+${t.toFixed(2).padStart(5, '0')}`, 48 * u, H - 48 * u, { size: 14 * u, weight: 500, family: 'JetBrains Mono', color: C.white, tracking: 0.08 });
      text(c, 'BÉNIN · CÔTE D’IVOIRE · FRANCE', W - 48 * u, H - 48 * u, { size: 14 * u, weight: 500, family: 'JetBrains Mono', color: C.white, tracking: 0.08, align: 'right' });
      c.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- globe en points
  function project(lat, lon, lat0, lon0) {
    const l = lon - lon0;
    const x = Math.cos(lat) * Math.sin(l);
    const y = Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(l);
    const z = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(l);
    return [x, y, z];
  }

  function drawGlobe(c, t, gx, gy, R, alpha, tint) {
    const lon0 = rad(lerp(95, -1, ease.outCubic(prog(t, 0, 3.3))) );
    const lat0 = rad(lerp(5, 22, ease.inOutCubic(prog(t, 0.5, 3.3))));
    const appear = prog(t, 0, 1.4);
    // halo
    const g = c.createRadialGradient(gx, gy, R * 0.6, gx, gy, R * 1.25);
    g.addColorStop(0, 'rgba(77,163,224,0.0)');
    g.addColorStop(0.75, `rgba(77,163,224,${0.1 * alpha})`);
    g.addColorStop(1, 'rgba(77,163,224,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(gx, gy, R * 1.25, 0, 7);
    c.fill();
    for (let i = 0; i < GLOBE.length; i++) {
      const [la, lo] = GLOBE[i];
      const [x, y, z] = project(la, lo, lat0, lon0);
      if (z < 0.02) continue;
      const d = Math.hypot(x, y);
      if (d > appear * 1.6) continue;
      const s = (1.1 + 2.2 * z) * u;
      const wa = (0.18 + 0.8 * z) * alpha * clamp((appear * 1.6 - d) * 3);
      const africa = la > rad(-35) && la < rad(37) && lo > rad(-18) && lo < rad(52);
      c.globalAlpha = wa;
      c.fillStyle = africa && tint > 0 ? mixColor('#F4F7F5', C.green, tint) : C.white;
      c.fillRect(gx + x * R - s / 2, gy - y * R - s / 2, s, s);
    }
    c.globalAlpha = 1;
    return { lat0, lon0 };
  }

  function mixColor(a, b, t) {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',')})`;
  }

  // ---------------------------------------------------------------- séquences
  function seqIntro(c, t) {
    background(c, t, { grid: 0.6 * prog(t, 0.2, 1.2), section: '01 — BONJOUR', labelAlpha: 0.45 * prog(t, 0.3, 1) });
    const out = ease.inCubic(prog(t, T.s1Out, T.s2));
    const R = (P ? 470 : 430) * u * (1 + out * 1.6);
    const gx = cx;
    const gy = cy + (P ? 60 : 30) * u;
    const ga = lerp(0.42, 1, ease.inOutCubic(prog(t, T.nameOut, T.pins))) * (1 - out);
    const tint = ease.outCubic(prog(t, T.pins, T.pins + 0.6));
    const { lat0, lon0 } = drawGlobe(c, t, gx, gy, R, ga, tint);

    // repères pays + arcs
    if (t > T.pins - 0.05 && out < 1) {
      const pts = PINS.map((p) => {
        const [x, y, z] = project(rad(p.lat), rad(p.lon), lat0, lon0);
        return { ...p, X: gx + x * R, Y: gy - y * R, z };
      });
      // arcs Abidjan -> Cotonou -> Paris
      const arcs = [[0, 1, T.pins + 0.35], [1, 2, T.pins + 0.55]];
      for (const [a, b, t0] of arcs) {
        const pr = ease.inOutCubic(prog(t, t0, t0 + 0.5));
        if (pr <= 0) continue;
        const A = pts[a];
        const B = pts[b];
        const mx = (A.X + B.X) / 2;
        const my = (A.Y + B.Y) / 2 - Math.hypot(B.X - A.X, B.Y - A.Y) * 0.45 - 30 * u;
        c.save();
        c.globalAlpha = 1 - out;
        c.strokeStyle = C.lemon;
        c.lineWidth = 2.5 * u;
        c.shadowColor = C.green;
        c.shadowBlur = 14 * u;
        c.beginPath();
        const N = 40;
        for (let i = 0; i <= N * pr; i++) {
          const s = i / N;
          const X = (1 - s) ** 2 * A.X + 2 * (1 - s) * s * mx + s * s * B.X;
          const Y = (1 - s) ** 2 * A.Y + 2 * (1 - s) * s * my + s * s * B.Y;
          if (i === 0) c.moveTo(X, Y);
          else c.lineTo(X, Y);
        }
        c.stroke();
        c.restore();
      }
      pts.forEach((p, i) => {
        const t0 = T.pins + i * 0.2;
        const a = ease.outBack(prog(t, t0, t0 + 0.35), 2.5);
        if (a <= 0) return;
        c.save();
        c.globalAlpha = 1 - out;
        const ring = ((t - t0) * 1.4) % 1;
        c.strokeStyle = C.green;
        c.lineWidth = 2 * u;
        c.globalAlpha = (1 - ring) * (1 - out);
        c.beginPath();
        c.arc(p.X, p.Y, (8 + ring * 34) * u, 0, 7);
        c.stroke();
        c.globalAlpha = 1 - out;
        c.fillStyle = C.green;
        c.beginPath();
        c.arc(p.X, p.Y, 7 * u * a, 0, 7);
        c.fill();
        // étiquette
        const lx = p.X + (i === 1 ? 30 : -30) * u;
        const ly = p.Y - 62 * u;
        c.strokeStyle = 'rgba(255,255,255,0.6)';
        c.lineWidth = 1.2 * u;
        c.beginPath();
        c.moveTo(lx, ly + 17 * u);
        c.lineTo(p.X, p.Y - 10 * u);
        c.stroke();
        UI.pill(c, lx, ly, p.name, {
          size: 15 * u, bg: 'rgba(10,18,14,0.85)', border: 'rgba(140,198,63,0.7)', color: C.white, family: 'JetBrains Mono',
          align: i === 1 ? 'left' : 'right', weight: 600, h: 34 * u,
        });
        c.restore();
      });
    }

    // texte d'accueil
    const hello = textCanvas('Bonjour, nous sommes', { size: (P ? 46 : 40) * u, weight: 500, color: C.dim });
    const name = textCanvas('AgroSfer', { size: (P ? 200 : 190) * u, weight: 800, color: C.white, tracking: -0.045 });
    const outP = 1 - prog(t, T.nameOut, T.nameOut + 0.3);
    const ty = cy - (P ? 40 : 20) * u;
    pixelReveal(c, hello, cx, ty - (P ? 150 : 130) * u, Math.min(prog(t, T.hello, T.hello + 0.35), outP), { seed: 2 });
    pixelReveal(c, name, cx, ty, Math.min(prog(t, T.name, T.name + 0.45), outP), { seed: 5, glitch: t < T.name + 0.6 ? undefined : t > T.nameOut ? undefined : 0 });
  }

  // grands mots successifs + cartes qui surgissent
  const WORDS = [
    { t: T.w1, str: 'Nous connectons', size: 72, weight: 600, color: C.dim },
    { t: T.w2, str: 'les coopératives,', size: 150, weight: 800, color: C.white, card: 'surveys' },
    { t: T.w3, str: 'les producteurs', size: 150, weight: 800, color: C.white, card: 'producer' },
    { t: T.w4, str: 'et les industriels.', size: 150, weight: 800, color: C.green, card: 'order' },
  ];
  const CARD_POS = {
    landscape: { surveys: [0.8, 0.3, -5, 0.8], producer: [0.25, 0.8, 4, 0.95], order: [0.79, 0.77, 3, 0.92] },
    portrait: { surveys: [0.7, 0.165, -5, 0.8], producer: [0.33, 0.73, 4, 1.0], order: [0.63, 0.86, 3, 1.0] },
  };

  function seqWords(c, t) {
    background(c, t, { section: '02 — MISSION', grid: 1 });
    const out = ease.inCubic(prog(t, T.s2Out, T.s3));
    // cartes
    const pos = CARD_POS[P ? 'portrait' : 'landscape'];
    WORDS.forEach((w, i) => {
      if (!w.card) return;
      const [px, py, rot, sc] = pos[w.card];
      const a = ease.outBack(prog(t, w.t + 0.08, w.t + 0.5), 1.6);
      if (a <= 0) return;
      const fl = Math.sin((t - w.t) * 1.6 + i) * 8 * u;
      const x = lerp(px * W, cx, out * 0.6) + (1 - a) * (px > 0.5 ? 120 : -120) * u;
      const y = lerp(py * H, cy, out * 0.6) + fl;
      drawCard(c, cards[w.card], x, y, { scale: sc * u * lerp(0.6, 1, a) * (1 + out * 0.6), rot: rot * (1 - out), alpha: clamp(a) * (1 - out) });
    });
    // mots
    for (let i = 0; i < WORDS.length; i++) {
      const w = WORDS[i];
      const next = WORDS[i + 1];
      const tin = prog(t, w.t, w.t + 0.28);
      if (tin <= 0) continue;
      const tout = next && i > 0 ? prog(t, next.t - 0.02, next.t + 0.16) : out;
      if (tout >= 1) continue;
      const cv = textCanvas(w.str, { size: w.size * u, weight: w.weight, color: w.color, tracking: w.weight > 700 ? -0.045 : -0.02 });
      const maxW = W * (P ? 0.9 : 0.86);
      const sc = Math.min(1, maxW / (cv.width - cv.pad * 2));
      const e = ease.outCubic(tin);
      const y0 = i === 0 ? cy - (P ? 330 : 190) * u : cy + (P ? 0 : 40) * u;
      const y = y0 + (1 - e) * 50 * u - ease.inCubic(tout) * 60 * u;
      const x = P ? cx : W * 0.08;
      blit(c, cv, x, y, { scale: sc, alpha: e * (1 - tout), blur: (1 - e) * 14 * u + tout * 16 * u, align: P ? 'center' : 'left' });
    }
    const sub = prog(t, T.w4 + 0.6, T.w4 + 0.9) * (1 - out);
    if (sub > 0) {
      c.globalAlpha = sub;
      text(c, '— sur une seule plateforme.', P ? cx : W * 0.08 + 8 * u, cy + (P ? 150 : 170) * u, {
        size: 30 * u, weight: 500, family: 'JetBrains Mono', color: C.dim, align: P ? 'center' : 'left',
      });
      c.globalAlpha = 1;
    }
  }

  // mosaïque d'écrans qui défilent + mots-clés dans des cartouches
  const LABELS = [
    { t: T.l1, str: 'Traçabilité', icon: 'scan' },
    { t: T.l2, str: 'Paiements', icon: 'wallet' },
    { t: T.l3, str: 'Données terrain', icon: 'pin' },
    { t: T.l4, str: 'Accès aux marchés', icon: 'factory' },
  ];

  function seqMosaic(c, t) {
    background(c, t, { section: '03 — PLATEFORME', grid: 0.5 });
    const lt = t - T.s3;
    const inn = ease.outCubic(prog(t, T.s3, T.s3 + 0.6));
    const out = ease.inCubic(prog(t, T.s3Out, T.s4));
    stage.clear();
    const cols = P ? 4 : 7;
    const cw = (P ? 330 : 360) * u;
    const gap = 36 * u;
    for (let ci = 0; ci < cols; ci++) {
      const speed = (ci % 2 ? 140 : 90) * u * (1 + out * 5);
      const colX = cx + (ci - (cols - 1) / 2) * (cw + gap);
      let y = -H * 0.2 + ((ci * 211) % 300) * u - lt * speed - (1 - inn) * 900 * u * (ci % 2 ? 1 : 0.7);
      let k = 0;
      while (y < H * 1.4) {
        const cv = cardList[(ci * 3 + k * 5) % cardList.length];
        const hh = (cw * cv.ch) / cv.cw;
        if (y + hh > -H * 0.6) {
          stage.plane(cv, {
            x: colX, y: y + hh / 2, z: 0, w: cw * (cv.width / cv.s / cv.cw), h: hh * (cv.height / cv.s / cv.ch), alpha: 0.95,
            group: { x: cx, y: cy, rx: 18, ry: -16, rz: -8, z: 0, tz: 260 * u - out * 400 * u },
          });
        }
        y += hh + gap;
        k++;
      }
    }
    c.drawImage(stage.canvas, 0, 0);
    // voile pour la lisibilité
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(4,6,5,0.55)');
    g.addColorStop(1, 'rgba(4,6,5,0.15)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // cartouches
    LABELS.forEach((L, i) => {
      const next = LABELS[i + 1];
      const a = ease.outBack(prog(t, L.t, L.t + 0.3), 1.4);
      const o = next ? prog(t, next.t - 0.05, next.t + 0.1) : out;
      if (a <= 0 || o >= 1) return;
      const size = (P ? 84 : 104) * u;
      const tw = measure(c, L.str, { size, weight: 800, tracking: -0.04 });
      const bw = tw + size * 2.2;
      const scale = Math.min(1, (W * 0.9) / bw);
      const bh = size * 1.45;
      c.save();
      c.translate(cx, cy);
      c.scale(scale * lerp(0.85, 1, a) * (1 + o * 0.1), scale * lerp(0.85, 1, a) * (1 + o * 0.1));
      c.globalAlpha = clamp(a) * (1 - o);
      const reveal = ease.outCubic(prog(t, L.t, L.t + 0.25));
      c.beginPath();
      c.rect(-bw / 2, -bh, bw * reveal, bh * 2);
      c.clip();
      c.shadowColor = 'rgba(0,0,0,0.5)';
      c.shadowBlur = 40 * u;
      fillRR(c, -bw / 2, -bh / 2, bw, bh, 18 * u, C.white);
      c.shadowColor = 'transparent';
      fillRR(c, -bw / 2 + size * 0.28, -size * 0.5, size, size, 14 * u, C.green);
      UI.icon(c, L.icon, -bw / 2 + size * 0.42, -size * 0.36, size * 0.72, C.ink, 2.4);
      text(c, L.str, -bw / 2 + size * 1.55, size * 0.04, { size, weight: 800, color: C.ink, tracking: -0.04 });
      c.restore();
    });
  }

  // mur d'écrans en perspective
  function seqWall(c, t) {
    background(c, t, { section: '04 — TERRAIN → USINE', grid: 0.4 });
    const lt = t - T.s4;
    const inn = ease.outCubic(prog(t, T.s4, T.s4 + 0.8));
    const out = ease.inOutCubic(prog(t, T.s4Out, T.s5));
    stage.clear();
    const cols = 6;
    const rows = 5;
    const cw = 420 * u;
    const ch = 300 * u;
    const gap = 40 * u;
    const gx = lerp(52, 0, out);
    const gz = lerp(-30, 0, out);
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const cv = cardList[(r * 4 + k * 3) % cardList.length];
        const scl = Math.min(cw / cv.cw, ch / cv.ch);
        const x = cx + (k - (cols - 1) / 2) * (cw + gap) + ((r % 2) * cw) / 2 - lt * 60 * u;
        const y = cy + (r - (rows - 1) / 2) * (ch + gap) + lt * 30 * u;
        stage.plane(cv, {
          x, y, w: (cv.width / cv.s) * scl, h: (cv.height / cv.s) * scl, alpha: 0.95,
          group: { x: cx, y: cy, rx: gx, rz: gz, ry: 0, tz: lerp(900, 120, inn) * u - out * 2200 * u },
        });
      }
    }
    c.drawImage(stage.canvas, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(4,6,5,0.9)');
    g.addColorStop(0.45, 'rgba(4,6,5,0.25)');
    g.addColorStop(1, 'rgba(4,6,5,0.7)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // texte
    const lines = [
      { t: T.line1, str: 'de la parcelle', color: C.white },
      { t: T.line2, str: 'à l’usine.', color: C.green },
    ];
    lines.forEach((L, i) => {
      const a = ease.outCubic(prog(t, L.t, L.t + 0.35));
      if (a <= 0) return;
      const size = (P ? 120 : 140) * u;
      const cv = textCanvas(L.str, { size, weight: 800, color: L.color, tracking: -0.045 });
      const sc = Math.min(1, (W * 0.9) / (cv.width - cv.pad * 2));
      const y = cy + (i === 0 ? -0.55 : 0.6) * size * sc - (1 - a) * 40 * u * (i ? -1 : 1);
      blit(c, cv, cx, y, { scale: sc * (1 + out * 0.3), alpha: a * (1 - out), blur: (1 - a) * 18 * u + out * 20 * u });
    });
  }

  // rangées de tags qui défilent, "Nous sommes AgroSfer"
  const TAGS = ['Enquêtes terrain', 'Traçabilité', 'AgroSfer Pay', 'Cartographie GPS', 'Coopératives', 'Industriels', 'Certification',
    'Paiements mobiles', 'Tableaux de bord', 'Formation', 'Qualité', 'Production', 'Marchés', 'Export', 'Rendements', 'Données'];
  const PILL_STYLES = [
    { bg: '#8CC63F', color: '#0B120E' },
    { bg: '#4DA3E0', color: '#04121E' },
    { bg: '#E8F59A', color: '#0B120E' },
    { border: 'rgba(244,247,245,0.7)', color: '#F4F7F5' },
    { bg: '#1D2A23', color: '#F4F7F5' },
  ];

  function seqMarquee(c, t) {
    background(c, t, { section: '05 — EXPERTISES', grid: 0.3 });
    const lt = t - T.s5;
    const out = ease.inCubic(prog(t, T.s5Out, T.s6));
    const rows = P ? 9 : 6;
    const rh = (P ? 170 : 150) * u;
    const size = (P ? 34 : 32) * u;
    const big = { 1: 'Nous', 3: 'sommes', 4: 'AgroSfer' };
    const bigRows = P ? { 2: 'Nous', 4: 'sommes', 6: 'AgroSfer' } : big;
    for (let r = 0; r < rows; r++) {
      const y = cy + (r - (rows - 1) / 2) * rh;
      const dir = r % 2 ? -1 : 1;
      const inn = ease.outQuart(prog(t, T.s5 + r * 0.04, T.s5 + 0.55 + r * 0.04));
      const speed = (110 + (r % 3) * 30) * u;
      let x = -1500 * u + dir * (lt * speed + out * out * 2600 * u) - dir * (1 - inn) * W;
      let k = r * 5;
      c.save();
      if (out > 0) c.filter = `blur(${out * 10 * u}px)`;
      while (x < W + 200 * u) {
        const bigWord = bigRows[r];
        if (bigWord && k % 4 === 2) {
          const bsz = (P ? 120 : 110) * u;
          const bw = measure(c, bigWord, { size: bsz, weight: 800, tracking: -0.045 });
          text(c, bigWord, x, y + 4 * u, { size: bsz, weight: 800, color: r === (P ? 6 : 4) ? C.green : C.white, tracking: -0.045 });
          x += bw + 40 * u;
        } else {
          const st = PILL_STYLES[(k * 7 + r) % PILL_STYLES.length];
          const w = UI.pill(c, x, y, TAGS[(k * 3 + r * 5) % TAGS.length], { size, ...st, h: size * 2.2, weight: 600 });
          x += w + 22 * u;
        }
        k++;
      }
      c.restore();
    }
  }

  // barre de recherche -> site -> clic sur "Demander une démo"
  function seqSearch(c, t) {
    background(c, t, { section: '06 — AGROSFER.CO', grid: 0.35 });
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.55);
    g.addColorStop(0, 'rgba(77,163,224,0.22)');
    g.addColorStop(1, 'rgba(77,163,224,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const Tl = UI.THEMES.light;
    const inn = ease.outBack(prog(t, T.s6, T.s6 + 0.4), 1.3);
    const ent = ease.inOutCubic(prog(t, T.enter, T.enter + 0.45));
    const out = ease.inExpo(prog(t, T.s6Out, T.s7));
    // page du site
    const pw = Math.min(W * 0.84, 1500 * u);
    const ph = pw * (P ? 0.62 : 0.6);
    const pageIn = ease.outCubic(prog(t, T.enter + 0.05, T.enter + 0.55));
    const btnX = (72 + 130) / 1200;
    const btnY = 525 / (1200 * 0.66);
    if (pageIn > 0) {
      const press = Math.sin(Math.PI * clamp(prog(t, T.clickAt - 0.04, T.clickAt + 0.14)));
      const lp = landingCanvas(press);
      const zoom = 1 + out * 5;
      // zoom vers le bouton
      const bx = cx + (btnX - 0.5) * pw;
      const by = cy + 30 * u + (btnY - 0.5) * pw * 0.66;
      const ox = lerp(cx, bx, out);
      const oy = lerp(cy + 30 * u, by, out);
      stage.clear();
      stage.plane(lp, {
        x: ox + (cx - ox) * zoom, y: oy + (cy + 30 * u - oy) * zoom + (1 - pageIn) * 300 * u,
        w: pw * zoom * (lp.width / lp.s / lp.cw), h: pw * 0.66 * zoom * (lp.height / lp.s / lp.ch),
        rx: (1 - pageIn) * 35, alpha: pageIn,
      });
      c.drawImage(stage.canvas, 0, 0);
      // onde du clic
      const rp = prog(t, T.clickAt, T.clickAt + 0.5);
      if (rp > 0 && rp < 1) {
        c.strokeStyle = `rgba(140,198,63,${1 - rp})`;
        c.lineWidth = 4 * u;
        c.beginPath();
        c.arc(bx, by, (20 + rp * 120) * u, 0, 7);
        c.stroke();
      }
      // curseur
      const cp = ease.inOutCubic(prog(t, T.cursor, T.clickAt - 0.05));
      if (t > T.cursor && out < 0.5) {
        const sx = W * 0.92;
        const sy = H * 0.95;
        const x = lerp(sx, bx + 10 * u, cp) + Math.sin(cp * Math.PI) * 60 * u;
        const y = lerp(sy, by + 6 * u, cp);
        cursor(c, x, y, 1.5, press);
      }
    }
    // barre de recherche
    const bw = Math.min(W * 0.78, 900 * u);
    const bh = 78 * u;
    const by = lerp(cy, P ? H * 0.2 : H * 0.12, ent);
    const typed = 'agrosfer.co'.slice(0, Math.floor(11 * prog(t, T.type0, T.type1)));
    const caret = Math.floor(t * 3) % 2 === 0 || (t > T.type0 && t < T.type1);
    c.save();
    c.globalAlpha = clamp(inn) * (1 - ent * 0.85) * (1 - out);
    c.translate(cx, by);
    c.scale(lerp(0.9, 1, clamp(inn)) * lerp(1, 0.7, ent), lerp(0.9, 1, clamp(inn)) * lerp(1, 0.7, ent));
    c.shadowColor = 'rgba(77,163,224,0.45)';
    c.shadowBlur = 50 * u;
    UI.searchBar(c, -bw / 2, -bh / 2, bw, bh, Tl, { text: typed, caret, placeholder: 'Rechercher…' });
    c.restore();
    // flash de transition
    if (out > 0) {
      c.fillStyle = `rgba(232,245,154,${out * 0.9})`;
      c.fillRect(0, 0, W, H);
    }
  }

  let landingCache = null;
  function landingCanvas(press) {
    const key = Math.round(press * 10);
    if (landingCache && landingCache.key === key) return landingCache.cv;
    const w = 1200;
    const h = 1200 * 0.66;
    const cv = UI.card(w, h, (c) => UI.landing(c, 0, 0, w, h, UI.THEMES.light, { logo: imgs.logo, press, btnColor: '#2E73B8' }), { pad: 30, scale: 1.4, radius: 18, shadowBlur: 50 });
    landingCache = { key, cv };
    return cv;
  }

  // planète lumineuse + logo
  function seqPlanet(c, t) {
    c.fillStyle = '#010302';
    c.fillRect(0, 0, W, H);
    const lt = t - T.s7;
    const inn = ease.outCubic(prog(t, T.s7, T.s7 + 1.2));
    // étoiles
    for (let i = 0; i < 160; i++) {
      const x = hash(i * 3.7) * W;
      const y = hash(i * 9.1) * H * 0.75;
      const tw = 0.4 + 0.6 * Math.sin(t * 2 + i);
      c.globalAlpha = hash(i * 1.3) * 0.6 * tw * inn;
      c.fillStyle = '#fff';
      const s = (hash(i * 5.5) > 0.9 ? 2.2 : 1.2) * u;
      c.fillRect(x, y, s, s);
    }
    c.globalAlpha = 1;
    // planète : grand disque incliné, limbe éclairé
    const R = (P ? 2.4 : 1.55) * Math.max(W, H);
    const px = P ? cx - R * 0.15 : W * 0.28;
    const py = (P ? H * 0.74 : H * 0.84) + R + lerp(260, 0, inn) * u;
    const ang = rad(P ? -6 : -10);
    const ccx = px + Math.sin(ang) * R;
    const ccy = py - (1 - Math.cos(ang)) * R;
    // halo atmosphérique (pré-calculé une fois, puis décalé pendant la montée)
    if (!planetLayer) {
      planetLayer = canvas(W, H + 300 * u);
      const pc = planetLayer.getContext('2d');
      const py0 = ccy - lerp(260, 0, inn) * u;
      for (const [wd, col, a] of [[260, '77,163,224', 0.18], [120, '140,198,63', 0.16], [50, '160,220,255', 0.35], [14, '230,248,255', 0.9]]) {
        pc.save();
        pc.strokeStyle = `rgba(${col},${a})`;
        pc.lineWidth = wd * u;
        pc.filter = `blur(${wd * 0.45 * u}px)`;
        pc.beginPath();
        pc.arc(ccx, py0, R, 0, Math.PI * 2);
        pc.stroke();
        pc.restore();
      }
      pc.fillStyle = '#020604';
      pc.beginPath();
      pc.arc(ccx, py0, R - 6 * u, 0, Math.PI * 2);
      pc.fill();
    }
    c.globalAlpha = inn;
    c.drawImage(planetLayer, 0, lerp(260, 0, inn) * u);
    c.globalAlpha = 1;
    // reflet de lumière balayant le limbe
    const sweep = lerp(-0.35, 0.35, ease.inOutCubic(prog(t, T.s7, T.end)));
    c.save();
    c.beginPath();
    c.arc(ccx, ccy, R + 40 * u, 0, Math.PI * 2);
    c.clip();
    const fx = cx + sweep * W;
    const fy = ccy - Math.sqrt(Math.max(R * R - (fx - ccx) ** 2, 0));
    const fg = c.createRadialGradient(fx, fy, 0, fx, fy, 420 * u);
    fg.addColorStop(0, `rgba(255,255,255,${0.7 * inn})`);
    fg.addColorStop(0.2, `rgba(160,220,255,${0.35 * inn})`);
    fg.addColorStop(1, 'rgba(77,163,224,0)');
    c.fillStyle = fg;
    c.fillRect(fx - 500 * u, fy - 500 * u, 1000 * u, 1000 * u);
    c.restore();

    // logo + mot-symbole
    const gl = glitchAmt(t);
    const lockup = (cc) => drawLockup(cc, t);
    if (gl > 0) {
      glowCtx.clearRect(0, 0, W, H);
      lockup(glowCtx);
      c.save();
      c.globalCompositeOperation = 'lighter';
      const off = gl * 18 * u;
      c.globalAlpha = 0.9;
      c.filter = 'none';
      tintDraw(c, glow, -off, 0, [255, 40, 60]);
      tintDraw(c, glow, off, 0, [40, 200, 255]);
      c.restore();
      for (let k = 0; k < 6; k++) {
        const sy = hash(k * 2.3 + Math.floor(t * 24)) * H;
        const sh = (8 + hash(k * 5.1) * 30) * u;
        c.drawImage(glow, 0, sy, W, sh, (hash(k * 7.7 + Math.floor(t * 30)) - 0.5) * 80 * u * gl, sy, W, sh);
      }
    } else {
      lockup(c);
    }
    // fondu final
    const fo = prog(t, T.end - 0.7, T.end);
    if (fo > 0) {
      c.fillStyle = `rgba(0,0,0,${ease.inCubic(fo)})`;
      c.fillRect(0, 0, W, H);
    }
  }

  function glitchAmt(t) {
    const a = prog(t, T.glitch, T.glitch + 0.12) * (1 - prog(t, T.glitch + 0.25, T.glitch + 0.45));
    return a * (0.6 + 0.4 * Math.sin(t * 90));
  }

  function tintDraw(c, src, dx, dy, rgb) {
    const tmp = tintDraw.tmp || (tintDraw.tmp = canvas(W, H));
    const x = tmp.getContext('2d');
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, W, H);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = `rgb(${rgb.join(',')})`;
    x.fillRect(0, 0, W, H);
    c.drawImage(tmp, dx, dy);
  }

  function drawLockup(c, t) {
    const pop = ease.outBack(prog(t, T.logo, T.logo + 0.5), 1.8);
    if (pop <= 0) return;
    const slide = ease.inOutCubic(prog(t, T.word, T.word + 0.55));
    const lh = lerp((P ? 300 : 280) * u, (P ? 150 : 150) * u, slide);
    const logo = imgs.logoWhite;
    const lw = (lh * logo.width) / logo.height;
    const wordSize = (P ? 120 : 130) * u;
    const ww = measure(c, 'AgroSfer', { size: wordSize, weight: 700, tracking: -0.04 });
    const total = lw + 36 * u + ww;
    const lx = lerp(cx - lw / 2, cx - total / 2, slide);
    const ly = cy - (P ? 120 : 70) * u;
    // halo derrière le logo
    const hg = c.createRadialGradient(lx + lw / 2, ly, 0, lx + lw / 2, ly, lh * 1.2);
    hg.addColorStop(0, `rgba(140,198,63,${0.25 * pop})`);
    hg.addColorStop(1, 'rgba(140,198,63,0)');
    c.fillStyle = hg;
    c.fillRect(lx - lh, ly - lh * 1.3, lw + lh * 2, lh * 2.6);
    c.save();
    c.translate(lx + lw / 2, ly);
    c.scale(clamp(pop, 0, 1.2), clamp(pop, 0, 1.2));
    c.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
    c.restore();
    if (slide > 0) {
      c.save();
      c.beginPath();
      c.rect(lx + lw + 20 * u, ly - wordSize, (ww + 40 * u) * slide, wordSize * 2);
      c.clip();
      text(c, 'AgroSfer', lx + lw + 36 * u - (1 - slide) * 80 * u, ly + 6 * u, { size: wordSize, weight: 700, color: C.white, tracking: -0.04 });
      c.restore();
    }
    const ta = ease.outCubic(prog(t, T.tag, T.tag + 0.5));
    if (ta > 0) {
      c.globalAlpha = ta;
      text(c, 'Des filières durables et traçables', cx, ly + (P ? 150 : 135) * u + (1 - ta) * 16 * u, {
        size: (P ? 40 : 36) * u, weight: 500, color: 'rgba(244,247,245,0.8)', align: 'center',
      });
      const ta2 = ease.outCubic(prog(t, T.tag + 0.35, T.tag + 0.8));
      c.globalAlpha = ta2;
      text(c, 'AGROSFER.CO', cx, ly + (P ? 230 : 205) * u, { size: 20 * u, weight: 500, family: 'JetBrains Mono', color: C.green, tracking: 0.3, align: 'center' });
      c.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- scène
  const assets = Core.scene({
    duration: DURATION,
    T,
    SFX,
    MUSIC: { score: 'studio' },
    shutter: 0.55,
    images: { logo: 'assets/img/logo_color.png', logoWhite: 'assets/img/logo_white.png' },
    fonts: ['800 40px "Inter"', '500 40px "Inter"', '500 20px "JetBrains Mono"'],
    setup(w, h, A) {
      W = w;
      H = h;
      u = Math.min(W, H) / 1080;
      P = H > W;
      cx = W / 2;
      cy = H / 2;
      imgs = A;
      stage = new Stage3D(W, H, 30);
      mask = canvas(W * 1.2, 700);
      maskCtx = mask.getContext('2d');
      glow = canvas(W, H);
      glowCtx = glow.getContext('2d');
      const Tl = UI.THEMES.light;
      const mk = (w2, h2, fn) => UI.card(w2, h2, (c) => fn(c, w2, h2), { pad: 34, scale: 1.5, radius: 20, bg: Tl.surface, shadowBlur: 40 });
      cards = {
        pay: mk(420, 240, (c, a, b) => UI.payCard(c, 0, 0, a, b)),
        surveys: mk(380, 480, (c, a, b) => UI.surveys(c, 0, 0, a, b, Tl, { p: 1 })),
        chart: mk(420, 300, (c, a, b) => UI.chart(c, 0, 0, a, b, Tl, { p: 1 })),
        producer: mk(400, 230, (c, a, b) => UI.producer(c, 0, 0, a, b, Tl)),
        map: mk(420, 300, (c, a, b) => UI.map(c, 0, 0, a, b, Tl, { p: 1 })),
        trace: mk(400, 380, (c, a, b) => UI.trace(c, 0, 0, a, b, Tl, { p: 0.75 })),
        order: mk(400, 250, (c, a, b) => UI.order(c, 0, 0, a, b, Tl)),
        notif: mk(400, 76, (c, a, b) => UI.notif(c, 0, 0, a, b, Tl, { time: '14:02' })),
        kpis: mk(640, 150, (c, a, b) => UI.kpis(c, 0, 0, a, b, Tl)),
        builder: mk(760, 440, (c, a, b) => UI.builder(c, 0, 0, a, b, Tl, { p: 1 })),
      };
      cardList = ['pay', 'surveys', 'chart', 'producer', 'map', 'trace', 'order', 'kpis', 'builder', 'notif'].map((k) => cards[k]);
    },
    draw(c, t) {
      if (t < T.s2) seqIntro(c, t);
      else if (t < T.s3) seqWords(c, t);
      else if (t < T.s4) seqMosaic(c, t);
      else if (t < T.s5) seqWall(c, t);
      else if (t < T.s6) seqMarquee(c, t);
      else if (t < T.s7) seqSearch(c, t);
      else seqPlanet(c, t);
    },
  });
})();
