/**
 * AnonLink — main application bootstrap
 */
(function () {
  'use strict';

  let siteConfig = null;

  async function loadConfig() {
    // Prefer live config so old localStorage edits do not stick
    try {
      localStorage.removeItem(AnonAdmin.CONFIG_KEY);
    } catch {
      /* ignore */
    }
    const res = await fetch('config/site.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Config load failed');
    return res.json();
  }

  async function loadAdminLock() {
    try {
      const res = await fetch('config/admin.lock.json');
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  function applyEffects(cfg) {
    const root = document.documentElement;
    root.style.setProperty('--blur', `${cfg.effects.glassBlur}px`);
    root.style.setProperty('--stroke', `${cfg.effects.strokeWidth}px`);

    const canvas = document.getElementById('particles');
    if (!cfg.effects.particles) {
      canvas.style.display = 'none';
      return;
    }
    initParticles(canvas, cfg.effects.glowIntensity);
  }

  function applyProfile(cfg) {
    document.getElementById('profile-name').textContent = cfg.profile.name;
    document.getElementById('profile-desc').textContent = cfg.profile.description;
    document.getElementById('profile-pfp').src = cfg.profile.pfp;
    document.getElementById('profile-pfp').alt = cfg.profile.name;
  }

  function bindChannelTab(cfg) {
    const tab = document.getElementById('channel-tab');
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      AnonStealth.openChannel(cfg);
    });
  }

  function initBrowserGuard(cfg) {
    const result = AnonBrowserGuard.evaluate(cfg);
    const overlay = document.getElementById('guard-overlay');
    const main = document.getElementById('main-content');

    if (result.allowed) return;

    overlay.hidden = false;
    main.style.filter = 'blur(6px)';
    main.style.pointerEvents = 'none';

    document.getElementById('guard-browser').textContent = result.browser;
    document.getElementById('guard-message').textContent = result.message;

    document.getElementById('guard-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        document.getElementById('guard-copy').textContent = 'Copied!';
        setTimeout(() => {
          document.getElementById('guard-copy').textContent = 'Copy Page Link';
        }, 2000);
      } catch {
        /* clipboard unavailable */
      }
    });
  }

  function initParticles(canvas, intensity) {
    const ctx = canvas.getContext('2d');
    let w, h, particles;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function createParticles(count) {
      return Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        a: Math.random() * intensity + 0.05
      }));
    }

    resize();
    particles = createParticles(Math.floor((w * h) / 18000));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 210, 255, ${p.a})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => {
      resize();
      particles = createParticles(Math.floor((w * h) / 18000));
    });

    draw();
  }

  async function boot() {
    try {
      siteConfig = await loadConfig();
      applyEffects(siteConfig);
      applyProfile(siteConfig);
      bindChannelTab(siteConfig);
      initBrowserGuard(siteConfig);

      const lockData = await loadAdminLock();
      const adminApi = AnonAdmin.bindAdminPanel(document.body, siteConfig, lockData);

      if (new URLSearchParams(location.search).has('config')) {
        adminApi.showPanel();
      }
    } catch (err) {
      console.error('[AnonLink]', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
