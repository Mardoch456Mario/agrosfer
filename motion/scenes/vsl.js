// AgroSfer — VSL (vidéo de vente) : fond clair, typographie cinétique mot à mot avec mot accentué,
// révélation de marque, fonctionnalités numérotées avec cartes d'interface, appel à l'action.
(async () => {
  await Core.loadScript('lib/ui.js');
  const { clamp, lerp, prog, rad, ease, hash, canvas, text, measure, rr, fillRR } = Core;

  const BAR = (4 * 60) / 104;
  const b = (n) => n * BAR;
  const T = {
    h1: 0.25, notifs: b(1) - 0.5, h2: b(1) + 0.35, h3: b(2), h3b: b(2) + 0.55, hookOut: b(3) - 0.3,
    disc: b(3), brand: b(3.5), brandOut: b(4) - 0.25,
    f1: b(4), f2: b(5.5), f3: b(7), f4: b(8.5),
    offer: b(10), o1: b(10) + 0.2, o2: b(10) + 1.0, o3: b(10) + 2.0, offerOut: b(12) - 0.3,
    end: b(12), cta: b(12) + 0.9, click: b(12) + 1.9, fin: b(13) + 0.5,
  };
  const DURATION = T.fin;

  const C = {
    bg: '#F5F3EE', ink: '#1D3B53', inkSoft: '#6B7A86', green: '#5E9E2E', green2: '#8CC63F', blue: '#4D8BAE', lemon: '#E8F59A',
  };
  const FONT = 'Montserrat';

  const FEATURES = [
    { t: 'f1', n: '01', words: [['Vos', 0], ['producteurs,', 0], ['recensés.', 1]], cards: ['producer', 'surveys'] },
    { t: 'f2', n: '02', words: [['Chaque', 0], ['parcelle', 0], ['cartographiée.', 1]], cards: ['map'] },
    { t: 'f3', n: '03', words: [['Chaque', 0], ['lot', 0], ['tracé.', 1]], cards: ['trace'] },
    { t: 'f4', n: '04', words: [['Des', 0], ['paiements', 1], ['sécurisés.', 0]], cards: ['pay', 'notif'] },
  ];

  const SFX = [
    { t: T.h1 - 0.03, type: 'swish', dur: 0.3, gain: 0.45 },
    ...Array.from({ length: 9 }, (_, i) => ({ t: T.notifs + i * 0.09, type: 'ui_pop', f: 700 + (i % 4) * 140, gain: 0.35 })),
    { t: T.h2 - 0.03, type: 'swish', dur: 0.3, gain: 0.5 },
    { t: T.h3 - 0.03, type: 'swish', dur: 0.3, gain: 0.5 },
    { t: T.h3b, type: 'pop', f0: 300, f1: 700, gain: 0.4 },
    { t: T.hookOut, type: 'whoosh', dur: 0.4, f0: 600, f1: 2500, gain: 0.45 },
    { t: T.disc, type: 'swish', dur: 0.3, gain: 0.4 },
    { t: T.brand, type: 'boom', gain: 0.55 },
    { t: T.brand + 0.05, type: 'sparkle', gain: 0.5 },
    { t: T.brandOut, type: 'whoosh', dur: 0.4, f0: 500, f1: 2400, gain: 0.45 },
    ...FEATURES.flatMap((f) => [
      { t: T[f.t] - 0.03, type: 'swish', dur: 0.3, gain: 0.45 },
      { t: T[f.t] + 0.55, type: 'ui_pop', f: 800, gain: 0.45 },
      { t: T[f.t] + 0.75, type: 'ui_pop', f: 1000, gain: 0.35 },
      { t: T[f.t] + 3.0, type: 'whoosh', dur: 0.35, f0: 600, f1: 2400, gain: 0.35 },
    ]),
    { t: T.f2 + 0.8, type: 'beep', f: 2000, n: 3, gap: 0.25, gain: 0.25 },
    ...[0, 1, 2, 3].map((i) => ({ t: T.f3 + 0.9 + i * 0.35, type: 'tick', f: 1900 + i * 180, gain: 0.4 })),
    { t: T.f4 + 1.5, type: 'cash', gain: 0.6 },
    { t: T.o1, type: 'swish', dur: 0.3, gain: 0.35 },
    { t: T.o2, type: 'swish', dur: 0.3, gain: 0.45 },
    { t: T.o3, type: 'pop', f0: 350, f1: 900, gain: 0.5 },
    { t: T.offerOut, type: 'whoosh', dur: 0.4, f0: 500, f1: 2600, gain: 0.45 },
    { t: T.end + 0.05, type: 'sparkle', gain: 0.5 },
    { t: T.cta, type: 'ui_pop', f: 900, gain: 0.45 },
    { t: T.click, type: 'click', gain: 0.9 },
    { t: T.click + 0.05, type: 'chime', gain: 0.5 },
  ];

  let W, H, u, P, cx, cy, imgs, cards, lineLayer;
  const L = UI.THEMES.light;

  // ---------------------------------------------------------------- fond
  function background(c, t) {
    c.fillStyle = C.bg;
    c.fillRect(0, 0, W, H);
    const blobs = [
      [0.08, 0.12, 0.42, '140,198,63', 0.35, 0.25],
      [0.95, 0.9, 0.48, '232,245,154', 0.75, 0.3],
      [0.9, 0.08, 0.3, '77,139,174', 0.18, 0.4],
      [0.1, 0.95, 0.32, '140,198,63', 0.22, 0.35],
    ];
    for (const [x, y, r, col, a, sp] of blobs) {
      const px = W * x + Math.sin(t * sp + x * 9) * 80 * u;
      const py = H * y + Math.cos(t * sp * 0.8 + y * 7) * 60 * u;
      const R = Math.max(W, H) * r;
      const g = c.createRadialGradient(px, py, 0, px, py, R);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.fillRect(px - R, py - R, R * 2, R * 2);
    }
    // courbes fines qui traversent l'écran
    c.save();
    c.strokeStyle = 'rgba(29,59,83,0.13)';
    c.lineWidth = 2 * u;
    for (let k = 0; k < 2; k++) {
      const ph = t * 0.15 + k * 2;
      c.beginPath();
      c.moveTo(-50, H * (0.62 + k * 0.08) + Math.sin(ph) * 40 * u);
      c.bezierCurveTo(W * 0.3, H * (0.45 + k * 0.1) + Math.sin(ph + 1) * 60 * u, W * 0.65, H * (0.75 - k * 0.05), W + 50, H * (0.5 + k * 0.12) + Math.cos(ph) * 50 * u);
      c.stroke();
    }
    c.restore();
    // grain léger (statique)
    if (!lineLayer) {
      lineLayer = canvas(W, H);
      const x = lineLayer.getContext('2d');
      const r = Core.rng(3);
      for (let i = 0; i < 2600; i++) {
        x.fillStyle = `rgba(29,59,83,${r() * 0.05})`;
        x.fillRect(r() * W, r() * H, 1.5 * u, 1.5 * u);
      }
    }
    c.drawImage(lineLayer, 0, 0);
  }

  // ---------------------------------------------------------------- texte cinétique mot à mot
  // words : [[mot, accent]] ; apparition mot par mot (montée + flou), disparition en flou
  function kinetic(c, words, x, y, t0, t1, o = {}) {
    const size0 = o.size ?? 110 * u;
    const gap = size0 * 0.28;
    const ws = words.map(([w]) => measure(c, w, { size: size0, weight: o.weight ?? 800, family: FONT, tracking: -0.035 }));
    const total = ws.reduce((a, v) => a + v, 0) + gap * (words.length - 1);
    const maxW = o.maxW ?? W * 0.9;
    // retour à la ligne si nécessaire
    let lines = [[0, words.length]];
    if (total > maxW && words.length > 1) {
      let acc = 0;
      let cut = 1;
      for (let i = 0; i < words.length; i++) {
        acc += ws[i] + gap;
        if (acc - gap > total / 2) {
          cut = Math.max(1, i);
          break;
        }
      }
      lines = [[0, cut], [cut, words.length]];
    }
    let size = size0;
    const widest = Math.max(...lines.map(([a, z]) => ws.slice(a, z).reduce((s, v) => s + v, 0) + gap * (z - a - 1)));
    if (widest > maxW) size *= maxW / widest;
    const k = size / size0;
    const lh = size * 1.12;
    let idx = 0;
    lines.forEach(([a, z], li) => {
      const lw = (ws.slice(a, z).reduce((s, v) => s + v, 0) + gap * (z - a - 1)) * k;
      let px = x - lw / 2;
      const py = y + (li - (lines.length - 1) / 2) * lh;
      for (let i = a; i < z; i++) {
        const [w, acc] = words[i];
        const st = t0 + idx * (o.stagger ?? 0.11);
        const e = ease.outCubic(prog(o.t, st, st + 0.42));
        const out = t1 != null ? ease.inCubic(prog(o.t, t1, t1 + 0.3)) : 0;
        if (e > 0 && out < 1) {
          c.save();
          c.globalAlpha = e * (1 - out);
          const bl = (1 - e) * 16 * u + out * 18 * u;
          if (bl > 0.3) c.filter = `blur(${bl}px)`;
          text(c, w, px, py + (1 - e) * 40 * u - out * 30 * u, {
            size, weight: o.weight ?? 800, family: FONT, tracking: -0.035, color: acc ? C.green : o.color ?? C.ink,
          });
          c.restore();
        }
        px += ws[i] * k + gap * k;
        idx++;
      }
    });
    return { size, lines: lines.length, lh };
  }

  function badge(c, str, x, y, a) {
    if (a <= 0) return;
    const s = 24 * u;
    const w = measure(c, str, { size: s, weight: 700, family: 'JetBrains Mono' }) + s * 1.2;
    c.save();
    c.globalAlpha = clamp(a);
    c.translate(x, y);
    c.scale(lerp(0.6, 1, ease.outBack(clamp(a), 2)), lerp(0.6, 1, ease.outBack(clamp(a), 2)));
    fillRR(c, -w / 2, -s * 0.85, w, s * 1.7, 8 * u, C.green);
    text(c, str, 0, 1, { size: s, weight: 700, family: 'JetBrains Mono', color: '#fff', align: 'center' });
    c.restore();
  }

  function drawCard(c, cv, x, y, o = {}) {
    const s = (o.scale ?? 1) / cv.s;
    c.save();
    c.translate(x, y);
    c.rotate(rad(o.rot ?? 0));
    c.globalAlpha *= o.alpha ?? 1;
    if (o.blur > 0.3) c.filter = `blur(${o.blur}px)`;
    c.drawImage(cv, (-cv.width * s) / 2, (-cv.height * s) / 2, cv.width * s, cv.height * s);
    c.restore();
  }

  // apparition d'une carte : montée + flou -> net ; sortie : flou + montée
  function cardIn(c, cv, x, y, t, t0, t1, o = {}) {
    const e = ease.outCubic(prog(t, t0, t0 + 0.55));
    const out = t1 != null ? ease.inCubic(prog(t, t1, t1 + 0.35)) : 0;
    if (e <= 0 || out >= 1) return;
    drawCard(c, cv, x, y + (1 - e) * 60 * u - out * 40 * u, { scale: (o.scale ?? 1) * lerp(0.94, 1, e), alpha: e * (1 - out), blur: (1 - e) * 14 * u + out * 14 * u, rot: o.rot });
  }

  // ---------------------------------------------------------------- séquences
  const NOTIFS = [
    [0.18, 0.2, 'Nouvelle livraison', '850 kg · Daloa', 0.95], [0.78, 0.17, 'Nouveau producteur', 'Coopérative Agri-Lagunes', 0.8],
    [0.12, 0.72, 'Nouvelle livraison', '610 kg · Soubré', 0.85], [0.84, 0.66, 'Paiement en attente', '268 500 XOF', 1.0],
    [0.5, 0.1, 'Nouvelle livraison', '1,2 t · Gagnoa', 0.7], [0.3, 0.88, 'Parcelle à vérifier', 'Daloa Nord · 3,1 ha', 0.75],
    [0.68, 0.9, 'Nouvelle livraison', '420 kg · Divo', 0.9], [0.92, 0.42, 'Nouveau producteur', 'Coop. Bénin Sud', 0.65],
    [0.06, 0.45, 'Nouvelle livraison', '980 kg · Issia', 0.7],
  ];

  function seqHook(c, t) {
    // notifications éparpillées (avec flou de profondeur), marquées "non tracé"
    const out = ease.inCubic(prog(t, T.hookOut, T.disc));
    NOTIFS.forEach(([x, y, , , depth], i) => {
      const t0 = T.notifs + i * 0.09;
      const e = ease.outBack(prog(t, t0, t0 + 0.4), 1.4);
      if (e <= 0) return;
      const px = (P ? lerp(0.5, x, 0.85) : x) * W;
      const py = (P ? lerp(0.08, 0.92, y) : y) * H;
      const drift = Math.sin(t * 0.8 + i) * 10 * u;
      drawCard(c, cards.notifs[i], px, py + drift - out * 80 * u * depth, {
        scale: u * depth * lerp(0.7, 1, clamp(e)) * (P ? 1.3 : 1.25), alpha: clamp(e) * (1 - out), blur: (1 - depth) * 9 * u + out * 10 * u,
      });
    });
    // voile au centre pour la lisibilité
    const veil = prog(t, T.notifs + 0.5, T.h2);
    if (veil > 0) {
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, W * 0.45);
      g.addColorStop(0, `rgba(245,243,238,${0.85 * veil})`);
      g.addColorStop(1, 'rgba(245,243,238,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    kinetic(c, [['Un', 0], ['producteur.', 0]], cx, cy, T.h1, T.h2 - 0.25, { t, size: 120 * u });
    kinetic(c, [['Puis', 0], ['mille.', 0]], cx, cy, T.h2, T.h3 - 0.25, { t, size: 140 * u });
    kinetic(c, [['Et', 0], ['aucune', 0], ['visibilité', 1], ['sur', 0], ['votre', 0], ['filière.', 0]], cx, cy, T.h3, T.hookOut, { t, size: (P ? 110 : 96) * u, maxW: W * 0.86, stagger: 0.09 });
  }

  function seqBrand(c, t) {
    kinetic(c, [['Découvrez', 0]], cx, cy, T.disc, T.brand - 0.2, { t, size: 90 * u, weight: 700 });
    const e = ease.outCubic(prog(t, T.brand, T.brand + 0.6));
    const out = ease.inCubic(prog(t, T.brandOut, T.f1));
    if (e <= 0 || out >= 1) return;
    const size = (P ? 170 : 190) * u;
    const lh = size * 1.25;
    const lw = (lh * imgs.logo.width) / imgs.logo.height;
    const w1 = measure(c, 'Agro', { size, weight: 800, family: FONT, tracking: -0.04 });
    const w2 = measure(c, 'Sfer', { size, weight: 800, family: FONT, tracking: -0.04 });
    const gap = 26 * u;
    const total = lw + gap + w1 + w2;
    const sc = Math.min(1, (W * 0.88) / total);
    c.save();
    c.translate(cx, cy);
    c.scale(sc * lerp(1.08, 1, e) * (1 + out * 0.05), sc * lerp(1.08, 1, e) * (1 + out * 0.05));
    c.globalAlpha = e * (1 - out);
    const bl = (1 - e) * 20 * u + out * 16 * u;
    if (bl > 0.3) c.filter = `blur(${bl}px)`;
    const x0 = -total / 2;
    const lp = ease.outBack(prog(t, T.brand, T.brand + 0.5), 1.8);
    c.save();
    c.translate(x0 + lw / 2, 0);
    c.scale(lp, lp);
    c.drawImage(imgs.logo, -lw / 2, -lh / 2, lw, lh);
    c.restore();
    text(c, 'Agro', x0 + lw + gap, size * 0.06, { size, weight: 800, family: FONT, tracking: -0.04, color: C.ink });
    text(c, 'Sfer', x0 + lw + gap + w1, size * 0.06, { size, weight: 800, family: FONT, tracking: -0.04, color: C.green });
    c.restore();
    const ta = ease.outCubic(prog(t, T.brand + 0.45, T.brand + 0.9)) * (1 - out);
    if (ta > 0) {
      c.globalAlpha = ta;
      text(c, 'Construire des filières durables et traçables', cx, cy + (P ? 190 : 175) * u * sc, { size: (P ? 40 : 38) * u, weight: 600, family: FONT, color: C.inkSoft, align: 'center' });
      c.globalAlpha = 1;
    }
  }

  const CARD_LAYOUT = {
    landscape: {
      f1: [['producer', 0.36, 0.66, 1.5, -2], ['surveys', 0.68, 0.7, 1.15, 3]],
      f2: [['map', 0.5, 0.67, 1.8, 0]],
      f3: [['trace', 0.5, 0.68, 1.55, 0]],
      f4: [['pay', 0.4, 0.67, 1.55, -2], ['notif', 0.69, 0.8, 1.4, 2]],
    },
    portrait: {
      f1: [['producer', 0.5, 0.48, 2.1, -2], ['surveys', 0.55, 0.78, 1.3, 3]],
      f2: [['map', 0.5, 0.6, 2.25, 0]],
      f3: [['trace', 0.5, 0.62, 2.15, 0]],
      f4: [['pay', 0.5, 0.52, 2.2, -2], ['notif', 0.5, 0.75, 2.2, 2]],
    },
  };

  function seqFeature(c, t, f, idx) {
    const t0 = T[f.t];
    const t1 = idx < 3 ? T[FEATURES[idx + 1].t] - 0.4 : T.offer - 0.4;
    const hy = P ? H * 0.2 : H * 0.25;
    badge(c, f.n, cx, hy - (P ? 120 : 105) * u, ease.outCubic(prog(t, t0, t0 + 0.3)) * (1 - prog(t, t1, t1 + 0.3)));
    kinetic(c, f.words, cx, hy, t0 + 0.05, t1, { t, size: (P ? 96 : 92) * u, maxW: W * (P ? 0.88 : 0.8) });
    const lay = CARD_LAYOUT[P ? 'portrait' : 'landscape'][f.t];
    lay.forEach(([name, x, y, sc, rot], i) => {
      const cv = name === 'surveys' ? cards.surveysAnim(prog(t, t0 + 0.9, t0 + 2.2)) : name === 'map' ? cards.mapAnim(ease.inOutCubic(prog(t, t0 + 0.6, t0 + 2.0)))
        : name === 'trace' ? cards.traceAnim(prog(t, t0 + 0.8, t0 + 2.4)) : name === 'pay' ? cards.payAnim(prog(t, t0 + 1.4, t0 + 2.2)) : cards[name];
      const fl = Math.sin(t * 1.2 + i * 2) * 6 * u;
      cardIn(c, cv, x * W, y * H + fl, t, t0 + 0.45 + i * 0.2, t1, { scale: sc * u * (P ? 1 : 1), rot });
    });
    if (f.t === 'f2') {
      // pastilles autour de la carte
      const chips = P ? [['GPS', 0.27, 0.385], ['2,4 ha', 0.73, 0.385], ['Cacao', 0.5, 0.82]] : [['GPS', 0.2, 0.55], ['2,4 ha', 0.8, 0.5], ['Cacao', 0.78, 0.85]];
      chips.forEach(([s, x, y], i) => {
        const a = ease.outBack(prog(t, t0 + 1.2 + i * 0.15, t0 + 1.5 + i * 0.15), 2) * (1 - prog(t, t1, t1 + 0.3));
        if (a <= 0) return;
        c.save();
        c.globalAlpha = clamp(a);
        c.translate(x * W, y * H);
        c.scale(clamp(a, 0, 1.2), clamp(a, 0, 1.2));
        UI.pill(c, 0, 0, s, { size: 30 * u, bg: '#fff', color: C.ink, align: 'center', weight: 700, icon: i === 0 ? 'pin' : null });
        c.restore();
      });
    }
  }

  function seqOffer(c, t) {
    const y = cy;
    // en vertical : "Simple à déployer." sur une ligne, "Pour toute votre filière." sur deux lignes, plus bas
    kinetic(c, [['Une', 0], ['plateforme', 0], ['complète.', 0]], cx, y - (P ? 290 : 150) * u, T.o1, T.offerOut, { t, size: (P ? 54 : 52) * u, weight: 600, color: C.inkSoft });
    kinetic(c, [['Simple', 0], ['à', 0], ['déployer.', 0]], cx, y - (P ? 165 : 10) * u, T.o2, T.offerOut, { t, size: (P ? 86 : 120) * u, maxW: W * 0.92 });
    kinetic(c, [['Pour', 0], ['toute', 0], ['votre', 0], ['filière.', 0]], cx, y + (P ? 40 : 130) * u, T.o3, T.offerOut, { t, size: (P ? 100 : 120) * u, color: C.green });
  }

  function seqEnd(c, t) {
    const e = ease.outCubic(prog(t, T.end, T.end + 0.6));
    const size = (P ? 130 : 140) * u;
    const lh = size * 1.2;
    const lw = (lh * imgs.logo.width) / imgs.logo.height;
    const w1 = measure(c, 'Agro', { size, weight: 800, family: FONT, tracking: -0.04 });
    const w2 = measure(c, 'Sfer', { size, weight: 800, family: FONT, tracking: -0.04 });
    const gap = 22 * u;
    const total = lw + gap + w1 + w2;
    const sc = Math.min(1, (W * 0.86) / total);
    const ly = cy - (P ? 170 : 140) * u;
    c.save();
    c.translate(cx, ly);
    c.scale(sc, sc);
    c.globalAlpha = e;
    if (e < 1) c.filter = `blur(${(1 - e) * 16 * u}px)`;
    const x0 = -total / 2;
    c.drawImage(imgs.logo, x0, -lh / 2, lw, lh);
    text(c, 'Agro', x0 + lw + gap, size * 0.06, { size, weight: 800, family: FONT, tracking: -0.04, color: C.ink });
    text(c, 'Sfer', x0 + lw + gap + w1, size * 0.06, { size, weight: 800, family: FONT, tracking: -0.04, color: C.green });
    c.restore();
    kinetic(c, [['Prêt', 0], ['à', 0], ['digitaliser', 1], ['votre', 0], ['filière', 0], ['?', 0]], cx, cy + (P ? 40 : 40) * u, T.end + 0.35, null, { t, size: (P ? 70 : 72) * u, stagger: 0.07, maxW: W * 0.86 });
    // bouton
    const ba = ease.outBack(prog(t, T.cta, T.cta + 0.45), 1.8);
    if (ba > 0) {
      const press = Math.sin(Math.PI * clamp(prog(t, T.click - 0.05, T.click + 0.15)));
      const bw = 420 * u;
      const bh = 92 * u;
      const by = cy + (P ? 230 : 210) * u;
      c.save();
      c.translate(cx, by);
      c.scale(clamp(ba, 0, 1.2) * (1 - press * 0.06), clamp(ba, 0, 1.2) * (1 - press * 0.06));
      c.shadowColor = 'rgba(94,158,46,0.45)';
      c.shadowBlur = 40 * u;
      c.shadowOffsetY = 12 * u;
      fillRR(c, -bw / 2, -bh / 2, bw, bh, bh / 2, C.green);
      c.shadowColor = 'transparent';
      text(c, 'Demander une démo', -18 * u, 2 * u, { size: 32 * u, weight: 700, family: FONT, color: '#fff', align: 'center' });
      UI.icon(c, 'arrow', bw / 2 - 72 * u, -16 * u, 32 * u, '#fff', 2.6);
      c.restore();
      // onde
      const rp = prog(t, T.click, T.click + 0.6);
      if (rp > 0 && rp < 1) {
        c.strokeStyle = `rgba(94,158,46,${1 - rp})`;
        c.lineWidth = 4 * u;
        rr(c, cx - bw / 2 - rp * 40 * u, by - bh / 2 - rp * 40 * u, bw + rp * 80 * u, bh + rp * 80 * u, bh / 2 + rp * 40 * u);
        c.stroke();
      }
      // curseur
      const cp = ease.inOutCubic(prog(t, T.cta + 0.3, T.click - 0.05));
      const x = lerp(W * 0.86, cx + 60 * u, cp);
      const y = lerp(H * 0.96, by + 10 * u, cp);
      if (t > T.cta + 0.3) drawCursor(c, x, y, press);
      const ua = ease.outCubic(prog(t, T.click + 0.3, T.click + 0.7));
      if (ua > 0) {
        c.globalAlpha = ua;
        text(c, 'agrosfer.co', cx, by + (P ? 120 : 110) * u, { size: 30 * u, weight: 600, family: 'JetBrains Mono', color: C.inkSoft, align: 'center', tracking: 0.08 });
        c.globalAlpha = 1;
      }
    }
  }

  function drawCursor(c, x, y, press) {
    c.save();
    c.translate(x, y);
    const s = 1.6 * u * (1 - press * 0.12);
    c.scale(s, s);
    const p = new Path2D('M0 0 L0 30 L7.5 23 L12.5 34 L17 32 L12 21.5 L22 21.5 Z');
    c.shadowColor = 'rgba(0,0,0,0.25)';
    c.shadowBlur = 8;
    c.shadowOffsetY = 3;
    c.fillStyle = '#1D3B53';
    c.fill(p);
    c.shadowColor = 'transparent';
    c.lineWidth = 1.6;
    c.strokeStyle = '#fff';
    c.stroke(p);
    c.restore();
  }

  // ---------------------------------------------------------------- scène
  Core.scene({
    duration: DURATION,
    T,
    SFX,
    MUSIC: { score: 'vsl' },
    shutter: 0.5,
    images: { logo: 'assets/img/logo_color.png' },
    fonts: ['800 40px "Montserrat"', '700 40px "Montserrat"', '600 40px "Montserrat"', '700 20px "JetBrains Mono"', '700 20px "Inter"'],
    setup(w, h, A) {
      W = w;
      H = h;
      u = Math.min(W, H) / 1080;
      P = H > W;
      cx = W / 2;
      cy = H / 2;
      imgs = A;
      const opt = { pad: 40, scale: 1.6, radius: 20, bg: '#fff', shadowBlur: 50, shadowY: 18, shadowColor: 'rgba(29,59,83,0.18)' };
      const mk = (w2, h2, fn, o = {}) => UI.card(w2, h2, (c) => fn(c, w2, h2), { ...opt, ...o });
      const memo = (fn, steps = 24) => {
        const m = new Map();
        return (p) => {
          const key = Math.round(clamp(p) * steps);
          if (!m.has(key)) m.set(key, fn(key / steps));
          return m.get(key);
        };
      };
      cards = {
        producer: mk(400, 230, (c, a, b2) => UI.producer(c, 0, 0, a, b2, L)),
        notif: mk(400, 76, (c, a, b2) => UI.notif(c, 0, 0, a, b2, L, { title: 'Paiement envoyé', sub: '425 000 XOF · Awa Koné', icon: 'check', time: '14:02' })),
        surveysAnim: memo((p) => mk(380, 480, (c, a, b2) => UI.surveys(c, 0, 0, a, b2, L, { p: 1, count: p }))),
        mapAnim: memo((p) => mk(420, 300, (c, a, b2) => UI.map(c, 0, 0, a, b2, L, { p, label: p >= 1 ? 'Parcelle A-128 · 2,4 ha' : 'Relevé GPS en cours…' })), 30),
        traceAnim: memo((p) => mk(400, 380, (c, a, b2) => UI.trace(c, 0, 0, a, b2, L, { p }))),
        payAnim: memo((p) => mk(420, 240, (c, a, b2) => UI.payCard(c, 0, 0, a, b2, { value: lerp(2003568, 1578568, ease.outCubic(p)), debit: 425000 }), { bg: '#2A5FA0' })),
        notifs: NOTIFS.map(([, , title, sub], i) =>
          mk(400, 76, (c, a, b2) => {
            UI.notif(c, 0, 0, a, b2, L, { title, sub, icon: i % 3 === 1 ? 'user' : i % 3 === 2 ? 'wallet' : 'box', color: i % 2 ? L.blue : L.green });
            UI.chip(c, 290, 28, 'non tracé', L, 'red', 12);
          }, { pad: 30, scale: 1.4 }),
        ),
      };
    },
    draw(c, t) {
      background(c, t);
      if (t < T.disc) seqHook(c, t);
      else if (t < T.f1) seqBrand(c, t);
      else if (t < T.offer) {
        FEATURES.forEach((f, i) => {
          const t0 = T[f.t];
          const t1 = i < 3 ? T[FEATURES[i + 1].t] : T.offer;
          if (t >= t0 - 0.05 && t < t1 + 0.05) seqFeature(c, t, f, i);
        });
      } else if (t < T.end) seqOffer(c, t);
      else seqEnd(c, t);
    },
  });
})();
