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
  }

  function applyProfile(cfg) {
    document.getElementById('profile-name').textContent = cfg.profile.name;
    document.getElementById('profile-desc').textContent = cfg.profile.description;
    document.getElementById('profile-pfp').src = cfg.profile.pfp;
    document.getElementById('profile-pfp').alt = cfg.profile.name;
  }

  function bindChannelTab(cfg) {
    const tab = document.getElementById('channel-tab');
    const resolve = () => AnonStealth.resolveChannel(cfg);

    const arm = () => {
      const url = resolve();
      if (url) tab.setAttribute('href', url);
    };

    tab.addEventListener('pointerdown', arm, { passive: true });
    tab.addEventListener('touchstart', arm, { passive: true });
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      AnonStealth.openChannel(cfg);
    });
  }

  function initBrowserGuard(cfg) {
    const result = AnonBrowserGuard.evaluate(cfg);
    const overlay = document.getElementById('guard-overlay');
    const main = document.getElementById('main-content');

    if (result.allowed) {
      document.documentElement.classList.remove('webview-blocked');
      return;
    }

    document.documentElement.classList.add('webview-blocked');
    overlay.hidden = false;
    main.style.filter = 'blur(6px)';
    main.style.pointerEvents = 'none';

    document.getElementById('guard-browser').textContent = result.browser;
    document.getElementById('guard-message').textContent = result.message;

    document.getElementById('guard-open-browser').addEventListener('click', (e) => {
      e.preventDefault();
      AnonBrowserGuard.openInMainBrowser(window.location.href);
    });
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
