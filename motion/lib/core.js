// Helpers partagés par les scènes : maths/easing, fabrique de scène (flou de mouvement), chargement, texte.
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const rad = (d) => (d * Math.PI) / 180;
  const smooth = (x) => x * x * (3 - 2 * x);

  const ease = {
    linear: (x) => x,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) ** 2,
    inCubic: (x) => x ** 3,
    outCubic: (x) => 1 - (1 - x) ** 3,
    inOutCubic: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
    inQuart: (x) => x ** 4,
    outQuart: (x) => 1 - (1 - x) ** 4,
    inOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2),
    outQuint: (x) => 1 - (1 - x) ** 5,
    inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2),
    outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
    inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2),
    outBack: (x, s = 1.70158) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
    inBack: (x, s = 1.70158) => (s + 1) * x ** 3 - s * x ** 2,
    inOutBack: (x, s = 1.2) => {
      const c = s * 1.525;
      return x < 0.5 ? ((2 * x) ** 2 * ((c + 1) * 2 * x - c)) / 2 : ((2 * x - 2) ** 2 * ((c + 1) * (x * 2 - 2) + c) + 2) / 2;
    },
    outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  };

  // aléatoire déterministe
  function rng(seed = 1) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  function loadImage(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // ---------- texte ----------
  function font(c, weight, size, family, tracking = 0) {
    c.font = `${weight} ${size}px "${family}"`;
    c.letterSpacing = `${tracking * size}px`;
  }

  // texte simple ; align = 'left' | 'center' | 'right' ; corrige le décalage dû au letterSpacing
  function text(c, str, x, y, o = {}) {
    font(c, o.weight ?? 600, o.size ?? 40, o.family ?? 'Inter', o.tracking ?? 0);
    c.fillStyle = o.color ?? '#fff';
    c.textAlign = o.align ?? 'left';
    c.textBaseline = o.baseline ?? 'middle';
    const tr = (o.tracking ?? 0) * (o.size ?? 40);
    const dx = c.textAlign === 'center' ? tr / 2 : c.textAlign === 'right' ? tr : 0;
    c.fillText(str, x + dx, y);
  }

  function measure(c, str, o = {}) {
    font(c, o.weight ?? 600, o.size ?? 40, o.family ?? 'Inter', o.tracking ?? 0);
    const w = c.measureText(str).width;
    return w - (o.tracking ?? 0) * (o.size ?? 40);
  }

  // taille max pour que str tienne dans maxW
  function fitSize(c, str, o, maxW) {
    const w = measure(c, str, o);
    return w > maxW ? (o.size * maxW) / w : o.size;
  }

  // ---------- formes ----------
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
  }

  function fillRR(c, x, y, w, h, r, color) {
    rr(c, x, y, w, h, r);
    c.fillStyle = color;
    c.fill();
  }

  // ---------- fabrique de scène ----------
  // def : { duration, T, SFX, MUSIC, fonts:[...], images:{k:src}, scripts:[...], setup(W,H,assets), draw(ctx,t), track(rate) }
  function scene(def) {
    let W, H, ctx, main, work, workCtx;
    const assets = {};
    async function init(w, h) {
      W = w;
      H = h;
      main = document.getElementById('c');
      main.width = w;
      main.height = h;
      ctx = main.getContext('2d');
      work = canvas(w, h);
      workCtx = work.getContext('2d');
      for (const s of def.scripts || []) await loadScript(s);
      await Promise.all([
        ...Object.entries(def.images || {}).map(([k, src]) => loadImage(src).then((i) => (assets[k] = i))),
        ...(def.fonts || []).map((f) => document.fonts.load(f)),
      ]);
      await document.fonts.ready;
      await def.setup?.(w, h, assets);
    }
    function draw(c, t) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.filter = 'none';
      def.draw(c, clamp(t, 0, def.duration));
    }
    // flou de mouvement : moyenne de `samples` sous-images réparties sur l'obturateur
    function renderFrame(t, fps = 30, samples = 1, shutter = def.shutter ?? 0.5) {
      if (samples <= 1) return draw(ctx, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < samples; i++) {
        const ti = t + (shutter / fps) * (i / (samples - 1) - 0.5);
        draw(workCtx, ti);
        workCtx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 / (i + 1);
        ctx.drawImage(work, 0, 0);
      }
      ctx.globalAlpha = 1;
    }
    window.SCENE = {
      init,
      renderFrame,
      DURATION: def.duration,
      SFX: def.SFX || [],
      T: def.T || {},
      MUSIC: def.MUSIC || null,
      track: def.track,
    };
    return assets;
  }

  window.Core = { clamp, lerp, prog, rad, smooth, ease, rng, hash, loadImage, loadScript, canvas, font, text, measure, fitSize, rr, fillRR, scene };
})();
