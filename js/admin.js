/**
 * Admin config panel — unlocked via CLI-generated credentials.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'anonlink_admin_session';
  const CONFIG_KEY = 'anonlink_site_config';

  function getStoredConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  async function verifyLogin(username, password, lockData) {
    if (!lockData || username !== lockData.username) return false;
    const hash = await AnonStealth.hashPassword(password, lockData.salt);
    return hash === lockData.hash;
  }

  function setSession(username) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user: username, ts: Date.now() }));
  }

  function isAuthed() {
    try {
      return !!sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }

  function encodeChannelUrl(url) {
    return AnonStealth.encodeSegments(url);
  }

  function renderPlatformList(container, platforms, onChange) {
    container.innerHTML = '';
    platforms.forEach((p, idx) => {
      const row = document.createElement('label');
      row.className = 'admin-row';
      row.innerHTML = `
        <input type="checkbox" data-idx="${idx}" ${p.enabled ? 'checked' : ''} />
        <span>${p.label}</span>
      `;
      row.querySelector('input').addEventListener('change', (e) => {
        platforms[idx].enabled = e.target.checked;
        onChange(platforms);
      });
      container.appendChild(row);
    });
  }

  function bindAdminPanel(root, baseConfig, lockData) {
    const overlay = root.querySelector('#admin-overlay');
    const loginForm = root.querySelector('#admin-login');
    const panel = root.querySelector('#admin-panel');
    const logoutBtn = root.querySelector('#admin-logout');

    function showPanel() {
      overlay.hidden = false;
      if (isAuthed()) {
        loginForm.hidden = true;
        panel.hidden = false;
        populatePanel();
      } else {
        loginForm.hidden = false;
        panel.hidden = true;
      }
    }

    function hidePanel() {
      overlay.hidden = true;
    }

    function populatePanel() {
      const cfg = getStoredConfig() || baseConfig;
      root.querySelector('#cfg-name').value = cfg.profile.name;
      root.querySelector('#cfg-desc').value = cfg.profile.description;
      root.querySelector('#cfg-pfp').value = cfg.profile.pfp;
      root.querySelector('#cfg-channel').value = AnonStealth.resolveChannel(cfg);
      root.querySelector('#cfg-particles').checked = cfg.effects.particles;
      root.querySelector('#cfg-blur').value = cfg.effects.glassBlur;
      root.querySelector('#cfg-stroke').value = cfg.effects.strokeWidth;
      root.querySelector('#cfg-glow').value = cfg.effects.glowIntensity;
      root.querySelector('#cfg-chrome').checked = cfg.browser.requireChrome;
      root.querySelector('#cfg-block-inapp').checked = cfg.browser.blockInAppBrowsers;
      renderPlatformList(
        root.querySelector('#cfg-platforms'),
        cfg.tracking.platforms,
        (updated) => {
          cfg.tracking.platforms = updated;
          saveConfig(cfg);
        }
      );
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = root.querySelector('#admin-user').value.trim();
      const pass = root.querySelector('#admin-pass').value;
      const errEl = root.querySelector('#admin-login-error');
      if (!lockData) {
        errEl.textContent = 'No admin lock file. Run: npm run create-admin';
        return;
      }
      const ok = await verifyLogin(user, pass, lockData);
      if (!ok) {
        errEl.textContent = 'Invalid credentials';
        return;
      }
      errEl.textContent = '';
      setSession(user);
      loginForm.hidden = true;
      panel.hidden = false;
      populatePanel();
    });

    root.querySelector('#admin-save').addEventListener('click', () => {
      const cfg = getStoredConfig() || JSON.parse(JSON.stringify(baseConfig));
      cfg.profile.name = root.querySelector('#cfg-name').value.trim();
      cfg.profile.description = root.querySelector('#cfg-desc').value.trim();
      cfg.profile.pfp = root.querySelector('#cfg-pfp').value.trim();
      const channelUrl = root.querySelector('#cfg-channel').value.trim();
      const encoded = encodeChannelUrl(channelUrl);
      cfg.channel = { segments: encoded.segments, order: encoded.order };
      cfg.effects.particles = root.querySelector('#cfg-particles').checked;
      cfg.effects.glassBlur = Number(root.querySelector('#cfg-blur').value);
      cfg.effects.strokeWidth = Number(root.querySelector('#cfg-stroke').value);
      cfg.effects.glowIntensity = Number(root.querySelector('#cfg-glow').value);
      cfg.browser.requireChrome = root.querySelector('#cfg-chrome').checked;
      cfg.browser.blockInAppBrowsers = root.querySelector('#cfg-block-inapp').checked;
      saveConfig(cfg);
      root.querySelector('#admin-save-status').textContent = 'Saved — reload to apply.';
      setTimeout(() => {
        root.querySelector('#admin-save-status').textContent = '';
      }, 3000);
    });

    root.querySelector('#admin-reset').addEventListener('click', () => {
      localStorage.removeItem(CONFIG_KEY);
      root.querySelector('#admin-save-status').textContent = 'Reset to defaults on reload.';
    });

    logoutBtn.addEventListener('click', () => {
      clearSession();
      panel.hidden = true;
      loginForm.hidden = false;
      hidePanel();
    });

    root.querySelector('#admin-close').addEventListener('click', hidePanel);

    return { showPanel, hidePanel, isAuthed };
  }

  global.AnonAdmin = {
    getStoredConfig,
    saveConfig,
    bindAdminPanel,
    isAuthed,
    CONFIG_KEY
  };
})(typeof window !== 'undefined' ? window : global);
