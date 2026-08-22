/**
 * Browser guard — blocks social in-app webviews only.
 * Safari / Chrome / Firefox are allowed.
 *
 * Research (2025–2026):
 * - GitHub Pages is NOT the problem — any https host behaves the same inside IG.
 * - Instagram iOS uses a hardened WKWebView that swallows x-safari-https:// taps.
 * - Long-press can still preview/open because that is native UIChrome, not page JS.
 * - Current best-effort Meta escape: instagram://extbrowser/?url=<encoded>
 *   (Threads: barcelona://extbrowser/?url=<encoded>) — must be a real user tap.
 * - Always pair with ••• → Open in Browser instructions (only guaranteed path).
 */
(function (global) {
  'use strict';

  const IN_APP_PATTERNS = [
    /Instagram/i,
    /FBAN|FBAV|FB_IAB|FBIOS|FBSS|FB_FW/i,
    /Twitter/i,
    /Threads/i,
    /Barcelona/i,
    /TikTok|musical_ly|BytedanceWebview|TTWebView/i,
    /Snapchat/i,
    /LinkedInApp/i,
    /Pinterest/i,
    /Line\//i,
    /KAKAOTALK/i,
    /MicroMessenger/i,
    /Weibo/i,
    /; wv\)/i
  ];

  function isRealSafari(ua) {
    const u = ua || navigator.userAgent || '';
    return (
      /Safari/i.test(u) &&
      !/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|Barcelona|Threads|TikTok/i.test(u)
    );
  }

  function isRealBrowser(ua) {
    const u = ua || navigator.userAgent || '';
    if (isInAppBrowser(u)) return false;
    if (isRealSafari(u)) return true;
    if (/CriOS|FxiOS|EdgiOS|Edg\//i.test(u)) return true;
    if (/Chrome/i.test(u) && !/; wv\)/i.test(u)) return true;
    if (/Firefox/i.test(u)) return true;
    return false;
  }

  function isInAppBrowser(ua) {
    const u = ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    if (isRealSafari(u)) return false;
    if (IN_APP_PATTERNS.some((re) => re.test(u))) return true;

    if (/iPhone|iPod|iPad/i.test(u) && /AppleWebKit/i.test(u) && !/Safari/i.test(u)) {
      return true;
    }

    if (/Android/i.test(u) && /Version\/[\d.]+/i.test(u) && /Chrome/i.test(u) && /wv/i.test(u)) {
      return true;
    }

    if (typeof window !== 'undefined') {
      if (window.ReactNativeWebView) return true;
      if (window.webkit && window.webkit.messageHandlers) {
        const keys = Object.keys(window.webkit.messageHandlers || {});
        if (keys.some((k) => /instagram|facebook|meta|threads|barcelona/i.test(k))) {
          return true;
        }
      }
    }

    return false;
  }

  function detectHostApp(ua) {
    const u = ua || navigator.userAgent || '';
    // Threads UA often contains both Barcelona and Instagram — check Barcelona first
    if (/Barcelona/i.test(u)) return 'threads';
    if (/Instagram/i.test(u)) return 'instagram';
    if (/FBAN|FBAV|FB_IAB/i.test(u)) return 'facebook';
    if (/TikTok|musical_ly|Bytedance/i.test(u)) return 'tiktok';
    if (/Snapchat/i.test(u)) return 'snapchat';
    if (/Twitter/i.test(u)) return 'twitter';
    if (/; wv\)/i.test(u)) return 'webview';
    return 'unknown';
  }

  function detectBrowserName(ua) {
    const u = ua || navigator.userAgent;
    const app = detectHostApp(u);
    if (app === 'instagram') return 'Instagram';
    if (app === 'threads') return 'Threads';
    if (app === 'facebook') return 'Facebook';
    if (app === 'tiktok') return 'TikTok';
    if (app === 'snapchat') return 'Snapchat';
    if (app === 'twitter') return 'X / Twitter';
    if (app === 'webview') return 'In-App WebView';
    if (/CriOS/i.test(u)) return 'Chrome (iOS)';
    if (/FxiOS/i.test(u)) return 'Firefox (iOS)';
    if (/Chrome/i.test(u)) return 'Chrome';
    if (isRealSafari(u)) return 'Safari';
    if (/Firefox/i.test(u)) return 'Firefox';
    return 'Unknown';
  }

  function evaluate(config) {
    const ua = navigator.userAgent || '';
    const cfg = (config && config.browser) || {};
    const requireChrome = cfg.requireChrome === true;
    const blockInApp = cfg.blockInAppBrowsers !== false;
    const loadMessage = 'For Loading purposes, this page requires to be loaded inside non web view.';

    if (isRealBrowser(ua)) {
      return { allowed: true, browser: detectBrowserName(ua), app: 'none' };
    }

    if (blockInApp && isInAppBrowser(ua)) {
      return {
        allowed: false,
        reason: 'in_app',
        browser: detectBrowserName(ua),
        app: detectHostApp(ua),
        message: loadMessage
      };
    }

    if (requireChrome && !/Chrome|CriOS/i.test(ua)) {
      return {
        allowed: false,
        reason: 'not_chrome',
        browser: detectBrowserName(ua),
        app: detectHostApp(ua),
        message: loadMessage
      };
    }

    return { allowed: true, browser: detectBrowserName(ua), app: 'none' };
  }

  function httpsUrl(url) {
    try {
      return new URL(url || window.location.href).href;
    } catch {
      return url || window.location.href;
    }
  }

  function safariScheme(url) {
    // Format: x-safari-https://host/path  (replace https:// with x-safari-https://)
    return httpsUrl(url).replace(/^https:\/\//i, 'x-safari-https://');
  }

  function metaExtBrowser(url, app) {
    const enc = encodeURIComponent(httpsUrl(url));
    if (app === 'threads') return 'barcelona://extbrowser/?url=' + enc;
    return 'instagram://extbrowser/?url=' + enc;
  }

  function androidIntent(url) {
    const u = new URL(httpsUrl(url));
    return (
      'intent://' +
      u.host +
      u.pathname +
      u.search +
      u.hash +
      '#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=' +
      encodeURIComponent(u.href) +
      ';end'
    );
  }

  /**
   * Primary escape href for a native <a> tap (no JS location hijack on iOS).
   */
  function primaryEscapeHref(url) {
    const ua = navigator.userAgent || '';
    const app = detectHostApp(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const plain = httpsUrl(url);

    if (isIOS && (app === 'instagram' || app === 'threads')) {
      // Meta private scheme — handled by the Instagram/Threads app, not WKWebView
      return metaExtBrowser(plain, app);
    }

    if (isIOS) {
      // Still works in TikTok / X / Telegram / generic WKWebViews
      return safariScheme(plain);
    }

    if (isAndroid) {
      return androidIntent(plain);
    }

    return plain;
  }

  function manualHint(app) {
    if (app === 'instagram' || app === 'threads' || app === 'facebook') {
      return 'Tap ••• then Open in Browser / Open in Safari';
    }
    if (app === 'tiktok') {
      return 'Tap ••• then Open in browser';
    }
    return 'Open this page in Safari or Chrome';
  }

  /**
   * Arm the Open button as a native anchor.
   * Critical: on iOS Instagram, do NOT also call location.href / setTimeout —
   * that can cancel the gesture Meta requires for extbrowser.
   */
  function armOpenBrowserLink(anchorEl, url) {
    if (!anchorEl) return;

    const plain = httpsUrl(url);
    const href = primaryEscapeHref(plain);
    const ua = navigator.userAgent || '';
    const app = detectHostApp(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    anchorEl.setAttribute('href', href);
    anchorEl.removeAttribute('target');
    anchorEl.setAttribute('rel', 'noopener noreferrer');

    const statusEl = document.getElementById('guard-open-status');
    const hintEl = document.getElementById('guard-manual-hint');
    if (hintEl) {
      hintEl.textContent = manualHint(app);
      hintEl.hidden = false;
    }

    // Copy fallback always available
    const copyBtn = document.getElementById('guard-copy-link');
    if (copyBtn) {
      copyBtn.hidden = false;
      copyBtn.onclick = async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(plain);
          copyBtn.textContent = 'Link Copied';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Link';
          }, 2000);
        } catch {
          window.prompt('Copy this link:', plain);
        }
      };
    }

    if (isIOS && (app === 'instagram' || app === 'threads')) {
      // Native <a> only — synchronous gesture to Meta's extbrowser handler
      anchorEl.addEventListener(
        'click',
        () => {
          if (statusEl) {
            statusEl.hidden = false;
            statusEl.textContent = 'Opening Safari…';
          }
        },
        { passive: true }
      );
      return;
    }

    // Non-Meta / Android: still prefer native href; light status only
    anchorEl.addEventListener(
      'click',
      () => {
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = 'Opening main browser…';
        }
      },
      { passive: true }
    );
  }

  function openInMainBrowser(url) {
    // Prefer assigning the primary scheme once (Android / desktop helpers)
    window.location.href = primaryEscapeHref(url);
    return true;
  }

  global.AnonBrowserGuard = {
    evaluate,
    isInAppBrowser,
    isRealSafari,
    isRealBrowser,
    detectBrowserName,
    detectHostApp,
    openInMainBrowser,
    primaryEscapeHref,
    armOpenBrowserLink,
    manualHint
  };
})(typeof window !== 'undefined' ? window : global);
