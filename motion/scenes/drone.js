// AgroSfer — logo motion (DA : objet noir assemblé, faisceau de lumière qui révèle le logo, volets typographiques).
// Tout est fonction du temps t (secondes) : renderFrame(t) est déterministe, ce qui permet un rendu image par image.
(() => {
  const DURATION = 10;

  const COL = {
    bg: '#FBFBF7',
    ink: '#14251C', // drone + volet sombre (noir teinté vert)
    beam: '#F2F5C6', // lumière jaune pâle
    cream: '#EEF2C8', // titre sur volet sombre
    tag: '#1F4E37', // tagline sur volet clair
    url: '#4E7F27',
  };

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const rad = (d) => (d * Math.PI) / 180;
  const ease = {
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - (1 - x) ** 3,
    outQuad: (x) => 1 - (1 - x) ** 2,
    inOutCubic: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
    inOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2),
    outBack: (x, s = 1.70158) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
    inOutBack: (x, s = 1.2) => {
      const c = s * 1.525;
      return x < 0.5
        ? ((2 * x) ** 2 * ((c + 1) * 2 * x - c)) / 2
        : ((2 * x - 2) ** 2 * ((c + 1) * (x * 2 - 2) + c) + 2) / 2;
    },
  };

  // ---------- timeline (s) ----------
  const T = {
    land: 0.9, // le corps du drone touche le sol
    armIn: 0.95, // le bras-rotors tombe
    armHover: 1.48,
    armSnapStart: 1.92,
    snap: 2.0, // bras emboîté
    liftStart: 2.12,
    beamOn: 2.46, // la lumière s'allume
    absorb: 5.45, // le logo est aspiré dans l'objectif
    absorbEnd: 5.78,
    toRight: 5.85,
    atRight: 6.25,
    pull: 6.38, // le drone tire le volet sombre
    pullEnd: 7.05,
    dropStart: 7.55, // le volet clair tombe
    dropEnd: 8.05,
    endCard: 8.35,
  };

  // déplacements autour du logo : [début, fin, angle en degrés (90 = au-dessus)]
  const ORBIT = [
    [2.95, 3.22, 180],
    [3.36, 3.58, 138],
    [3.68, 3.94, 40],
    [4.04, 4.27, -6],
    [4.42, 4.74, 128],
    [4.84, 5.1, 180],
  ];

  // événements sonores (lus par le script audio)
  const SFX = [
    { t: 0.02, type: 'whoosh', dur: 0.45, f0: 500, f1: 1800, gain: 0.55 },
    { t: 0.08, type: 'flutter', dur: 0.8, rate: 9, gain: 0.45 },
    { t: T.land, type: 'thud', gain: 1.0 },
    { t: T.land + 0.11, type: 'tick', f: 1600, gain: 0.25 },
    { t: T.armIn, type: 'whoosh', dur: 0.5, f0: 2200, f1: 700, gain: 0.45 },
    { t: T.armIn + 0.05, type: 'flutter', dur: 0.5, rate: 15, gain: 0.35 },
    { t: T.armHover - 0.02, type: 'tick', gain: 0.35 },
    { t: T.snap, type: 'clack', gain: 1.0 },
    { t: T.snap + 0.02, type: 'spinup', gain: 0.55 },
    { t: T.liftStart, type: 'whoosh', dur: 0.32, f0: 400, f1: 2600, gain: 0.6 },
    { t: T.liftStart + 0.04, type: 'pop', f0: 380, f1: 900, gain: 0.5 },
    { t: T.beamOn, type: 'lightOn', gain: 1.0 },
    { t: T.beamOn + 0.08, type: 'grow', gain: 0.5 },
    { t: T.beamOn + 0.3, type: 'sparkle', gain: 0.5 },
    ...ORBIT.map(([a, b], i) => ({ t: a - 0.02, type: 'whoosh', dur: (b - a) + 0.14, f0: 700 + i * 90, f1: 2400 - i * 120, gain: 0.55 })),
    ...ORBIT.map(([a, b], i) => ({ t: a + 0.02, type: 'doppler', dur: b - a + 0.1, f: 170 + i * 12, gain: 0.35 })),
    // bip de "scan" à chaque arrêt du drone (donnée tracée)
    ...ORBIT.map(([, b], i) => ({ t: b + 0.02, type: 'beep', f: 1900 + (i % 3) * 260, n: i % 2 ? 2 : 1, gain: 0.4 })),
    { t: T.absorb, type: 'suck', dur: T.absorbEnd - T.absorb, gain: 0.75 },
    { t: T.absorbEnd - 0.03, type: 'pop', f0: 900, f1: 260, gain: 0.65 },
    { t: T.absorbEnd + 0.08, type: 'beep', f: 2600, n: 3, gap: 0.06, gain: 0.4 },
    { t: T.toRight, type: 'whoosh', dur: 0.42, f0: 600, f1: 2000, gain: 0.55 },
    { t: T.toRight + 0.03, type: 'doppler', dur: 0.4, f: 190, gain: 0.35 },
    { t: T.pull - 0.05, type: 'whoosh', dur: 0.75, f0: 300, f1: 1400, gain: 0.9 },
    { t: T.pull + 0.25, type: 'swish', dur: 0.3, gain: 0.45 },
    { t: T.pullEnd - 0.04, type: 'thud', gain: 0.7 },
    { t: T.pullEnd, type: 'sparkle', gain: 0.45 },
    { t: T.dropStart - 0.04, type: 'whoosh', dur: 0.55, f0: 1600, f1: 350, gain: 0.75 },
    { t: T.dropEnd - 0.03, type: 'thud', gain: 0.6 },
    { t: T.endCard + 0.1, type: 'pop', f0: 420, f1: 1000, gain: 0.5 },
    { t: T.endCard + 0.12, type: 'chime', gain: 0.9 },
    { t: T.endCard + 0.4, type: 'swish', dur: 0.25, gain: 0.3 },
  ];

  // ---------- state ----------
  let W, H, L, canvas, ctx, sceneCv, sceneCtx;
  const img = {};

  function layout(w, h) {
    const u = Math.min(w, h) / 1080;
    const portrait = h > w;
    return {
      u,
      portrait,
      cx: w / 2,
      cy: h / 2,
      logoH: (portrait ? 600 : 500) * u,
      groundY: h / 2 + (portrait ? 380 : 230) * u,
      Rx: (portrait ? 372 : 640) * u,
      Ry: (portrait ? 600 : 380) * u,
      beamHW: (portrait ? 380 : 330) * u,
    };
  }

  // ---------- drone geometry (unités u, origine = centre du corps) ----------
  const G = {
    bodyW: 150,
    bodyH: 74,
    bodyR: 22,
    armHalf: 150,
    armT: 15,
    motorX: 138,
    bladeL: 124,
    domeR: 29,
  };

  // rotation cumulée des hélices (rampe de 0,25 s après l'emboîtement)
  function rotor(t) {
    const tau = t - T.snap;
    if (tau <= 0) return { angle: 0.7, spin: 0 };
    const ramp = 0.25;
    const w = 78;
    const F = tau < ramp ? (tau * tau) / (2 * ramp) : ramp / 2 + (tau - ramp);
    return { angle: 0.7 + w * F, spin: clamp(tau / ramp) };
  }

  // corps lancé depuis le bas, qui tourne, retombe et rebondit
  function tossBody(t) {
    const u = L.u;
    const y0 = H + 140 * u;
    const yA = L.cy - (L.portrait ? 380 : 300) * u;
    const yL = L.groundY;
    if (t < T.land) {
      const s = clamp(t / T.land);
      const D = y0 - yA;
      const Q = yL - y0;
      const b = -2 * (D + Math.sqrt(D * (D + Q)));
      const a = Q - b;
      const y = y0 + b * s + a * s * s;
      const x = lerp(L.cx - 300 * u, L.cx, ease.outQuad(s));
      const rot = rad(-470) * (1 - ease.outQuad(s));
      // pseudo 3D : le corps "bascule" en profondeur
      const flip = Math.cos(rad(540) * (1 - ease.outCubic(s)));
      return { x, y, rot, sx: 1, sy: flip, pivot: 0 };
    }
    // écrasement à l'atterrissage + amorti
    const k = t - T.land;
    const sq = 0.2 * Math.exp(-9 * k) * Math.cos(2 * Math.PI * 4.2 * k);
    return { x: L.cx, y: yL, rot: 0, sx: 1 + sq * 0.7, sy: 1 - sq, pivot: G.bodyH / 2 };
  }

  function armFall(t) {
    const u = L.u;
    const attachedY = -(G.bodyH / 2 + G.armT / 2);
    const hoverY = L.groundY + attachedY * u - 118 * u;
    if (t < T.armHover) {
      const p = prog(t, T.armIn, T.armHover);
      const y = lerp(-160 * u, hoverY, ease.outBack(p, 1.3));
      const x = lerp(L.cx + 140 * u, L.cx, ease.outCubic(p));
      const rot = rad(-610) * (1 - ease.outCubic(p));
      const flip = Math.cos(rad(720) * (1 - ease.outCubic(p)));
      return { x, y, rot, flip };
    }
    if (t < T.armSnapStart) {
      const k = t - T.armHover;
      const p = prog(t, T.armHover, T.armSnapStart);
      const y = hoverY + 26 * u * ease.inOutCubic(p) + 4 * u * Math.sin(k * 14);
      const rot = rad(7) * Math.sin(2 * Math.PI * 2.4 * k) * Math.exp(-3.5 * k);
      return { x: L.cx, y, rot, flip: 1 };
    }
    const p = prog(t, T.armSnapStart, T.snap);
    const y = lerp(hoverY + 26 * u, L.groundY + attachedY * u, ease.inCubic(p));
    return { x: L.cx, y, rot: 0, flip: 1 };
  }

  function orbitAngle(t) {
    let th = 90;
    for (const [a, b, to] of ORBIT) {
      if (t < a) return th;
      if (t < b) return lerp(th, to, ease.inOutBack(prog(t, a, b), 0.9));
      th = to;
    }
    return th;
  }

  function rightX() {
    return W - (G.armHalf + 14) * L.u;
  }

  // position de base du drone en vol (sans le flottement)
  function flightBase(t) {
    const u = L.u;
    const topY = L.cy - L.Ry;
    if (t < T.liftStart) return { x: L.cx, y: L.groundY };
    if (t < T.beamOn) {
      const p = prog(t, T.liftStart, T.beamOn);
      return { x: L.cx, y: lerp(L.groundY, topY, ease.outBack(ease.inOutCubic(p) * 0.35 + p * 0.65, 1.15)) };
    }
    if (t < T.toRight) {
      const th = rad(orbitAngle(t));
      return { x: L.cx + L.Rx * Math.cos(th), y: L.cy - L.Ry * Math.sin(th) };
    }
    const left = { x: L.cx - L.Rx, y: L.cy };
    if (t < T.atRight) {
      const p = ease.inOutCubic(prog(t, T.toRight, T.atRight));
      return { x: lerp(left.x, rightX(), p), y: lerp(left.y, L.cy, p) - Math.sin(Math.PI * p) * 70 * u };
    }
    if (t < T.pull) return { x: rightX(), y: L.cy };
    const p = ease.inOutCubic(prog(t, T.pull, T.pullEnd));
    return { x: lerp(rightX(), -(G.bodyW / 2 + 12) * u, p), y: L.cy };
  }

  function droneAt(t) {
    const u = L.u;
    const r = rotor(t);
    if (t < T.snap) {
      const b = tossBody(t);
      return { ...b, arm: t >= T.armIn ? armFall(t) : null, attached: false, dome: 0, rotor: r };
    }
    // posé : écrasement à l'emboîtement puis anticipation
    if (t < T.liftStart) {
      const k = t - T.snap;
      const sq = 0.12 * Math.sin(Math.PI * clamp(k / (T.liftStart - T.snap)));
      return { x: L.cx, y: L.groundY, rot: 0, sx: 1 + sq * 0.6, sy: 1 - sq, pivot: G.bodyH / 2, attached: true, dome: 0, rotor: r };
    }
    const base = flightBase(t);
    const dt = 1 / 90;
    const nb = flightBase(Math.min(t + dt, DURATION));
    const pb = flightBase(Math.max(t - dt, T.liftStart));
    const vx = (nb.x - pb.x) / (2 * dt) / u;
    const vy = (nb.y - pb.y) / (2 * dt) / u;
    const bobAmt = clamp((t - T.liftStart) / 0.4) * (t < T.pull ? 1 : 0.4);
    const bob = Math.sin((t - T.liftStart) * 2 * Math.PI * 1.7) * 5 * u * bobAmt;
    const tiltAmt = t > T.pull ? 0.6 : 1;
    const tilt = rad(24) * tiltAmt * Math.tanh(vx / 2600) + rad(1.5) * Math.sin(t * 9.1) * bobAmt;
    // étirement dans la vitesse verticale
    const st = clamp(Math.abs(vy) / 9000, 0, 0.12);
    let sx = 1 - st * 0.6;
    let sy = 1 + st;
    // "glouton" après l'absorption
    const g = prog(t, T.absorbEnd - 0.04, T.absorbEnd + 0.22);
    if (g > 0 && g < 1) {
      const bump = Math.sin(Math.PI * g) * Math.exp(-2 * g) * 0.18;
      sx += bump;
      sy += bump;
    }
    const dome = ease.outBack(prog(t, T.liftStart + 0.02, T.liftStart + 0.24), 2.2);
    return { x: base.x, y: base.y + bob, rot: tilt, sx, sy, pivot: 0, attached: true, dome, rotor: r };
  }

  // ---------- drawing ----------
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.roundRect(x, y, w, h, r);
  }

  // bras + moteurs + hélices, centré sur le milieu de la barre
  function drawArm(c, u, rot) {
    c.fillStyle = COL.ink;
    roundRect(c, -G.armHalf * u, (-G.armT / 2) * u, 2 * G.armHalf * u, G.armT * u, (G.armT / 2) * u);
    c.fill();
    for (const side of [-1, 1]) {
      const mx = side * G.motorX * u;
      roundRect(c, mx - 10 * u, -31 * u, 20 * u, 26 * u, 5 * u);
      c.fill();
      const by = -34 * u;
      const ph = rot.angle + (side > 0 ? 1.1 : 0);
      const bw = Math.max(10 * u, G.bladeL * u * Math.abs(Math.cos(ph)));
      if (rot.spin > 0) {
        c.globalAlpha = 0.2 * rot.spin;
        roundRect(c, mx - (G.bladeL / 2) * u, by - 3 * u, G.bladeL * u, 6 * u, 3 * u);
        c.fill();
        c.globalAlpha = 1;
      }
      roundRect(c, mx - bw / 2, by - 4 * u, bw, 8 * u, 4 * u);
      c.fill();
      c.beginPath();
      c.ellipse(mx, by, 7 * u, 5 * u, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  function domeWorld(d) {
    const u = L.u;
    const ly = (G.bodyH / 2) * u * d.sy;
    return { x: d.x - Math.sin(d.rot) * ly, y: d.y + Math.cos(d.rot) * ly };
  }

  function drawDrone(c, d, aim) {
    const u = L.u;
    c.save();
    c.translate(d.x, d.y);
    c.rotate(d.rot);
    c.translate(0, d.pivot * u);
    c.scale(d.sx, d.sy);
    c.translate(0, -d.pivot * u);
    c.fillStyle = COL.ink;
    if (d.dome > 0) {
      c.beginPath();
      c.arc(0, (G.bodyH / 2) * u, G.domeR * u * d.dome, 0, Math.PI * 2);
      c.fill();
    }
    roundRect(c, (-G.bodyW / 2) * u, (-G.bodyH / 2) * u, G.bodyW * u, G.bodyH * u, G.bodyR * u);
    c.fill();
    if (d.attached) {
      c.save();
      c.translate(0, -(G.bodyH / 2 + G.armT / 2) * u);
      drawArm(c, u, d.rotor);
      c.restore();
    }
    if (aim && d.dome > 0) {
      // objectif : petit disque lumineux orienté vers la cible
      const a = aim.angle - d.rot;
      c.fillStyle = COL.beam;
      c.beginPath();
      c.arc(Math.cos(a) * 15 * u, (G.bodyH / 2) * u + Math.sin(a) * 15 * u * d.sy, 9 * u * aim.lens, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    if (d.arm) {
      c.save();
      c.translate(d.arm.x, d.arm.y);
      c.rotate(d.arm.rot);
      c.scale(1, d.arm.flip);
      drawArm(c, u, d.rotor);
      c.restore();
    }
  }

  // logo en deux calques (globe + pousse) ; la pousse grandit depuis sa base
  function drawLogo(c, x, y, h, o = {}) {
    const gi = img.globe;
    const si = img.sprout;
    const k = h / gi.height;
    const w = gi.width * k;
    const sx = o.sx ?? 1;
    const sy = o.sy ?? 1;
    const grow = o.grow ?? 1;
    c.save();
    c.translate(x, y);
    c.scale(sx, sy);
    c.globalAlpha = o.alpha ?? 1;
    c.drawImage(gi, -w / 2, -h / 2, w, h);
    if (grow > 0.001) {
      const px = -w / 2 + 456 * k;
      const py = -h / 2 + 440 * k;
      c.translate(px, py);
      c.rotate(rad(-8) * (1 - clamp(grow)));
      c.scale(grow, grow);
      c.translate(-px, -py);
      c.drawImage(si, -w / 2, -h / 2, w, h);
    }
    c.restore();
  }

  function setFont(c, weight, size, family, spacing = 0) {
    c.font = `${weight} ${size}px "${family}"`;
    c.letterSpacing = `${spacing}px`;
  }

  // texte centré, réduit si besoin pour tenir dans maxW
  function fitText(c, text, x, y, o) {
    let size = o.size;
    setFont(c, o.weight, size, o.family, size * (o.track || 0));
    const w = c.measureText(text).width;
    if (w > o.maxW) {
      size *= o.maxW / w;
      setFont(c, o.weight, size, o.family, size * (o.track || 0));
    }
    c.fillStyle = o.color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x + (size * (o.track || 0)) / 2, y);
  }

  function beamAt(t, d) {
    if (t < T.beamOn || t > T.absorbEnd) return null;
    const u = L.u;
    const O = domeWorld(d);
    const logo = logoAt(t, O);
    const dx = logo.x - O.x;
    const dy = logo.y - O.y;
    const D = Math.hypot(dx, dy) || 1;
    const dir = { x: dx / D, y: dy / D };
    let len = 4200 * u * ease.outCubic(prog(t, T.beamOn, T.beamOn + 0.12));
    let hw = L.beamHW * lerp(0.1, 1, ease.outBack(prog(t, T.beamOn, T.beamOn + 0.24), 2.4));
    const q = ease.inCubic(prog(t, T.absorb, T.absorbEnd - 0.04));
    if (q > 0) {
      len *= 1 - q;
      hw *= lerp(1, 0.6, q);
    }
    const D0 = Math.max(Math.hypot(L.cx - O.x, L.cy - O.y), 1);
    const w0 = 10 * u;
    const tanA = Math.max(0, (hw - w0) / D0);
    const lens = ease.outBack(prog(t, T.beamOn - 0.04, T.beamOn + 0.1), 2);
    return { O, dir, len, w0, tanA, logo, angle: Math.atan2(dir.y, dir.x), lens };
  }

  // position / déformation du logo (aspiré vers l'objectif à la fin)
  function logoAt(t, O) {
    const q = ease.inCubic(prog(t, T.absorb, T.absorbEnd - 0.06));
    return {
      x: lerp(L.cx, O.x, q * 0.9),
      y: lerp(L.cy, O.y, q * 0.9),
      sx: lerp(1, 0.04, q),
      sy: lerp(1, 0.35, q),
      grow: ease.outBack(prog(t, T.beamOn + 0.06, T.beamOn + 0.6), 1.9),
    };
  }

  function beamPath(c, b) {
    const n = { x: -b.dir.y, y: b.dir.x };
    const far = { x: b.O.x + b.dir.x * b.len, y: b.O.y + b.dir.y * b.len };
    const wf = b.w0 + b.len * b.tanA;
    c.beginPath();
    c.moveTo(b.O.x + n.x * b.w0, b.O.y + n.y * b.w0);
    c.lineTo(far.x + n.x * wf, far.y + n.y * wf);
    c.lineTo(far.x - n.x * wf, far.y - n.y * wf);
    c.lineTo(b.O.x - n.x * b.w0, b.O.y - n.y * b.w0);
    c.closePath();
  }

  function drawScene(c, t) {
    const u = L.u;
    t = clamp(t, 0, DURATION);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = COL.bg;
    c.fillRect(0, 0, W, H);

    // --- acte 1 & 2 : drone + faisceau ---
    if (t < T.pullEnd + 0.3) {
      const d = droneAt(t);
      const b = beamAt(t, d);
      if (b && b.len > 1) {
        c.fillStyle = COL.beam;
        beamPath(c, b);
        c.fill();
        c.save();
        beamPath(c, b);
        c.clip();
        drawLogo(c, b.logo.x, b.logo.y, L.logoH, b.logo);
        c.restore();
      }
      // volet sombre tiré par le drone
      if (t >= T.atRight - 0.05) {
        const target = d.x + (G.bodyW / 2) * u;
        const left = lerp(W, Math.max(0, target), ease.outCubic(prog(t, T.atRight - 0.05, T.atRight + 0.08)));
        drawDarkPanel(c, t, left, 0);
      }
      drawDrone(c, d, b ? { angle: b.angle, lens: b.lens } : null);
    } else {
      // --- acte 3 : volets ---
      const yb = H * ease.inOutQuart(prog(t, T.dropStart, T.dropEnd));
      drawDarkPanel(c, t, 0, yb);
      if (yb > 0) drawLightPanel(c, t, yb);
    }
  }

  function drawDarkPanel(c, t, left, top) {
    const u = L.u;
    c.fillStyle = COL.ink;
    c.fillRect(left, top, W - left, H - top);
    fitText(c, 'AGROSFER', left + W / 2, top + L.cy, {
      size: (L.portrait ? 150 : 140) * u,
      weight: 700,
      family: 'Cinzel',
      track: 0.1,
      color: COL.cream,
      maxW: W * 0.8,
    });
  }

  function drawLightPanel(c, t, yb) {
    const u = L.u;
    c.fillStyle = COL.beam;
    c.fillRect(0, 0, W, yb);
    const e = ease.outCubic(prog(t, T.endCard, T.endCard + 0.45));
    // signature officielle d'AgroSfer, sur deux lignes
    const tagY = yb - H + L.cy + e * 72 * u;
    const ts = (L.portrait ? 62 : 66) * u;
    ['Filières agricoles', 'durables et traçables.'].forEach((line, i) => {
      fitText(c, line, L.cx, tagY + (i - 0.5) * ts * 1.25, {
        size: ts,
        weight: 700,
        family: 'Libre Baskerville',
        track: 0.01,
        color: COL.tag,
        maxW: W * 0.86,
      });
    });
    // carte de fin : logo + url
    const pl = prog(t, T.endCard + 0.08, T.endCard + 0.5);
    if (pl > 0) {
      const s = ease.outBack(pl, 1.8);
      const grow = ease.outBack(prog(t, T.endCard + 0.22, T.endCard + 0.7), 1.9);
      drawLogo(c, L.cx, L.cy - (L.portrait ? 175 : 160) * u, (L.portrait ? 270 : 230) * u, { sx: s, sy: s, grow });
    }
    const pu = ease.outCubic(prog(t, T.endCard + 0.35, T.endCard + 0.75));
    if (pu > 0) {
      c.globalAlpha = pu;
      fitText(c, 'agrosfer.co', L.cx, L.cy + (L.portrait ? 215 : 205) * u + (1 - pu) * 14 * u, {
        size: 30 * u,
        weight: 600,
        family: 'Montserrat',
        track: 0.28,
        color: COL.url,
        maxW: W * 0.8,
      });
      c.globalAlpha = 1;
    }
  }

  // ---------- API ----------
  async function init(w, h) {
    W = w;
    H = h;
    L = layout(w, h);
    canvas = document.getElementById('c');
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext('2d');
    sceneCv = document.createElement('canvas');
    sceneCv.width = w;
    sceneCv.height = h;
    sceneCtx = sceneCv.getContext('2d');
    const load = (k, src) =>
      new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => {
          img[k] = i;
          res();
        };
        i.onerror = rej;
        i.src = src;
      });
    await Promise.all([
      load('globe', 'assets/img/logo_globe.png'),
      load('sprout', 'assets/img/logo_sprout.png'),
      document.fonts.load('700 40px "Cinzel"'),
      document.fonts.load('700 40px "Libre Baskerville"'),
      document.fonts.load('600 40px "Montserrat"'),
    ]);
    await document.fonts.ready;
  }

  // flou de mouvement : moyenne de `samples` sous-images réparties sur l'obturateur
  function renderFrame(t, fps = 30, samples = 1, shutter = 0.55) {
    if (samples <= 1) {
      drawScene(ctx, t);
      return;
    }
    for (let i = 0; i < samples; i++) {
      const ti = t + (shutter / fps) * (i / (samples - 1) - 0.5);
      drawScene(sceneCtx, ti);
      ctx.globalAlpha = 1 / (i + 1);
      ctx.drawImage(sceneCv, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  // trajectoire du drone pour la spatialisation du son
  function track(rate = 100) {
    const out = [];
    for (let i = 0; i <= DURATION * rate; i++) {
      const t = i / rate;
      let x = L.cx;
      let on = 0;
      if (t >= T.snap && t < T.pullEnd + 0.1) {
        const d = droneAt(t);
        x = d.x;
        on = rotor(t).spin;
      }
      out.push({ t, pan: clamp((x / W) * 2 - 1, -1, 1), on });
    }
    return out;
  }

  window.SCENE = { init, renderFrame, drawScene, track, DURATION, SFX, T, MUSIC: { score: "drone" } };
})();
