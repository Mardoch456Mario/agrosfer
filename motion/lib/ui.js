// Composants d'interface AgroSfer dessinés au canvas (maquettes illustratives de la plateforme).
// Chaque composant dessine dans une boîte (x, y, w, h) ; o.p (0..1) anime les éléments quand c'est utile.
(() => {
  const { clamp, lerp, prog, ease, rr, fillRR, text, measure, canvas } = Core;

  const THEMES = {
    light: {
      bg: '#F4F6F5', surface: '#FFFFFF', surface2: '#F3F5F4', text: '#18241D', muted: '#6E7B74', faint: '#A7B1AC',
      border: '#E4E9E6', blue: '#2E73B8', blue2: '#4D8BAE', green: '#6FA83A', green2: '#8CC63F', lemon: '#EEF5C2',
      red: '#E5533D', shadow: 'rgba(20,40,30,0.16)',
    },
    dark: {
      bg: '#0A0E0C', surface: '#141A17', surface2: '#1B2320', text: '#F1F5F2', muted: '#8C9992', faint: '#56625C',
      border: '#25302B', blue: '#4DA3E0', blue2: '#6FB6E6', green: '#8CC63F', green2: '#A6DB55', lemon: '#E8F59A',
      red: '#FF5A4E', shadow: 'rgba(0,0,0,0.5)',
    },
  };
  const F = 'Inter';

  // ---------------------------------------------------------------- icônes (traits)
  function icon(c, name, x, y, s, color, lw = 2) {
    c.save();
    c.translate(x, y);
    c.scale(s / 24, s / 24);
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = (lw * 24) / s;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const P = (d) => c.stroke(new Path2D(d));
    switch (name) {
      case 'leaf': P('M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7'); break;
      case 'check': P('M5 12.5l4.5 4.5L19 7.5'); break;
      case 'pin': P('M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z'); c.beginPath(); c.arc(12, 10, 2.3, 0, 7); c.stroke(); break;
      case 'search': c.beginPath(); c.arc(10.5, 10.5, 6, 0, 7); c.stroke(); P('M15 15l5 5'); break;
      case 'bell': P('M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0'); break;
      case 'wallet': P('M4 7.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a1.5 1.5 0 0 1-1.5-1.5V6.5A1.5 1.5 0 0 1 5 5h11'); P('M16 13.5h.01'); break;
      case 'chart': P('M4 19h16M7 15l3.5-4 3 3L19 7'); break;
      case 'user': c.beginPath(); c.arc(12, 8.5, 3.5, 0, 7); c.stroke(); P('M5 20a7 7 0 0 1 14 0'); break;
      case 'users': c.beginPath(); c.arc(9, 9, 3, 0, 7); c.stroke(); P('M3.5 19a5.5 5.5 0 0 1 11 0M15.5 6.5a3 3 0 0 1 0 5.5M17.5 14.5a5.5 5.5 0 0 1 3 4.5'); break;
      case 'truck': P('M3 6.5h11v9.5H3zM14 10h4l3 3v3h-7'); c.beginPath(); c.arc(7, 17.5, 1.8, 0, 7); c.arc(17, 17.5, 1.8, 0, 7); c.stroke(); break;
      case 'factory': P('M3 20V10l5 3v-3l5 3v-3l5 3V4h3v16z'); break;
      case 'box': P('M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9'); break;
      case 'arrow': P('M5 12h14M13 6l6 6-6 6'); break;
      case 'plus': P('M12 5v14M5 12h14'); break;
      case 'menu': P('M4 7h16M4 12h16M4 17h16'); break;
      case 'grid': [[5, 5], [12, 5], [19, 5], [5, 12], [12, 12], [19, 12], [5, 19], [12, 19], [19, 19]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 1.4, 0, 7); c.fill(); }); break;
      case 'refresh': P('M19 12a7 7 0 1 1-2.1-5M19 4.5V8h-3.5'); break;
      case 'scan': P('M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M7 12h10'); break;
      case 'shield': P('M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z'); P('M9 12l2 2 4-4'); break;
      case 'send': P('M4 12l16-8-6 16-2.5-6.5z'); break;
      case 'heart': P('M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z'); break;
      case 'chat': P('M4 5.5h16v10H9l-5 4z'); break;
      case 'sprout': P('M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z'); break;
      case 'globe': c.beginPath(); c.arc(12, 12, 8, 0, 7); c.stroke(); P('M4 12h16M12 4c2.5 2.5 3.5 5 3.5 8s-1 5.5-3.5 8c-2.5-2.5-3.5-5-3.5-8s1-5.5 3.5-8z'); break;
      case 'camera': P('M4 8h4l1.5-2h5L16 8h4v11H4z'); c.beginPath(); c.arc(12, 13, 3.3, 0, 7); c.stroke(); break;
      case 'calendar': P('M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4'); break;
      case 'doc': P('M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 12h6M9 15.5h6'); break;
      default: break;
    }
    c.restore();
  }

  // ---------------------------------------------------------------- briques
  function pill(c, x, y, label, o = {}) {
    const size = o.size ?? 22;
    const padX = o.padX ?? size * 0.75;
    const h = o.h ?? size * 1.9;
    const w = (o.icon ? h * 0.75 : 0) + measure(c, label, { weight: o.weight ?? 600, size, family: o.family ?? F }) + padX * 2;
    const ax = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    if (o.border) {
      rr(c, ax, y - h / 2, w, h, h / 2);
      c.strokeStyle = o.border;
      c.lineWidth = o.lw ?? 2;
      c.stroke();
    }
    if (o.bg) fillRR(c, ax, y - h / 2, w, h, h / 2, o.bg);
    let tx = ax + padX;
    if (o.icon) {
      icon(c, o.icon, tx - size * 0.15, y - size * 0.55, size * 1.1, o.color ?? '#fff', 2.2);
      tx += h * 0.75;
    }
    text(c, label, tx, y + size * 0.04, { size, weight: o.weight ?? 600, color: o.color ?? '#fff', family: o.family ?? F });
    return w;
  }

  function avatar(c, x, y, r, initials, bg, fg = '#fff') {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = bg;
    c.fill();
    text(c, initials, x, y + r * 0.04, { size: r * 0.8, weight: 700, color: fg, align: 'center' });
  }

  function chip(c, x, y, label, T, kind = 'green', size = 15) {
    const col = { green: T.green, blue: T.blue, red: T.red, muted: T.muted }[kind] || kind;
    const w = measure(c, label, { size, weight: 600 }) + size * 2.1;
    const h = size * 1.75;
    c.globalAlpha *= 0.14;
    fillRR(c, x, y - h / 2, w, h, h / 2, col);
    c.globalAlpha /= 0.14;
    c.beginPath();
    c.arc(x + size * 0.75, y, size * 0.22, 0, 7);
    c.fillStyle = col;
    c.fill();
    text(c, label, x + size * 1.4, y + 1, { size, weight: 600, color: col });
    return w;
  }

  function hline(c, x, y, w, color, lw = 1) {
    c.fillStyle = color;
    c.fillRect(x, y, w, lw);
  }

  // ---------------------------------------------------------------- composants
  // carte "Compte AgroSfer Pay" (d'après la maquette de la plateforme)
  function payCard(c, x, y, w, h, o = {}) {
    const k = w / 420;
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3E86C9');
    g.addColorStop(1, '#2A5FA0');
    fillRR(c, x, y, w, h, 22 * k, g);
    c.save();
    rr(c, x, y, w, h, 22 * k);
    c.clip();
    c.globalAlpha = 0.12;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(x + w * 0.85, y + h * 0.15, w * 0.35, 0, 7);
    c.fill();
    c.beginPath();
    c.arc(x + w * 0.1, y + h * 1.05, w * 0.3, 0, 7);
    c.fill();
    c.restore();
    const v = o.value ?? 2003568;
    text(c, 'Compte AgroSfer Pay', x + 26 * k, y + 34 * k, { size: 17 * k, weight: 500, color: 'rgba(255,255,255,0.85)' });
    icon(c, 'wallet', x + w - 50 * k, y + 20 * k, 26 * k, 'rgba(255,255,255,0.9)', 2);
    text(c, 'Solde de compte', x + 26 * k, y + 82 * k, { size: 15 * k, weight: 500, color: 'rgba(255,255,255,0.75)' });
    text(c, `${fmt(v)} XOF`, x + 26 * k, y + 118 * k, { size: 38 * k, weight: 800, color: '#fff', tracking: -0.02 });
    text(c, 'Dernier crédit', x + 26 * k, y + h - 52 * k, { size: 13 * k, weight: 500, color: 'rgba(255,255,255,0.7)' });
    text(c, `+ ${fmt(o.credit ?? 568569)} XOF`, x + 26 * k, y + h - 28 * k, { size: 17 * k, weight: 700, color: '#fff' });
    text(c, 'Dernier débit', x + w - 26 * k, y + h - 52 * k, { size: 13 * k, weight: 500, color: 'rgba(255,255,255,0.7)', align: 'right' });
    text(c, `- ${fmt(o.debit ?? 136201)} XOF`, x + w - 26 * k, y + h - 28 * k, { size: 17 * k, weight: 700, color: '#fff', align: 'right' });
  }

  function fmt(v) {
    return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // liste d'enquêtes terrain (application mobile)
  function surveys(c, x, y, w, h, T, o = {}) {
    const k = w / 380;
    fillRR(c, x, y, w, h, 18 * k, T.surface);
    text(c, 'Enquêtes', x + 22 * k, y + 36 * k, { size: 22 * k, weight: 700, color: T.text });
    text(c, 'Actualiser', x + w - 22 * k, y + 36 * k, { size: 14 * k, weight: 600, color: T.blue, align: 'right' });
    rr(c, x + 18 * k, y + 62 * k, w - 36 * k, 40 * k, 12 * k);
    c.strokeStyle = T.border;
    c.lineWidth = 1.5 * k;
    c.stroke();
    icon(c, 'search', x + 30 * k, y + 72 * k, 20 * k, T.faint);
    text(c, o.query ?? 'Chercher', x + 60 * k, y + 82 * k, { size: 15 * k, weight: 500, color: o.query ? T.text : T.faint });
    const rows = o.rows ?? [
      ['ENTRETIEN DES PLANTS', '12 mars 2026 · 14:00', 24],
      ['INSTALLATION DES PLANTS', '10 mars 2026 · 09:30', 18],
      ['GROUPE COOPÉRATIF', '08 mars 2026 · 16:15', 41],
      ['RÉCOLTE & PESÉE', '05 mars 2026 · 08:00', 63],
    ];
    const rh = 74 * k;
    rows.forEach(([title, date, n], i) => {
      const a = ease.outCubic(prog(o.p ?? 1, i * 0.12, i * 0.12 + 0.4));
      if (a <= 0) return;
      const ry = y + 120 * k + i * (rh + 10 * k) + (1 - a) * 20 * k;
      c.globalAlpha = a;
      fillRR(c, x + 18 * k, ry, w - 36 * k, rh, 14 * k, T.surface2);
      text(c, title, x + 34 * k, ry + 28 * k, { size: 14.5 * k, weight: 700, color: T.text });
      text(c, date, x + 34 * k, ry + 52 * k, { size: 12.5 * k, weight: 500, color: T.green });
      const cnt = Math.round(n * clamp((o.count ?? 1)));
      text(c, String(cnt), x + w - 40 * k, ry + 30 * k, { size: 20 * k, weight: 700, color: T.blue, align: 'right' });
      text(c, 'réponses', x + w - 40 * k, ry + 52 * k, { size: 11 * k, weight: 500, color: T.muted, align: 'right' });
      c.globalAlpha = 1;
    });
  }

  // graphique de flux (envoyé / reçu)
  function chart(c, x, y, w, h, T, o = {}) {
    const k = w / 420;
    fillRR(c, x, y, w, h, 18 * k, T.surface);
    text(c, o.title ?? 'Volumes collectés', x + 22 * k, y + 34 * k, { size: 19 * k, weight: 700, color: T.text });
    let px = x + 22 * k;
    ['Cacao', 'Anacarde', 'Soja'].forEach((lab, i) => {
      const pw = measure(c, lab, { size: 13 * k, weight: 600 }) + 24 * k;
      fillRR(c, px, y + 52 * k, pw, 28 * k, 14 * k, i === 0 ? T.lemon : T.surface2);
      text(c, lab, px + 12 * k, y + 67 * k, { size: 13 * k, weight: 600, color: i === 0 ? '#3A5A12' : T.muted });
      px += pw + 8 * k;
    });
    const gx = x + 56 * k;
    const gy = y + 100 * k;
    const gw = w - 78 * k;
    const gh = h - 140 * k;
    ['500 t', '375 t', '250 t', '125 t', '0'].forEach((lab, i) => {
      const ly = gy + (gh * i) / 4;
      hline(c, gx, ly, gw, T.border, 1 * k);
      text(c, lab, gx - 10 * k, ly, { size: 11 * k, weight: 500, color: T.faint, align: 'right' });
    });
    ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'].forEach((lab, i) => {
      text(c, lab, gx + (gw * i) / 5, gy + gh + 20 * k, { size: 11 * k, weight: 500, color: T.faint, align: 'center' });
    });
    const data = o.data ?? [0.18, 0.32, 0.3, 0.52, 0.61, 0.84];
    const p = o.p ?? 1;
    const pts = data.map((v, i) => [gx + (gw * i) / (data.length - 1), gy + gh * (1 - v)]);
    c.save();
    c.beginPath();
    c.rect(gx - 4, y, gw * p + 8, h);
    c.clip();
    const grd = c.createLinearGradient(0, gy, 0, gy + gh);
    grd.addColorStop(0, T.green + '55');
    grd.addColorStop(1, T.green + '00');
    c.beginPath();
    c.moveTo(pts[0][0], gy + gh);
    curve(c, pts, true);
    c.lineTo(pts[pts.length - 1][0], gy + gh);
    c.closePath();
    c.fillStyle = grd;
    c.fill();
    c.beginPath();
    c.moveTo(...pts[0]);
    curve(c, pts, false);
    c.strokeStyle = T.green;
    c.lineWidth = 3.5 * k;
    c.stroke();
    c.restore();
    const li = Math.min(pts.length - 1, Math.floor(p * (pts.length - 1) + 1e-6));
    if (p > 0.02) {
      const [qx, qy] = pts[li];
      c.beginPath();
      c.arc(qx, qy, 6 * k, 0, 7);
      c.fillStyle = T.surface;
      c.fill();
      c.lineWidth = 3 * k;
      c.strokeStyle = T.green;
      c.stroke();
    }
  }

  function curve(c, pts, cont) {
    if (!cont) c.moveTo(...pts[0]);
    else c.lineTo(...pts[0]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const mx = (x0 + x1) / 2;
      c.bezierCurveTo(mx, y0, mx, y1, x1, y1);
    }
  }

  // fiche producteur
  function producer(c, x, y, w, h, T, o = {}) {
    const k = w / 400;
    fillRR(c, x, y, w, h, 20 * k, T.surface);
    avatar(c, x + 52 * k, y + 56 * k, 30 * k, o.initials ?? 'AK', o.avatarBg ?? T.green);
    text(c, o.name ?? 'Awa Koné', x + 96 * k, y + 44 * k, { size: 21 * k, weight: 700, color: T.text });
    text(c, o.sub ?? 'Coopérative Agri-Lagunes', x + 96 * k, y + 70 * k, { size: 14 * k, weight: 500, color: T.muted });
    icon(c, 'shield', x + w - 50 * k, y + 32 * k, 26 * k, T.green, 2);
    let cx = x + 22 * k;
    for (const [lab, kind] of o.tags ?? [['Cacao', 'green'], ['2,4 ha', 'blue'], ['Certifiée', 'green']]) {
      cx += chip(c, cx, y + 118 * k, lab, T, kind, 14 * k) + 8 * k;
    }
    hline(c, x + 22 * k, y + 148 * k, w - 44 * k, T.border, 1.2 * k);
    const stats = o.stats ?? [['3', 'Parcelles'], ['12', 'Livraisons'], ['850 kg', 'Dernière pesée']];
    stats.forEach(([v, lab], i) => {
      const sx = x + 22 * k + (i * (w - 44 * k)) / stats.length;
      text(c, v, sx, y + 182 * k, { size: 22 * k, weight: 800, color: T.text });
      text(c, lab, sx, y + 208 * k, { size: 12.5 * k, weight: 500, color: T.muted });
    });
  }

  // carte de parcelle (cartographie GPS)
  function map(c, x, y, w, h, T, o = {}) {
    const k = w / 420;
    c.save();
    rr(c, x, y, w, h, 18 * k);
    c.clip();
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#5E7F3A');
    g.addColorStop(1, '#3D5A2A');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    // champs voisins
    const r = Core.rng(o.seed ?? 4);
    for (let i = 0; i < 26; i++) {
      const fx = x + r() * w;
      const fy = y + r() * h;
      c.save();
      c.translate(fx, fy);
      c.rotate(r() * 0.6 - 0.3);
      c.fillStyle = ['#6E8F45', '#7C9A50', '#55733A', '#8BA65C', '#4E6B33'][i % 5];
      c.globalAlpha = 0.85;
      c.fillRect(-r() * 80 * k, -r() * 60 * k, (40 + r() * 90) * k, (30 + r() * 70) * k);
      c.restore();
    }
    c.globalAlpha = 0.25;
    c.strokeStyle = '#D9C9A0';
    c.lineWidth = 6 * k;
    c.beginPath();
    c.moveTo(x - 10, y + h * 0.75);
    c.bezierCurveTo(x + w * 0.3, y + h * 0.6, x + w * 0.6, y + h * 0.95, x + w + 10, y + h * 0.7);
    c.stroke();
    c.globalAlpha = 1;
    // parcelle tracée
    const poly = (o.poly ?? [[0.3, 0.3], [0.62, 0.22], [0.74, 0.52], [0.55, 0.72], [0.28, 0.6]]).map(([a, b]) => [x + a * w, y + b * h]);
    const p = o.p ?? 1;
    const per = poly.length;
    const seg = p * per;
    c.beginPath();
    c.moveTo(...poly[0]);
    for (let i = 1; i <= Math.min(per, Math.floor(seg)); i++) c.lineTo(...poly[i % per]);
    const fi = Math.floor(seg);
    if (fi < per) {
      const a = poly[fi % per];
      const b = poly[(fi + 1) % per];
      c.lineTo(lerp(a[0], b[0], seg - fi), lerp(a[1], b[1], seg - fi));
    }
    if (p >= 1) {
      c.closePath();
      c.fillStyle = 'rgba(232,245,154,0.28)';
      c.fill();
    }
    c.strokeStyle = '#E8F59A';
    c.lineWidth = 3.5 * k;
    c.stroke();
    poly.forEach(([px, py], i) => {
      if (i > seg) return;
      c.beginPath();
      c.arc(px, py, 6 * k, 0, 7);
      c.fillStyle = '#fff';
      c.fill();
    });
    c.restore();
    // étiquette
    const lab = o.label ?? 'Parcelle A-128 · 2,4 ha';
    const lw = measure(c, lab, { size: 14 * k, weight: 700 }) + 50 * k;
    fillRR(c, x + 16 * k, y + h - 54 * k, lw, 38 * k, 19 * k, 'rgba(10,16,12,0.78)');
    icon(c, 'pin', x + 26 * k, y + h - 45 * k, 20 * k, '#E8F59A', 2.2);
    text(c, lab, x + 50 * k, y + h - 34 * k, { size: 14 * k, weight: 700, color: '#fff' });
  }

  // traçabilité d'un lot
  function trace(c, x, y, w, h, T, o = {}) {
    const k = w / 400;
    fillRR(c, x, y, w, h, 20 * k, T.surface);
    text(c, 'Traçabilité', x + 24 * k, y + 36 * k, { size: 20 * k, weight: 700, color: T.text });
    text(c, o.lot ?? 'Lot CI-2026-0412', x + w - 24 * k, y + 36 * k, { size: 13 * k, weight: 600, color: T.muted, align: 'right' });
    const steps = o.steps ?? [
      ['sprout', 'Récolte', 'Parcelle A-128 · 12 mars'],
      ['box', 'Collecte coopérative', '850 kg · pesée validée'],
      ['truck', 'Transport', 'Daloa → San-Pédro'],
      ['factory', 'Réception usine', 'Qualité conforme'],
    ];
    const sy = y + 78 * k;
    const sh = (h - 100 * k) / steps.length;
    const p = o.p ?? 1;
    steps.forEach(([ic, a, b], i) => {
      const yy = sy + i * sh;
      const done = p * steps.length - i;
      const on = clamp(done);
      if (i < steps.length - 1) {
        c.fillStyle = T.border;
        c.fillRect(x + 42.5 * k, yy + 24 * k, 3 * k, sh - 4 * k);
        c.fillStyle = T.green;
        c.fillRect(x + 42.5 * k, yy + 24 * k, 3 * k, (sh - 4 * k) * clamp(done - 0.5));
      }
      c.beginPath();
      c.arc(x + 44 * k, yy + 2 * k, 19 * k, 0, 7);
      c.fillStyle = on > 0.5 ? T.green : T.surface2;
      c.fill();
      icon(c, on > 0.5 ? 'check' : ic, x + 34 * k, yy - 8 * k, 20 * k, on > 0.5 ? '#fff' : T.muted, 2.4);
      text(c, a, x + 78 * k, yy - 7 * k, { size: 16 * k, weight: 700, color: T.text });
      text(c, b, x + 78 * k, yy + 15 * k, { size: 12.5 * k, weight: 500, color: T.muted });
    });
  }

  // commande d'un industriel
  function order(c, x, y, w, h, T, o = {}) {
    const k = w / 400;
    fillRR(c, x, y, w, h, 20 * k, T.surface);
    fillRR(c, x + 20 * k, y + 20 * k, 52 * k, 52 * k, 14 * k, T.lemon);
    icon(c, 'factory', x + 32 * k, y + 32 * k, 28 * k, '#3A5A12', 2);
    text(c, o.title ?? 'Nouvelle commande', x + 88 * k, y + 36 * k, { size: 18 * k, weight: 700, color: T.text });
    text(c, o.sub ?? 'Industriel · Abidjan', x + 88 * k, y + 60 * k, { size: 13 * k, weight: 500, color: T.muted });
    hline(c, x + 20 * k, y + 92 * k, w - 40 * k, T.border, 1.2 * k);
    const rows = o.rows ?? [['Produit', 'Cacao fèves'], ['Volume', '12 t'], ['Livraison', 'Avril 2026']];
    rows.forEach(([a, b], i) => {
      text(c, a, x + 22 * k, y + 116 * k + i * 28 * k, { size: 14 * k, weight: 500, color: T.muted });
      text(c, b, x + w - 22 * k, y + 116 * k + i * 28 * k, { size: 14 * k, weight: 700, color: T.text, align: 'right' });
    });
    const st = o.status ?? 'Confirmée';
    chip(c, x + 20 * k, y + Math.max(h - 30 * k, 206 * k), st, T, 'green', 14 * k);
  }

  // tuiles de chiffres
  function kpis(c, x, y, w, h, T, o = {}) {
    const items = o.items ?? [['users', '1 250', 'Producteurs'], ['pin', '2 380', 'Parcelles'], ['box', '316', 'Lots tracés']];
    const gap = w * 0.03;
    const tw = (w - gap * (items.length - 1)) / items.length;
    const k = tw / 200;
    items.forEach(([ic, v, lab], i) => {
      const tx = x + i * (tw + gap);
      fillRR(c, tx, y, tw, h, 18 * k, T.surface);
      fillRR(c, tx + 18 * k, y + 18 * k, 40 * k, 40 * k, 12 * k, i === 1 ? T.blue + '22' : T.green + '22');
      icon(c, ic, tx + 26 * k, y + 26 * k, 24 * k, i === 1 ? T.blue : T.green, 2.2);
      const val = o.p == null ? v : countUp(v, o.p);
      text(c, val, tx + 18 * k, y + h - 46 * k, { size: 30 * k, weight: 800, color: T.text, tracking: -0.02 });
      text(c, lab, tx + 18 * k, y + h - 18 * k, { size: 13 * k, weight: 500, color: T.muted });
    });
  }

  function countUp(v, p) {
    const n = parseInt(v.replace(/\D/g, ''), 10);
    const cur = Math.round(n * ease.outCubic(clamp(p)));
    return cur.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // constructeur de formulaire (vue ordinateur)
  function builder(c, x, y, w, h, T, o = {}) {
    const k = w / 760;
    fillRR(c, x, y, w, h, 16 * k, T.surface);
    fillRR(c, x, y, w, 46 * k, 0, '#3C4248');
    c.save();
    rr(c, x, y, w, h, 16 * k);
    c.clip();
    c.fillStyle = '#3C4248';
    c.fillRect(x, y, w, 46 * k);
    c.restore();
    icon(c, 'menu', x + 16 * k, y + 11 * k, 24 * k, '#fff');
    text(c, 'AgroSfer', x + 52 * k, y + 24 * k, { size: 16 * k, weight: 800, color: '#fff' });
    text(c, 'ENQUÊTES', x + 24 * k, y + 76 * k, { size: 14 * k, weight: 800, color: T.text, tracking: 0.04 });
    text(c, 'Types de question', x + 24 * k, y + 108 * k, { size: 12 * k, weight: 700, color: T.muted });
    const types = [['doc', 'Texte'], ['grid', 'Choix'], ['calendar', 'Date'], ['camera', 'Photo'], ['pin', 'GPS'], ['chart', 'Nombre'], ['check', 'Case'], ['user', 'Signature'], ['scan', 'QR code']];
    const cw = 78 * k;
    types.forEach(([ic, lab], i) => {
      const cx = x + 24 * k + (i % 3) * (cw + 8 * k);
      const cy = y + 122 * k + Math.floor(i / 3) * (70 * k);
      fillRR(c, cx, cy, cw, 62 * k, 10 * k, T.surface2);
      icon(c, ic, cx + cw / 2 - 11 * k, cy + 10 * k, 22 * k, T.muted, 2);
      text(c, lab, cx + cw / 2, cy + 47 * k, { size: 11 * k, weight: 600, color: T.muted, align: 'center' });
    });
    const qx = x + 300 * k;
    text(c, 'Récolte & pesée', qx, y + 76 * k, { size: 14 * k, weight: 700, color: T.green });
    const qs = ['Q1  Parcelle', 'Q2  Producteur', 'Q3  Date de récolte', 'Q4  Poids (kg)', 'Q5  Photo du lot'];
    qs.forEach((q, i) => {
      const a = ease.outCubic(prog(o.p ?? 1, i * 0.15, i * 0.15 + 0.35));
      if (a <= 0) return;
      const qy = y + 100 * k + i * 62 * k;
      c.globalAlpha = a;
      rr(c, qx + (1 - a) * 30 * k, qy, w - 330 * k, 52 * k, 10 * k);
      c.fillStyle = T.surface;
      c.fill();
      c.strokeStyle = T.border;
      c.lineWidth = 1.5 * k;
      c.stroke();
      text(c, q, qx + 16 * k + (1 - a) * 30 * k, qy + 18 * k, { size: 12.5 * k, weight: 600, color: T.text });
      fillRR(c, qx + 16 * k + (1 - a) * 30 * k, qy + 30 * k, w - 380 * k, 12 * k, 6 * k, T.surface2);
      c.globalAlpha = 1;
    });
  }

  // notification
  function notif(c, x, y, w, h, T, o = {}) {
    const k = h / 76;
    fillRR(c, x, y, w, h, 18 * k, T.surface);
    fillRR(c, x + 14 * k, y + 14 * k, 48 * k, 48 * k, 14 * k, (o.color ?? T.green) + '22');
    icon(c, o.icon ?? 'bell', x + 26 * k, y + 26 * k, 24 * k, o.color ?? T.green, 2.2);
    text(c, o.title ?? 'Nouvelle collecte', x + 76 * k, y + 29 * k, { size: 16 * k, weight: 700, color: T.text });
    text(c, o.sub ?? '850 kg · Coopérative Agri-Lagunes', x + 76 * k, y + 52 * k, { size: 13 * k, weight: 500, color: T.muted });
    if (o.time) text(c, o.time, x + w - 16 * k, y + 29 * k, { size: 12 * k, weight: 500, color: T.faint, align: 'right' });
  }

  // barre de recherche (navigateur)
  function searchBar(c, x, y, w, h, T, o = {}) {
    const k = h / 64;
    fillRR(c, x, y, w, h, h / 2, T.surface);
    if (o.border) {
      rr(c, x, y, w, h, h / 2);
      c.strokeStyle = o.border;
      c.lineWidth = 2 * k;
      c.stroke();
    }
    icon(c, 'search', x + 22 * k, y + h / 2 - 13 * k, 26 * k, T.muted, 2.2);
    const str = o.text ?? '';
    text(c, str || o.placeholder || '', x + 64 * k, y + h / 2, { size: 24 * k, weight: 500, color: str ? T.text : T.faint });
    if (o.caret) {
      const cw = measure(c, str, { size: 24 * k, weight: 500 });
      c.fillStyle = T.blue;
      c.fillRect(x + 66 * k + cw, y + h / 2 - 15 * k, 2.5 * k, 30 * k);
    }
  }

  // page d'accueil du site (héro)
  function landing(c, x, y, w, h, T, o = {}) {
    const k = w / 1200;
    fillRR(c, x, y, w, h, 18 * k, T.surface);
    c.save();
    rr(c, x, y, w, h, 18 * k);
    c.clip();
    // fond doux
    const g = c.createRadialGradient(x + w * 0.85, y + h * 0.1, 10, x + w * 0.85, y + h * 0.1, w * 0.6);
    g.addColorStop(0, T.lemon);
    g.addColorStop(1, T.surface + '00');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    // barre de navigation
    if (o.logo) c.drawImage(o.logo, x + 40 * k, y + 22 * k, 36 * k * (o.logo.width / o.logo.height), 36 * k);
    text(c, 'AgroSfer', x + 92 * k, y + 41 * k, { size: 22 * k, weight: 800, color: T.text });
    ['Accueil', "L'entreprise", 'Solutions', 'Blog', 'Contacts'].forEach((lab, i) => {
      text(c, lab, x + 420 * k + i * 118 * k, y + 41 * k, { size: 15 * k, weight: 600, color: T.muted });
    });
    fillRR(c, x + w - 250 * k, y + 20 * k, 210 * k, 42 * k, 21 * k, T.green);
    text(c, 'Accéder à la plateforme', x + w - 145 * k, y + 41 * k, { size: 13 * k, weight: 700, color: '#fff', align: 'center' });
    // titre
    const lines = o.lines ?? ["Construire des filières", "d'approvisionnement", 'durables et traçables'];
    lines.forEach((ln, i) => {
      text(c, ln, x + 70 * k, y + 190 * k + i * 72 * k, { size: 60 * k, weight: 800, color: i === 2 ? T.green : T.text, tracking: -0.03 });
    });
    text(c, 'Nous optimisons vos processus d’approvisionnement', x + 72 * k, y + 420 * k, { size: 19 * k, weight: 500, color: T.muted });
    text(c, 'et garantissons une traçabilité complète de vos produits.', x + 72 * k, y + 448 * k, { size: 19 * k, weight: 500, color: T.muted });
    const press = o.press ?? 0;
    const bs = 1 - 0.06 * press;
    c.save();
    c.translate(x + 72 * k + 130 * k, y + 525 * k);
    c.scale(bs, bs);
    fillRR(c, -130 * k, -30 * k, 260 * k, 60 * k, 30 * k, o.btnColor ?? T.blue);
    text(c, 'Demander une démo', 0, 1, { size: 18 * k, weight: 700, color: '#fff', align: 'center' });
    c.restore();
    // maquettes à droite
    if (o.side !== false) {
      payCard(c, x + 720 * k, y + 150 * k, 400 * k, 230 * k, { value: o.value });
      surveys(c, x + 860 * k, y + 330 * k, 300 * k, 420 * k, T, { p: 1 });
    }
    c.restore();
  }

  // bulle de conversation
  function bubble(c, x, y, str, T, o = {}) {
    const size = o.size ?? 22;
    const pad = size * 0.75;
    const w = measure(c, str, { size, weight: 600 }) + pad * 2;
    const h = size * 2.1;
    const ax = o.right ? x - w : x;
    fillRR(c, ax, y, w, h, h / 2, o.bg ?? (o.right ? T.green : T.surface2));
    text(c, str, ax + pad, y + h / 2 + 1, { size, weight: 600, color: o.color ?? (o.right ? '#0B1A08' : T.text) });
    return { w, h };
  }

  // carte avec ombre portée, dessinée dans un canvas avec marge (pour la 3D ou le 2D)
  function card(w, h, draw, o = {}) {
    const s = o.scale ?? 1.5;
    const pad = o.pad ?? 40;
    const cv = canvas((w + pad * 2) * s, (h + pad * 2) * s);
    const c = cv.getContext('2d');
    c.scale(s, s);
    if (o.shadow !== false) {
      c.save();
      c.shadowColor = o.shadowColor ?? 'rgba(0,0,0,0.35)';
      c.shadowBlur = o.shadowBlur ?? 30;
      c.shadowOffsetY = o.shadowY ?? 12;
      fillRR(c, pad, pad, w, h, o.radius ?? 20, o.bg ?? '#fff');
      c.restore();
    }
    c.save();
    c.translate(pad, pad);
    draw(c, w, h);
    c.restore();
    cv.pad = pad;
    cv.cw = w;
    cv.ch = h;
    cv.s = s;
    return cv;
  }

  window.UI = { THEMES, icon, pill, avatar, chip, payCard, surveys, chart, producer, map, trace, order, kpis, builder, notif, searchBar, landing, bubble, card, fmt };
})();
