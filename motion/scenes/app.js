// AgroSfer — "une journée avec l'app" : téléphone en 3D sur fond sombre, écrans animés, éléments qui sortent de l'écran,
// outro en traînées lumineuses qui dessinent le logo (dans l'esprit des démos UI sombres type TikTok).
(async () => {
  await Core.loadScript('lib/ui.js');
  await Core.loadScript('lib/gl3d.js');
  await Core.loadScript('assets/data/logo_paths.js');
  const { clamp, lerp, prog, rad, ease, hash, canvas, text, measure, rr, fillRR } = Core;

  const BAR = (4 * 60) / 112;
  const b = (n) => n * BAR;
  const T = {
    logoIn: 0.2, introOut: b(1) - 0.45,
    lock: b(1), notif: b(1) + 0.45, tap: b(1) + 1.65,
    search: b(2), type0: b(2) + 0.25, type1: b(2) + 1.15, sugg: b(2) + 1.2,
    map: b(3), trace0: b(3) + 0.3, trace1: b(3) + 1.4, validate: b(3) + 1.55,
    train: b(4), play: b(4) + 0.55, lang: b(4) + 1.3,
    producer: b(5), weighBtn: b(5) + 1.6,
    weigh: b(6), count0: b(6) + 0.2, count1: b(6) + 1.1, steps: b(6) + 1.15,
    pay: b(7), send: b(7) + 0.55, success: b(7) + 0.9,
    chat: b(8), m1: b(8) + 0.3, m2: b(8) + 1.25, m3: b(8) + 2.3, order: b(8) + 3.1,
    dash: b(10), chart0: b(10) + 0.25,
    outro: b(11), trails: b(11) + 0.25, fill: b(12) - 0.2, word: b(12) + 0.15, tag: b(12) + 0.55, end: b(13),
  };
  const DURATION = T.end;
  const SECTIONS = ['lock', 'search', 'map', 'train', 'producer', 'weigh', 'pay', 'chat', 'dash'];
  const CAPTIONS = {
    search: ['01', 'Collecter'], map: ['02', 'Cartographier'], train: ['03', 'Former'], producer: ['04', 'Identifier'],
    weigh: ['05', 'Tracer'], pay: ['06', 'Payer'], chat: ['07', 'Vendre'], dash: ['08', 'Piloter'],
  };

  const SFX = [
    { t: 0.05, type: 'whoosh', dur: 1.0, f0: 150, f1: 700, gain: 0.3 },
    { t: T.logoIn + 0.35, type: 'sparkle', gain: 0.55 },
    { t: T.introOut, type: 'whoosh', dur: 0.5, f0: 400, f1: 3500, gain: 0.6 },
    { t: T.lock, type: 'whoosh', dur: 0.6, f0: 200, f1: 1500, gain: 0.55 },
    { t: T.notif, type: 'notif', gain: 0.6 },
    { t: T.tap, type: 'click', gain: 0.8 },
    ...SECTIONS.slice(1).map((s) => ({ t: T[s] - 0.06, type: 'whoosh', dur: 0.45, f0: 500, f1: 2600, gain: 0.5 })),
    { t: T.type0, type: 'typing', dur: T.type1 - T.type0, rate: 15, gain: 0.6 },
    ...[0, 1, 2, 3].map((i) => ({ t: T.sugg + i * 0.1, type: 'ui_pop', f: 900 + i * 120, gain: 0.35 })),
    ...[0, 1, 2, 3, 4].map((i) => ({ t: T.trace0 + (i * (T.trace1 - T.trace0)) / 5 + 0.05, type: 'beep', f: 1800 + i * 150, n: 1, gain: 0.35 })),
    { t: T.validate, type: 'click', gain: 0.7 },
    { t: T.validate + 0.05, type: 'chime', gain: 0.45 },
    { t: T.play, type: 'click', gain: 0.6 },
    { t: T.play + 0.05, type: 'ui_pop', f: 600, gain: 0.4 },
    ...[0, 1, 2, 3].map((i) => ({ t: T.lang + i * 0.12, type: 'tick', f: 1500 + i * 220, gain: 0.3 })),
    { t: T.producer + 0.25, type: 'ui_pop', f: 700, gain: 0.5 },
    { t: T.weighBtn, type: 'click', gain: 0.7 },
    { t: T.count0, type: 'riser', dur: T.count1 - T.count0, gain: 0.35 },
    { t: T.count1, type: 'pop', f0: 500, f1: 1200, gain: 0.55 },
    ...[0, 1, 2, 3].map((i) => ({ t: T.steps + i * 0.2, type: 'tick', f: 2000 + i * 200, gain: 0.4 })),
    { t: T.send, type: 'click', gain: 0.7 },
    { t: T.success, type: 'cash', gain: 0.8 },
    { t: T.success + 0.15, type: 'swish', dur: 0.3, gain: 0.4 },
    { t: T.m1, type: 'notif', gain: 0.45 },
    { t: T.m2, type: 'ui_pop', f: 1000, gain: 0.45 },
    { t: T.m3, type: 'notif', gain: 0.45 },
    { t: T.order, type: 'ui_pop', f: 760, gain: 0.55 },
    { t: T.order + 0.1, type: 'chime', gain: 0.4 },
    { t: T.chart0, type: 'swish', dur: 0.8, gain: 0.3 },
    { t: T.outro - 0.05, type: 'whoosh', dur: 0.6, f0: 300, f1: 4000, gain: 0.7 },
    { t: T.trails, type: 'flutter', dur: 1.6, rate: 6, gain: 0.25 },
    { t: T.fill, type: 'boom', gain: 0.7 },
    { t: T.fill + 0.05, type: 'sparkle', gain: 0.6 },
    { t: T.word, type: 'swish', dur: 0.35, gain: 0.4 },
  ];

  // ---------------------------------------------------------------- état
  let W, H, u, cx, cy, stage, phoneCv, phoneCtx, imgs, pops;
  const D = UI.THEMES.dark;
  const PH = { w: 390, h: 844, r: 54, bez: 13, k: 2.2, pad: 30 };

  // ---------------------------------------------------------------- écrans du téléphone (coordonnées logiques 390 x 844)
  function statusBar(c, color = '#fff') {
    text(c, '09:41', 34, 28, { size: 16, weight: 700, color });
    fillRR(c, 330, 21, 26, 13, 4, color);
    c.globalAlpha = 0.9;
    for (let i = 0; i < 4; i++) c.fillRect(290 + i * 6, 32 - i * 3, 4, 3 + i * 3);
    c.globalAlpha = 1;
    fillRR(c, 140, 12, 110, 32, 16, '#000');
  }

  function appHeader(c, title, sub) {
    text(c, title, 24, 86, { size: 30, weight: 800, color: D.text, tracking: -0.02 });
    if (sub) text(c, sub, 24, 116, { size: 14, weight: 500, color: D.muted });
  }

  function tabBar(c, active) {
    fillRR(c, 0, 770, 390, 74, 0, '#0E1311');
    c.fillStyle = D.border;
    c.fillRect(0, 770, 390, 1);
    ['doc', 'pin', 'wallet', 'chat', 'chart'].forEach((ic, i) => {
      UI.icon(c, ic, 30 + i * 74, 786, 26, i === active ? D.green : D.faint, 2);
    });
    fillRR(c, 128, 830, 134, 5, 3, 'rgba(255,255,255,0.6)');
  }

  function button(c, x, y, w, h, label, bg, fg, o = {}) {
    const s = 1 - 0.06 * (o.press ?? 0);
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.scale(s, s);
    fillRR(c, -w / 2, -h / 2, w, h, h / 2, bg);
    if (o.icon) UI.icon(c, o.icon, -measure(c, label, { size: 17, weight: 700 }) / 2 - 30, -11, 22, fg, 2.4);
    text(c, label, o.icon ? 12 : 0, 1, { size: 17, weight: 700, color: fg, align: 'center' });
    c.restore();
  }

  function scrLock(c, lt) {
    const g = c.createLinearGradient(0, 0, 390, 844);
    g.addColorStop(0, '#173B26');
    g.addColorStop(0.55, '#0B1A12');
    g.addColorStop(1, '#06100B');
    c.fillStyle = g;
    c.fillRect(0, 0, 390, 844);
    c.globalAlpha = 0.18;
    c.drawImage(imgs.logoWhite, 95, 470, 200, 300);
    c.globalAlpha = 1;
    statusBar(c);
    text(c, 'lundi 14 avril', 195, 120, { size: 19, weight: 500, color: 'rgba(255,255,255,0.8)', align: 'center' });
    text(c, '9:41', 195, 196, { size: 96, weight: 700, color: '#fff', align: 'center', tracking: -0.03 });
    const a = 0; // la notification "sort" de l'écran (voir popouts)
    if (a > 0) {
      const y = lerp(250, 300, clamp(a));
      c.globalAlpha = clamp(a);
      c.save();
      c.translate(195, y + 46);
      c.scale(lerp(0.9, 1, clamp(a)), lerp(0.9, 1, clamp(a)));
      fillRR(c, -175, -46, 350, 92, 22, 'rgba(30,40,35,0.86)');
      fillRR(c, -160, -32, 40, 40, 10, '#0B1A12');
      c.drawImage(imgs.logo, -152, -29, 23, 34);
      text(c, 'AGROSFER', -108, -22, { size: 12, weight: 700, color: 'rgba(255,255,255,0.6)', tracking: 0.06 });
      text(c, 'maintenant', 160, -22, { size: 12, weight: 500, color: 'rgba(255,255,255,0.5)', align: 'right' });
      text(c, 'Nouvelle enquête : Récolte & pesée', -108, 2, { size: 14.5, weight: 700, color: '#fff' });
      text(c, 'Coopérative Agri-Lagunes · 24 producteurs', -108, 23, { size: 12.5, weight: 500, color: 'rgba(255,255,255,0.7)' });
      c.restore();
      c.globalAlpha = 1;
    }
    fillRR(c, 128, 830, 134, 5, 3, 'rgba(255,255,255,0.7)');
  }

  function keyboard(c, y, hl) {
    fillRR(c, 0, y, 390, 844 - y, 0, '#1A211E');
    const rows = ['azertyuiop', 'qsdfghjklm', 'wxcvbn'];
    rows.forEach((row, r) => {
      const kw = 33;
      const ox = (390 - row.length * (kw + 4)) / 2;
      [...row].forEach((ch, i) => {
        const on = hl === ch;
        fillRR(c, ox + i * (kw + 4), y + 12 + r * 52, kw, 44, 7, on ? '#5C6A63' : '#36403B');
        text(c, ch, ox + i * (kw + 4) + kw / 2, y + 34 + r * 52, { size: 19, weight: 500, color: '#fff', align: 'center' });
      });
    });
    fillRR(c, 90, y + 170, 210, 44, 7, '#36403B');
    text(c, 'espace', 195, y + 192, { size: 15, weight: 500, color: '#fff', align: 'center' });
    fillRR(c, 308, y + 170, 70, 44, 7, D.green);
    text(c, 'OK', 343, y + 192, { size: 15, weight: 700, color: '#0B1A08', align: 'center' });
  }

  function scrSearch(c, lt) {
    c.fillStyle = D.bg;
    c.fillRect(0, 0, 390, 844);
    statusBar(c);
    appHeader(c, 'Enquêtes', 'Coopérative Agri-Lagunes');
    UI.chip(c, 248, 86, 'Hors ligne', D, 'muted', 12.5);
    const q = 'récolte cacao Daloa';
    const n = Math.floor(q.length * prog(lt, T.type0 - T.search, T.type1 - T.search));
    const typed = q.slice(0, n);
    rr(c, 20, 140, 350, 52, 16);
    c.fillStyle = D.surface;
    c.fill();
    c.strokeStyle = D.green;
    c.lineWidth = 2;
    c.stroke();
    UI.icon(c, 'search', 36, 154, 24, D.muted);
    text(c, typed, 72, 167, { size: 18, weight: 600, color: D.text });
    if (Math.floor(lt * 3) % 2 === 0 || n < q.length) {
      c.fillStyle = D.green;
      c.fillRect(74 + measure(c, typed, { size: 18, weight: 600 }), 154, 2.5, 26);
    }
    text(c, 'Suggestions', 24, 226, { size: 14, weight: 700, color: D.muted, tracking: 0.04 });
    const sug = [
      ['search', 'récolte cacao Daloa', 'Enquête · 63 réponses'],
      ['pin', 'Parcelle A-128 · Daloa', 'Cartographie · 2,4 ha'],
      ['users', 'Producteurs Daloa Nord', '24 membres'],
      ['box', 'Lot CI-2026-0412', 'Traçabilité · en cours'],
    ];
    sug.forEach(([ic, a, s2], i) => {
      const p = ease.outCubic(prog(lt, T.sugg - T.search + i * 0.1, T.sugg - T.search + i * 0.1 + 0.3));
      if (p <= 0) return;
      const y = 248 + i * 72 + (1 - p) * 24;
      c.globalAlpha = p;
      fillRR(c, 20, y, 350, 62, 14, i === 0 ? D.surface2 : D.surface);
      fillRR(c, 34, y + 13, 36, 36, 10, D.green + '22');
      UI.icon(c, ic, 41, y + 20, 22, D.green, 2.2);
      text(c, a, 84, y + 24, { size: 15.5, weight: 700, color: D.text });
      text(c, s2, 84, y + 44, { size: 12.5, weight: 500, color: D.muted });
      c.globalAlpha = 1;
    });
    const key = n > 0 && n < q.length ? q[n - 1] : '';
    keyboard(c, 586, key);
  }

  function scrMap(c, lt) {
    c.fillStyle = D.bg;
    c.fillRect(0, 0, 390, 844);
    const p = ease.inOutCubic(prog(lt, T.trace0 - T.map, T.trace1 - T.map));
    UI.map(c, 0, 0, 390, 606, D, { p, label: p >= 1 ? 'Parcelle A-128 · 2,4 ha' : 'Relevé GPS en cours…', seed: 9, poly: [[0.25, 0.32], [0.66, 0.24], [0.78, 0.48], [0.6, 0.66], [0.3, 0.6]] });
    statusBar(c);
    fillRR(c, 20, 60, 190, 44, 22, 'rgba(10,16,12,0.8)');
    UI.icon(c, 'pin', 32, 70, 22, D.lemon, 2.2);
    text(c, 'Cartographie', 62, 83, { size: 16, weight: 700, color: '#fff' });
    // feuille du bas
    fillRR(c, 0, 600, 390, 244, 28, D.surface);
    fillRR(c, 170, 612, 50, 5, 3, D.faint);
    text(c, 'Parcelle A-128', 24, 650, { size: 22, weight: 800, color: D.text });
    text(c, 'Awa Koné · Cacao · Daloa', 24, 676, { size: 14, weight: 500, color: D.muted });
    const area = (2.4 * p).toFixed(1).replace('.', ',');
    text(c, `${area} ha`, 366, 650, { size: 22, weight: 800, color: D.green, align: 'right' });
    const done = lt > T.validate - T.map;
    const press = Math.sin(Math.PI * clamp(prog(lt, T.validate - T.map - 0.05, T.validate - T.map + 0.12)));
    button(c, 24, 702, 342, 56, done ? 'Parcelle enregistrée' : 'Valider la parcelle', done ? D.green : D.surface2, done ? '#0B1A08' : D.text, { press, icon: done ? 'check' : 'pin' });
  }

  // AgroSfer Farmer Education : vidéos et audios de formation en langues locales
  function scrTrain(c, lt) {
    c.fillStyle = D.bg;
    c.fillRect(0, 0, 390, 844);
    statusBar(c);
    appHeader(c, 'Farmer Education', 'Formations en langues locales');
    // vignette vidéo (illustration d'un champ de maïs)
    c.save();
    rr(c, 20, 140, 350, 210, 18);
    c.clip();
    const sky = c.createLinearGradient(0, 140, 0, 350);
    sky.addColorStop(0, '#F6E7A8');
    sky.addColorStop(1, '#C9DE8A');
    c.fillStyle = sky;
    c.fillRect(20, 140, 350, 210);
    c.fillStyle = '#FFF4C2';
    c.beginPath();
    c.arc(300, 185, 26, 0, 7);
    c.fill();
    c.fillStyle = '#7FA34A';
    c.fillRect(20, 270, 350, 80);
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 9; k++) {
        const px = 30 + k * 40 + (r % 2) * 20;
        const py = 268 + r * 22;
        const sh = 26 + r * 6;
        const sway = Math.sin(lt * 2 + k + r) * 2;
        c.strokeStyle = r % 2 ? '#3F6B22' : '#4E7F2B';
        c.lineWidth = 2.5 + r * 0.5;
        c.beginPath();
        c.moveTo(px, py);
        c.quadraticCurveTo(px + sway, py - sh / 2, px + sway * 2, py - sh);
        c.stroke();
        c.fillStyle = r % 2 ? '#5C9433' : '#6FA83A';
        c.beginPath();
        c.ellipse(px + sway - 6, py - sh * 0.55, 8, 3, -0.6, 0, 7);
        c.ellipse(px + sway + 6, py - sh * 0.7, 8, 3, 0.6, 0, 7);
        c.fill();
      }
    }
    const playing = lt > T.play - T.train;
    if (!playing) {
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(20, 140, 350, 210);
      c.beginPath();
      c.arc(195, 245, 34, 0, 7);
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.fill();
      c.fillStyle = '#18241D';
      c.beginPath();
      c.moveTo(186, 230);
      c.lineTo(186, 260);
      c.lineTo(211, 245);
      c.closePath();
      c.fill();
    }
    const pr = playing ? clamp((lt - (T.play - T.train)) / 6) : 0;
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(36, 334, 318, 4);
    c.fillStyle = D.green;
    c.fillRect(36, 334, 318 * (0.08 + pr), 4);
    c.restore();
    text(c, 'Le bon geste au bon moment', 24, 384, { size: 20, weight: 800, color: D.text, tracking: -0.01 });
    text(c, 'Entretien des plants de maïs · 3 min', 24, 410, { size: 13.5, weight: 500, color: D.muted });
    // langues
    text(c, 'Langue', 24, 452, { size: 13, weight: 700, color: D.muted, tracking: 0.04 });
    let x = 24;
    ['Fon', 'Yoruba', 'Dioula', 'Français'].forEach((l, i) => {
      const a = ease.outBack(prog(lt, T.lang - T.train + i * 0.12, T.lang - T.train + i * 0.12 + 0.3), 2);
      const sel = i === 0;
      const w = measure(c, l, { size: 14.5, weight: 700 }) + 30;
      c.save();
      c.globalAlpha = clamp(a);
      c.translate(x + w / 2, 486);
      c.scale(clamp(a, 0.6, 1.1), clamp(a, 0.6, 1.1));
      fillRR(c, -w / 2, -17, w, 34, 17, sel ? D.green : D.surface2);
      text(c, l, 0, 1, { size: 14.5, weight: 700, color: sel ? '#0B1A08' : D.text, align: 'center' });
      c.restore();
      x += w + 8;
    });
    // audio
    fillRR(c, 20, 524, 350, 66, 16, D.surface);
    UI.icon(c, 'chat', 36, 545, 24, D.green, 2);
    for (let i = 0; i < 38; i++) {
      const hgt = 6 + Math.abs(Math.sin(i * 1.7 + (playing ? lt * 7 : 0))) * 22 * (playing ? 1 : 0.4);
      c.fillStyle = i / 38 < 0.08 + pr ? D.green : D.faint;
      c.fillRect(74 + i * 7.4, 557 - hgt / 2, 4, hgt);
    }
    text(c, 'Audio en fon', 74, 580, { size: 11.5, weight: 600, color: D.muted });
    text(c, 'Leçons de la campagne', 24, 624, { size: 13, weight: 700, color: D.muted, tracking: 0.04 });
    [['Semis en ligne', '2 min'], ['Gestion de la fertilité des sols', '4 min']].forEach(([n, d], i) => {
      const y = 642 + i * 58;
      fillRR(c, 20, y, 350, 50, 12, D.surface);
      UI.icon(c, 'sprout', 34, y + 13, 24, D.green, 2);
      text(c, n, 68, y + 25, { size: 14.5, weight: 600, color: D.text });
      text(c, d, 356, y + 25, { size: 12.5, weight: 500, color: D.muted, align: 'right' });
    });
    tabBar(c, 0);
  }

  function scrProducer(c, lt) {
    c.fillStyle = D.bg;
    c.fillRect(0, 0, 390, 844);
    const g = c.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, '#1F3A26');
    g.addColorStop(1, D.bg);
    c.fillStyle = g;
    c.fillRect(0, 0, 390, 300);
    statusBar(c);
    const a = ease.outBack(prog(lt, 0.1, 0.5), 1.5);
    c.save();
    c.translate(195, 160);
    c.scale(a, a);
    c.beginPath();
    c.arc(0, 0, 58, 0, 7);
    c.fillStyle = D.bg;
    c.fill();
    UI.avatar(c, 0, 0, 52, 'AK', D.green, '#0B1A08');
    c.restore();
    text(c, 'Awa Koné', 195, 248, { size: 26, weight: 800, color: D.text, align: 'center', tracking: -0.02 });
    text(c, 'Productrice · Coopérative Agri-Lagunes', 195, 276, { size: 14, weight: 500, color: D.muted, align: 'center' });
    const stats = [['3', 'Parcelles'], ['12', 'Livraisons'], ['7,1 ha', 'Surface']];
    stats.forEach(([v, l], i) => {
      const x = 75 + i * 120;
      text(c, v, x, 326, { size: 24, weight: 800, color: D.text, align: 'center' });
      text(c, l, x, 352, { size: 12.5, weight: 500, color: D.muted, align: 'center' });
    });
    let x = 24;
    for (const [l, k] of [['Cacao', 'green'], ['Anacarde', 'blue'], ['Certifiée', 'green'], ['Formée', 'muted']]) x += UI.chip(c, x, 396, l, D, k, 13) + 8;
    const press = Math.sin(Math.PI * clamp(prog(lt, T.weighBtn - T.producer - 0.05, T.weighBtn - T.producer + 0.12)));
    button(c, 24, 430, 250, 54, 'Enregistrer une pesée', D.green, '#0B1A08', { press });
    fillRR(c, 284, 430, 82, 54, 27, D.surface2);
    UI.icon(c, 'chat', 313, 445, 24, D.text, 2);
    text(c, 'Dernières livraisons', 24, 524, { size: 15, weight: 700, color: D.muted, tracking: 0.02 });
    [['12 mars', '850 kg', 'Validée'], ['26 févr.', '610 kg', 'Payée'], ['09 févr.', '720 kg', 'Payée']].forEach(([d, kg, st], i) => {
      const y = 544 + i * 70;
      fillRR(c, 20, y, 350, 60, 14, D.surface);
      UI.icon(c, 'box', 36, y + 18, 24, D.green, 2);
      text(c, kg, 76, y + 22, { size: 16, weight: 700, color: D.text });
      text(c, d, 76, y + 42, { size: 12.5, weight: 500, color: D.muted });
      UI.chip(c, 270, y + 30, st, D, i ? 'blue' : 'green', 12.5);
    });
    tabBar(c, 1);
  }

  function scrWeigh(c, lt) {
    c.fillStyle = D.bg;
    c.fillRect(0, 0, 390, 844);
    statusBar(c);
    appHeader(c, 'Pesée', 'Lot CI-2026-0412');
    const p = ease.outCubic(prog(lt, T.count0 - T.weigh, T.count1 - T.weigh));
    const kg = Math.round(850 * p);
    c.save();
    c.translate(195, 290);
    c.lineCap = 'round';
    c.lineWidth = 16;
    c.strokeStyle = D.surface2;
    c.beginPath();
    c.arc(0, 0, 118, rad(135), rad(405));
    c.stroke();
    const grd = c.createLinearGradient(-120, 0, 120, 0);
    grd.addColorStop(0, D.green);
    grd.addColorStop(1, D.lemon);
    c.strokeStyle = grd;
    c.beginPath();
    c.arc(0, 0, 118, rad(135), rad(135 + 270 * p * 0.85));
    c.stroke();
    c.restore();
    text(c, String(kg), 195, 280, { size: 68, weight: 800, color: D.text, align: 'center', tracking: -0.03 });
    text(c, 'kg', 195, 330, { size: 20, weight: 600, color: D.muted, align: 'center' });
    const ok = lt > T.count1 - T.weigh;
    if (ok) {
      const a = ease.outBack(prog(lt, T.count1 - T.weigh, T.count1 - T.weigh + 0.3), 2);
      c.globalAlpha = clamp(a);
      UI.chip(c, 128, 432, 'Pesée validée', D, 'green', 15);
      c.globalAlpha = 1;
    }
    UI.trace(c, 20, 470, 350, 290, D, {
      p: 0.25 + 0.75 * ease.outCubic(prog(lt, T.steps - T.weigh, T.steps - T.weigh + 0.8)), lot: 'Awa Koné',
      steps: [['sprout', 'Récolte', 'Parcelle A-128 · 12 mars'], ['box', 'Pesée coopérative', '850 kg · qualité A'], ['truck', 'Transport', 'Daloa → San-Pédro'], ['factory', 'Usine', 'Réception prévue']],
    });
    tabBar(c, 0);
  }

  function scrPay(c, lt) {
    c.fillStyle = D.bg;
    c.fillRect(0, 0, 390, 844);
    statusBar(c);
    appHeader(c, 'AgroSfer Pay', 'Paiement producteur');
    const sent = lt > T.success - T.pay;
    const v = sent ? lerp(2003568, 1578568, ease.outCubic(prog(lt, T.success - T.pay, T.success - T.pay + 0.6))) : 2003568;
    UI.payCard(c, 20, 140, 350, 200, { value: v, debit: 425000 });
    fillRR(c, 20, 360, 350, 150, 18, D.surface);
    UI.avatar(c, 62, 404, 24, 'AK', D.green, '#0B1A08');
    text(c, 'Awa Koné', 98, 396, { size: 16, weight: 700, color: D.text });
    text(c, 'Mobile money · •• 47 21', 98, 416, { size: 12.5, weight: 500, color: D.muted });
    text(c, '425 000 XOF', 196, 470, { size: 34, weight: 800, color: D.text, align: 'center', tracking: -0.02 });
    const press = Math.sin(Math.PI * clamp(prog(lt, T.send - T.pay - 0.05, T.send - T.pay + 0.12)));
    if (!sent) button(c, 20, 530, 350, 58, 'Envoyer le paiement', D.green, '#0B1A08', { press, icon: 'send' });
    else {
      const a = ease.outBack(prog(lt, T.success - T.pay, T.success - T.pay + 0.4), 2);
      c.save();
      c.translate(195, 560);
      c.scale(clamp(a, 0, 1.2), clamp(a, 0, 1.2));
      fillRR(c, -175, -29, 350, 58, 29, D.green + '26');
      UI.icon(c, 'check', -100, -12, 24, D.green, 2.6);
      text(c, 'Paiement envoyé', 10, 1, { size: 17, weight: 700, color: D.green, align: 'center' });
      c.restore();
    }
    text(c, 'Historique', 24, 630, { size: 15, weight: 700, color: D.muted });
    [['Coulibaly S.', '- 310 000'], ['Yao K.', '- 268 500']].forEach(([n, a2], i) => {
      const y = 650 + i * 56;
      text(c, n, 24, y + 20, { size: 15, weight: 600, color: D.text });
      text(c, `${a2} XOF`, 366, y + 20, { size: 15, weight: 700, color: D.text, align: 'right' });
      c.fillStyle = D.border;
      c.fillRect(24, y + 42, 342, 1);
    });
    tabBar(c, 2);
  }

  const MSGS = [
    { t: 'm1', side: 'l', str: 'Bonjour ! 12 t de cacao dispo', str2: 'pour avril ?' },
    { t: 'm2', side: 'r', str: 'Oui, lot tracé CI-2026-0412', str2: 'prêt à expédier ✅' },
    { t: 'm3', side: 'l', str: 'Parfait, je confirme', str2: 'la commande.' },
  ];

  function scrChat(c, lt) {
    c.fillStyle = D.bg;
    c.fillRect(0, 0, 390, 844);
    statusBar(c);
    fillRR(c, 20, 62, 46, 46, 14, D.lemon);
    UI.icon(c, 'factory', 31, 73, 24, '#3A5A12', 2);
    text(c, 'Transformateur cacao', 78, 78, { size: 16.5, weight: 700, color: D.text });
    text(c, 'Place de marché · Abidjan · en ligne', 78, 98, { size: 12.5, weight: 500, color: D.green });
    c.fillStyle = D.border;
    c.fillRect(0, 126, 390, 1);
    text(c, "Aujourd'hui 10:12", 195, 156, { size: 12, weight: 600, color: D.faint, align: 'center' });
    let y = 186;
    MSGS.forEach((m) => {
      const t0 = T[m.t] - T.chat;
      const a = ease.outBack(prog(lt, t0, t0 + 0.35), 1.6);
      // indicateur "écrit..."
      if (lt > t0 - 0.55 && lt < t0 && m.side === 'l') {
        fillRR(c, 20, y, 70, 40, 20, D.surface2);
        for (let i = 0; i < 3; i++) {
          c.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(lt * 9 - i));
          c.beginPath();
          c.arc(40 + i * 15, y + 20, 4, 0, 7);
          c.fillStyle = D.muted;
          c.fill();
        }
        c.globalAlpha = 1;
      }
      if (a <= 0) return;
      const size = 15.5;
      const w = Math.max(measure(c, m.str, { size, weight: 600 }), measure(c, m.str2, { size, weight: 600 })) + 32;
      const h = 66;
      const x = m.side === 'r' ? 370 - w : 20;
      c.save();
      c.translate(m.side === 'r' ? x + w : x, y + h);
      c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1));
      c.translate(m.side === 'r' ? -w : 0, -h);
      fillRR(c, 0, 0, w, h, 20, m.side === 'r' ? D.green : D.surface2);
      text(c, m.str, 16, 22, { size, weight: 600, color: m.side === 'r' ? '#0B1A08' : D.text });
      text(c, m.str2, 16, 44, { size, weight: 600, color: m.side === 'r' ? '#0B1A08' : D.text });
      c.restore();
      y += h + 14;
    });
    const oa = ease.outBack(prog(lt, T.order - T.chat, T.order - T.chat + 0.4), 1.5);
    if (oa > 0) {
      c.save();
      c.translate(195, y + 120);
      c.scale(clamp(oa, 0, 1.1), clamp(oa, 0, 1.1));
      UI.order(c, -175, -120, 350, 240, D, { status: 'Commande confirmée' });
      c.restore();
    }
    fillRR(c, 20, 700, 300, 50, 25, D.surface);
    text(c, 'Message…', 42, 726, { size: 15, weight: 500, color: D.faint });
    fillRR(c, 326, 700, 50, 50, 25, D.green);
    UI.icon(c, 'send', 339, 713, 24, '#0B1A08', 2.2);
    tabBar(c, 3);
  }

  function scrDash(c, lt) {
    c.fillStyle = D.bg;
    c.fillRect(0, 0, 390, 844);
    statusBar(c);
    appHeader(c, 'Tableau de bord', 'Coopérative Agri-Lagunes · 2026');
    const p = ease.outCubic(prog(lt, T.chart0 - T.dash, T.chart0 - T.dash + 1.2));
    UI.kpis(c, 20, 140, 350, 120, D, { p, items: [['users', '248', 'Producteurs'], ['pin', '412', 'Parcelles'], ['box', '96', 'Lots tracés']] });
    UI.chart(c, 20, 280, 350, 300, D, { p, title: 'Volumes collectés' });
    UI.notif(c, 20, 600, 350, 70, D, { title: 'Commande confirmée', sub: '12 t · livraison avril', icon: 'check', time: '10:14' });
    tabBar(c, 4);
  }

  const SCREENS = { lock: scrLock, search: scrSearch, map: scrMap, train: scrTrain, producer: scrProducer, weigh: scrWeigh, pay: scrPay, chat: scrChat, dash: scrDash };

  // ---------------------------------------------------------------- téléphone
  function sectionAt(t) {
    let cur = 'lock';
    for (const s of SECTIONS) if (t >= T[s]) cur = s;
    return cur;
  }

  let phoneVersion = -1;
  function renderPhone(t) {
    // une seule mise à jour de l'écran par image (les sous-images du flou de mouvement la réutilisent)
    const v = Math.round(t * 30);
    if (v === phoneVersion) return v;
    phoneVersion = v;
    t = v / 30;
    const k = PH.k;
    const c = phoneCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, phoneCv.width, phoneCv.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    const ox = PH.pad;
    const oy = PH.pad;
    const bw = PH.w + PH.bez * 2;
    const bh = PH.h + PH.bez * 2;
    // corps
    const g = c.createLinearGradient(ox, oy, ox + bw, oy + bh);
    g.addColorStop(0, '#3A403D');
    g.addColorStop(0.5, '#151917');
    g.addColorStop(1, '#2C322F');
    fillRR(c, ox, oy, bw, bh, PH.r + PH.bez, g);
    fillRR(c, ox + 3, oy + 3, bw - 6, bh - 6, PH.r + PH.bez - 3, '#050706');
    // écran
    c.save();
    c.translate(ox + PH.bez, oy + PH.bez);
    rr(c, 0, 0, PH.w, PH.h, PH.r);
    c.clip();
    const s = sectionAt(t);
    const i = SECTIONS.indexOf(s);
    const tr = i > 0 ? ease.inOutCubic(prog(t, T[s], T[s] + 0.32)) : 1;
    if (tr < 1 && i > 0) {
      const prev = SECTIONS[i - 1];
      c.save();
      c.translate(-tr * 120, 0);
      SCREENS[prev](c, t - T[prev]);
      c.fillStyle = `rgba(0,0,0,${tr * 0.6})`;
      c.fillRect(0, 0, PH.w, PH.h);
      c.restore();
      c.save();
      c.translate((1 - tr) * PH.w, 0);
      c.shadowColor = 'rgba(0,0,0,0.6)';
      c.shadowBlur = 30;
      c.fillStyle = D.bg;
      c.fillRect(0, 0, PH.w, PH.h);
      c.shadowColor = 'transparent';
      SCREENS[s](c, t - T[s]);
      c.restore();
    } else {
      SCREENS[s](c, t - T[s]);
    }
    // reflet
    const rg = c.createLinearGradient(0, 0, PH.w, PH.h);
    rg.addColorStop(0, 'rgba(255,255,255,0.07)');
    rg.addColorStop(0.4, 'rgba(255,255,255,0)');
    c.fillStyle = rg;
    c.fillRect(0, 0, PH.w, PH.h);
    c.restore();
    return v;
  }

  // poses de caméra par séquence : [rx, ry, rz, échelle, dx, dy]
  const POSES = {
    lock: [10, -16, 3, 1.0, 0, 30],
    search: [9, 17, -2, 1.02, 0, 40],
    map: [14, -18, 3, 1.04, 0, 30],
    train: [9, 15, -2, 1.03, 0, 40],
    producer: [7, 14, -2, 1.0, 0, 40],
    weigh: [10, -12, 2, 1.32, 0, 280],
    pay: [9, 19, -3, 1.02, -20, 40],
    chat: [7, -15, 2, 1.02, 20, 40],
    dash: [15, 11, -2, 1.0, 0, 40],
  };

  function poseAt(t) {
    if (t < T.lock) return null;
    const s = sectionAt(t);
    const i = SECTIONS.indexOf(s);
    let cur = POSES[s];
    if (i > 0) {
      const prev = POSES[SECTIONS[i - 1]];
      const p = ease.inOutBack(prog(t, T[s] - 0.08, T[s] + 0.42), 0.9);
      cur = cur.map((v, k) => lerp(prev[k], v, p));
    }
    let [rx, ry, rz, sc, dx, dy] = cur;
    // entrée du téléphone
    const e = ease.outCubic(prog(t, T.lock, T.lock + 0.9));
    rx = lerp(62, rx, e);
    ry = lerp(-40, ry, e);
    rz = lerp(-12, rz, e);
    dy = lerp(1500, dy, ease.outQuart(prog(t, T.lock, T.lock + 0.8)));
    // dérive lente
    const lt = t - T.lock;
    rx += Math.sin(lt * 0.9) * 2;
    ry += Math.sin(lt * 0.7 + 1) * 3;
    dy += Math.sin(lt * 1.3) * 8;
    // sortie vers la caméra
    const o = ease.inCubic(prog(t, T.outro - 0.05, T.outro + 0.45));
    return { rx: rx + o * 25, ry: ry * (1 - o), rz, sc: sc * (1 + o * 0.4), dx, dy: dy - o * 150, z: -o * 1400 * u, alpha: 1 - o };
  }

  // éléments qui sortent de l'écran (cartes en 3D devant le téléphone) : [séquence, carte, x, y, z, apparition]
  function popouts(t) {
    const list = [];
    const add = (cv, x, y, z, t0, t1, sc = 1) => {
      const a = ease.outBack(prog(t, t0, t0 + 0.45), 1.4) * (1 - ease.inCubic(prog(t, t1 - 0.25, t1)));
      if (a > 0.001) list.push({ cv, x, y, z: z * clamp(a, 0, 1.2), a: clamp(a), sc });
    };
    add(pops.notif, 0, -60, -260, T.notif, T.search, 1.05);
    add(pops.area, 120, 160, -300, T.validate + 0.1, T.train, 1);
    add(pops.lang, 105, 230, -300, T.lang + 0.45, T.producer, 1);
    add(pops.kg, -130, -120, -320, T.count1, T.pay, 1);
    add(pops.paid, 110, 180, -340, T.success + 0.1, T.chat, 1);
    add(pops.order, -60, 230, -320, T.order + 0.15, T.dash, 0.95);
    add(pops.growth, 120, -260, -300, T.chart0 + 0.6, T.outro, 1);
    return list;
  }

  // ---------------------------------------------------------------- intro / outro
  function drawGlowBg(c, t, a = 1) {
    c.fillStyle = '#030605';
    c.fillRect(0, 0, W, H);
    for (const [x, y, r, col, sp] of [[0.25, 0.3, 0.55, '140,198,63', 0.3], [0.8, 0.7, 0.6, '77,163,224', 0.4], [0.5, 0.95, 0.5, '140,198,63', 0.2]]) {
      const px = W * x + Math.sin(t * sp) * 60 * u;
      const py = H * y + Math.cos(t * sp * 1.3) * 60 * u;
      const g = c.createRadialGradient(px, py, 0, px, py, Math.max(W, H) * r);
      g.addColorStop(0, `rgba(${col},${0.16 * a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    // particules
    for (let i = 0; i < 70; i++) {
      const x = hash(i * 1.7) * W;
      const y = (hash(i * 3.1) * H - t * (10 + hash(i) * 30) * u) % H;
      c.globalAlpha = 0.25 * hash(i * 7.7) * a;
      c.fillStyle = '#fff';
      c.fillRect(x, y < 0 ? y + H : y, 2 * u, 2 * u);
    }
    c.globalAlpha = 1;
  }

  function drawIntro(c, t) {
    const a = ease.outCubic(prog(t, T.logoIn, T.logoIn + 0.5));
    const out = ease.inCubic(prog(t, T.introOut, T.lock + 0.1));
    const R = lerp(6, 210, ease.outBack(prog(t, T.logoIn, T.logoIn + 0.7), 1.2)) * u * (1 + out * 4);
    c.save();
    c.globalCompositeOperation = 'lighter';
    // anneau lumineux
    for (const [wd, col, al] of [[60, '77,163,224', 0.18], [24, '140,198,63', 0.35], [6, '232,245,154', 0.9]]) {
      c.strokeStyle = `rgba(${col},${al * (1 - out)})`;
      c.lineWidth = wd * u;
      c.filter = `blur(${wd * 0.4 * u}px)`;
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.stroke();
    }
    c.filter = 'none';
    c.restore();
    // point lumineux de départ
    const d = 1 - prog(t, T.logoIn + 0.2, T.logoIn + 0.5);
    if (d > 0) {
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, 40 * u);
      g.addColorStop(0, `rgba(232,245,154,${d})`);
      g.addColorStop(1, 'rgba(140,198,63,0)');
      c.fillStyle = g;
      c.fillRect(cx - 40 * u, cy - 40 * u, 80 * u, 80 * u);
    }
    if (a > 0) {
      const lh = 240 * u * (0.7 + 0.3 * a) * (1 + out * 3);
      const lw = (lh * imgs.logo.width) / imgs.logo.height;
      c.save();
      c.globalAlpha = a * (1 - out);
      c.shadowColor = 'rgba(140,198,63,0.8)';
      c.shadowBlur = 40 * u;
      c.drawImage(imgs.logo, cx - lw / 2, cy - lh / 2, lw, lh);
      c.restore();
    }
  }

  function drawOutro(c, t) {
    const lh = 520 * u;
    const lw = (lh * 802) / 1200;
    const ox = cx - lw / 2;
    const oy = cy - lh / 2 - 120 * u;
    const p = ease.inOutCubic(prog(t, T.trails, T.fill + 0.1));
    const fill = ease.outCubic(prog(t, T.fill, T.fill + 0.6));
    // traînées lumineuses qui dessinent les contours
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const groups = [['globe', '77,163,224'], ['sprout', '140,198,63']];
    for (const [name, col] of groups) {
      const paths = window.LOGO_PATHS[name];
      paths.forEach((pts, pi) => {
        const delay = pi * 0.04 + (name === 'sprout' ? 0.12 : 0);
        const q = clamp((p - delay) / (1 - delay));
        if (q <= 0) return;
        const n = Math.max(2, Math.floor(pts.length * q));
        const head = 0.25; // longueur de la tête lumineuse (fraction)
        for (const [wd, al, bl] of [[14, 0.25, 12], [5, 0.7, 4], [2, 1, 0]]) {
          c.strokeStyle = `rgba(${col},${al * (1 - fill * 0.7)})`;
          c.lineWidth = wd * u;
          c.filter = bl ? `blur(${bl * u}px)` : 'none';
          c.beginPath();
          for (let i = 0; i < n; i++) {
            const [x, y] = pts[i];
            const X = ox + x * lw;
            const Y = oy + y * lh;
            if (i === 0) c.moveTo(X, Y);
            else c.lineTo(X, Y);
          }
          c.stroke();
        }
        // tête blanche
        if (q < 1) {
          const [x, y] = pts[n - 1];
          const g = c.createRadialGradient(ox + x * lw, oy + y * lh, 0, ox + x * lw, oy + y * lh, 26 * u);
          g.addColorStop(0, 'rgba(255,255,255,0.9)');
          g.addColorStop(1, `rgba(${col},0)`);
          c.filter = 'none';
          c.fillStyle = g;
          c.fillRect(ox + x * lw - 26 * u, oy + y * lh - 26 * u, 52 * u, 52 * u);
        }
        void head;
      });
    }
    c.restore();
    c.filter = 'none';
    if (fill > 0) {
      c.save();
      c.globalAlpha = fill;
      c.shadowColor = 'rgba(140,198,63,0.6)';
      c.shadowBlur = 50 * u * (1 - fill * 0.5);
      c.drawImage(imgs.logo, ox, oy, lw, lh);
      c.restore();
    }
    const wa = ease.outCubic(prog(t, T.word, T.word + 0.45));
    if (wa > 0) {
      c.globalAlpha = wa;
      text(c, 'AgroSfer', cx, oy + lh + 110 * u + (1 - wa) * 30 * u, { size: 120 * u, weight: 800, color: '#F4F7F5', align: 'center', tracking: -0.04 });
      c.globalAlpha = 1;
    }
    const ta = ease.outCubic(prog(t, T.tag, T.tag + 0.45));
    if (ta > 0) {
      c.globalAlpha = ta;
      text(c, 'Filières agricoles durables et traçables.', cx, oy + lh + 210 * u, { size: 40 * u, weight: 500, color: 'rgba(244,247,245,0.8)', align: 'center' });
      UI.pill(c, cx, oy + lh + 300 * u, 'agrosfer.co', { size: 30 * u, bg: '#8CC63F', color: '#0B1A08', align: 'center', weight: 700 });
      c.globalAlpha = 1;
    }
  }

  function drawCaption(c, t) {
    const s = sectionAt(t);
    const cap = CAPTIONS[s];
    if (!cap || t >= T.outro) return;
    const a = ease.outCubic(prog(t, T[s] + 0.05, T[s] + 0.4));
    const i = SECTIONS.indexOf(s);
    const nextT = i < SECTIONS.length - 1 ? T[SECTIONS[i + 1]] : T.outro;
    const o = prog(t, nextT - 0.2, nextT);
    const y = 170 * u - (1 - a) * 30 * u;
    c.globalAlpha = a * (1 - o);
    UI.pill(c, cx, y - 78 * u, cap[0], { size: 30 * u, family: 'JetBrains Mono', border: 'rgba(140,198,63,0.8)', color: '#8CC63F', align: 'center', weight: 600 });
    text(c, cap[1], cx, y + 10 * u, { size: 84 * u, weight: 800, color: '#F4F7F5', align: 'center', tracking: -0.04 });
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- scène
  Core.scene({
    duration: DURATION,
    T,
    SFX,
    MUSIC: { score: 'app' },
    shutter: 0.5,
    images: { logo: 'assets/img/logo_color.png', logoWhite: 'assets/img/logo_white.png' },
    fonts: ['800 40px "Inter"', '600 40px "Inter"', '500 20px "JetBrains Mono"'],
    setup(w, h, A) {
      W = w;
      H = h;
      u = Math.min(W, H) / 1080;
      cx = W / 2;
      cy = H / 2;
      imgs = A;
      stage = new Stage3D(W, H, 34);
      phoneCv = canvas((PH.w + PH.bez * 2 + PH.pad * 2) * PH.k, (PH.h + PH.bez * 2 + PH.pad * 2) * PH.k);
      phoneCtx = phoneCv.getContext('2d');
      const mk = (w2, h2, fn) => UI.card(w2, h2, (c) => fn(c, w2, h2), { pad: 30, scale: 2, radius: 20, bg: D.surface, shadowBlur: 40, shadowColor: 'rgba(0,0,0,0.6)' });
      pops = {
        notif: mk(330, 70, (c, a, b2) => UI.notif(c, 0, 0, a, b2, D, { title: 'AgroSfer Survey', sub: 'Nouvelle enquête : Récolte & pesée', icon: 'doc', time: 'maint.' })),
        lang: mk(250, 96, (c) => {
          fillRR(c, 16, 20, 56, 56, 16, D.lemon);
          UI.icon(c, 'chat', 30, 34, 28, '#3A5A12', 2.2);
          text(c, 'En fon', 88, 40, { size: 26, weight: 800, color: D.text });
          text(c, 'vidéo + audio', 88, 68, { size: 14, weight: 500, color: D.muted });
        }),
        area: mk(230, 92, (c) => {
          UI.icon(c, 'pin', 18, 24, 40, D.lemon, 2.2);
          text(c, '2,4 ha', 72, 38, { size: 30, weight: 800, color: D.text });
          text(c, 'cartographiés', 72, 66, { size: 14, weight: 500, color: D.muted });
        }),
        kg: mk(250, 96, (c) => {
          fillRR(c, 16, 20, 56, 56, 16, D.green + '26');
          UI.icon(c, 'check', 30, 34, 28, D.green, 2.8);
          text(c, '850 kg', 88, 40, { size: 30, weight: 800, color: D.text });
          text(c, 'pesée validée', 88, 68, { size: 14, weight: 500, color: D.muted });
        }),
        paid: mk(280, 96, (c) => {
          fillRR(c, 16, 20, 56, 56, 16, D.green);
          UI.icon(c, 'wallet', 30, 34, 28, '#0B1A08', 2.4);
          text(c, '+425 000', 88, 40, { size: 28, weight: 800, color: D.green });
          text(c, 'XOF reçus · Awa K.', 88, 68, { size: 14, weight: 500, color: D.muted });
        }),
        order: mk(270, 96, (c) => {
          fillRR(c, 16, 20, 56, 56, 16, D.lemon);
          UI.icon(c, 'factory', 30, 34, 28, '#3A5A12', 2.2);
          text(c, '12 t vendues', 88, 40, { size: 24, weight: 800, color: D.text });
          text(c, 'lot tracé · avril', 88, 68, { size: 14, weight: 500, color: D.muted });
        }),
        growth: mk(240, 96, (c) => {
          fillRR(c, 16, 20, 56, 56, 16, D.blue + '30');
          UI.icon(c, 'chart', 30, 34, 28, D.blue, 2.4);
          text(c, '96 lots', 88, 40, { size: 28, weight: 800, color: D.text });
          text(c, 'tracés cette saison', 88, 68, { size: 14, weight: 500, color: D.muted });
        }),
      };
    },
    draw(c, t) {
      const bgA = t < T.lock ? ease.inOutCubic(prog(t, T.introOut - 0.2, T.lock + 0.3)) : 1;
      drawGlowBg(c, t, t >= T.outro ? 1 - 0.5 * prog(t, T.outro, T.outro + 0.5) : bgA);
      if (t < T.lock + 0.2) drawIntro(c, t);
      const pose = poseAt(t);
      if (pose && pose.alpha > 0.001) {
        const ver = renderPhone(t);
        stage.clear();
        const sc = pose.sc * (H * 0.66) / (PH.h + PH.bez * 2);
        const pw = (phoneCv.width / PH.k) * sc;
        const ph = (phoneCv.height / PH.k) * sc;
        const px = cx + pose.dx * u;
        const py = cy + 90 * u + pose.dy * u;
        const group = { x: px, y: py, z: pose.z, rx: pose.rx, ry: pose.ry, rz: pose.rz };
        stage.plane(phoneCv, { x: px, y: py, z: pose.z, w: pw, h: ph, alpha: pose.alpha, dynamic: ver + 1, group });
        for (const p of popouts(t)) {
          const k = sc * p.sc;
          stage.plane(p.cv, {
            x: px + p.x * k, y: py + p.y * k, z: pose.z + p.z * u, w: (p.cv.width / p.cv.s) * k, h: (p.cv.height / p.cv.s) * k,
            alpha: p.a * pose.alpha, group,
          });
        }
        c.drawImage(stage.canvas, 0, 0);
      }
      drawCaption(c, t);
      if (t >= T.outro) drawOutro(c, t);
    },
  });
})();
