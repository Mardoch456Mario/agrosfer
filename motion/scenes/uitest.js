// Planche de contrôle des composants d'interface (pas une vidéo livrée).
(async () => {
  await Core.loadScript('lib/ui.js');
  const A = Core.scene({
    duration: 1,
    images: { logo: 'assets/img/logo_color.png' },
    fonts: ['700 20px "Inter"'],
    draw(c, t) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      for (const [i, theme] of ['light', 'dark'].entries()) {
        const T = UI.THEMES[theme];
        const ox = i * (W / 2);
        c.fillStyle = T.bg;
        c.fillRect(ox, 0, W / 2, H);
        UI.payCard(c, ox + 20, 20, 420, 240);
        UI.surveys(c, ox + 460, 20, 380, 480, T, { p: 1 });
        UI.chart(c, ox + 20, 280, 420, 300, T, { p: 0.8 });
        UI.producer(c, ox + 20, 600, 400, 230, T);
        UI.trace(c, ox + 460, 520, 400, 380, T, { p: 0.6 });
        UI.order(c, ox + 20, 850, 400, 220, T);
        UI.notif(c, ox + 460, 920, 400, 76, T, { time: '14:02' });
        UI.pill(c, ox + 460, 1030, 'Traçabilité', { bg: T.green, color: '#fff' });
        UI.pill(c, ox + 640, 1030, 'AgroSfer Pay', { bg: T.blue, color: '#fff', icon: 'wallet' });
      }
    },
  });
})();
