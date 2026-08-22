/**
 * Browser guard — blocks social in-app webviews only.
 * Safari / Chrome / Firefox are allowed.
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
    // Real iOS/macOS Safari (not Instagram/Chrome disguised)
    return (
      /Safari/i.test(u) &&
      !/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|Barcelona|Threads|TikTok/i.test(u)
    );
  }

  function isRealBrowser(ua) {
    const u = ua || navigator.userAgent || '';
    if (isInAppBrowser(u)) return false;
    if (isRealSafari(u)) return true;
    if (/CriOS/i.test(u)) return true; // Chrome iOS
    if (/FxiOS/i.test(u)) return true; // Firefox iOS
    if (/EdgiOS|Edg\//i.test(u)) return true;
    if (/Chrome/i.test(u) && !/；\s*wv\)/i.test(u)) return true;
    if (/Firefox/i.test(u)) return true;
    return false;
  }

  function isInAppBrowser(ua) {
    const u = ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '');

    // Never treat real Safari as an in-app browser
    if (isRealSafari(u)) return false;

    if (IN_APP_PATTERNS.some((re) => re.test(u))) return true;

    // iOS WKWebView (no Safari token) — Instagram / embedded browsers
    if (/iPhone|iPod|iPad/i.test(u) && /AppleWebKit/i.test(u) && !/Safari/i.test(u)) {
      return true;
    }

    // Android embedded WebView
    if (/Android/i.test(u) && /Version\/[\d.]+/i.test(u) && /Chrome/i.test(u) && /wv/i.test(u)) {
      return true;
    }

    // Meta / React Native bridges (not present in Safari)
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

  function isChrome(ua) {
    const u = ua || navigator.userAgent;
    if (isInAppBrowser(u)) return false;
    if (/CriOS/i.test(u)) return true;
    return /Chrome|Chromium/i.test(u) && !/Edg\//i.test(u);
  }

  function detectBrowserName(ua) {
    const u = ua || navigator.userAgent;
    if (/Instagram/i.test(u)) return 'Instagram';
    if (/Barcelona|Threads/i.test(u)) return 'Threads';
    if (/FBAN|FBAV|FB_IAB/i.test(u)) return 'Facebook';
    if (/Twitter/i.test(u)) return 'X / Twitter';
    if (/TikTok|musical_ly|Bytedance/i.test(u)) return 'TikTok';
    if (/Snapchat/i.test(u)) return 'Snapchat';
    if (/LinkedInApp/i.test(u)) return 'LinkedIn';
    if (/; wv\)/i.test(u)) return 'In-App WebView';
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
    // Default: do NOT require Chrome — Safari must work
    const requireChrome = cfg.requireChrome === true;
    const blockInApp = cfg.blockInAppBrowsers !== false;
    const loadMessage = 'For Loading purposes, this page requires to be loaded inside non web view.';

    // Always allow real Safari / Chrome / Firefox
    if (isRealBrowser(ua)) {
      return { allowed: true, browser: detectBrowserName(ua) };
    }

    if (blockInApp && isInAppBrowser(ua)) {
      return {
        allowed: false,
        reason: 'in_app',
        browser: detectBrowserName(ua),
        message: loadMessage
      };
    }

    if (requireChrome && !isChrome(ua)) {
      return {
        allowed: false,
        reason: 'not_chrome',
        browser: detectBrowserName(ua),
        message: loadMessage
      };
    }

    return { allowed: true, browser: detectBrowserName(ua) };
  }

  function safariEscapeUrl(url) {
    const target = url || window.location.href;
    try {
      const parsed = new URL(target);
      return (
        'x-safari-https://' +
        parsed.host +
        parsed.pathname +
        parsed.search +
        parsed.hash
      );
    } catch {
      return target.replace(/^https:\/\//i, 'x-safari-https://');
    }
  }

  function httpsUrl(url) {
    try {
      return new URL(url || window.location.href).href;
    } catch {
      return url || window.location.href;
    }
  }

  function buildEscapeLinks(url) {
    const target = httpsUrl(url);
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return [target];
    }

    const hostPath = parsed.host + parsed.pathname + parsed.search + parsed.hash;
    const plain = 'https://' + hostPath;
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const links = [];

    if (isAndroid) {
      links.push(
        'intent://' +
          hostPath +
          '#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=' +
          encodeURIComponent(plain) +
          ';end'
      );
      links.push(
        'intent://' +
          hostPath +
          '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
          encodeURIComponent(plain) +
          ';end'
      );
      links.push(plain);
    } else if (isIOS) {
      // Safari deep link first — must be a real <a href> tap (no JS cancel)
      links.push(safariEscapeUrl(plain));
      links.push(plain);
    } else {
      links.push(plain);
    }

    return links;
  }

  /**
   * iPhone Instagram: only a native <a href="x-safari-https://..."> tap works.
   * Extra JS location changes cancel the gesture — do not interfere on iOS.
   */
  function armOpenBrowserLink(anchorEl, url) {
    if (!anchorEl) return;

    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const plain = httpsUrl(url);
    const safariLink = safariEscapeUrl(plain);

    if (isIOS) {
      // Pure Safari escape — no target=_blank, no JS hijack on click
      anchorEl.setAttribute('href', safariLink);
      anchorEl.removeAttribute('target');
      anchorEl.setAttribute('rel', 'noopener noreferrer');

      // Soft status only — do not call preventDefault or location.href
      anchorEl.addEventListener(
        'click',
        () => {
          const statusEl = document.getElementById('guard-open-status');
          if (statusEl) {
            statusEl.hidden = false;
            statusEl.textContent = 'Opening Safari…';
          }
        },
        { passive: true }
      );
      return;
    }

    if (isAndroid) {
      const intent = buildEscapeLinks(plain)[0];
      anchorEl.setAttribute('href', intent);
      anchorEl.removeAttribute('target');
      anchorEl.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    // Desktop
    anchorEl.setAttribute('href', plain);
    anchorEl.setAttribute('target', '_blank');
    anchorEl.setAttribute('rel', 'noopener noreferrer');
  }

  function openInMainBrowser(url) {
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    // iOS: only navigate via assigning the safari scheme once
    if (isIOS) {
      window.location.href = safariEscapeUrl(url);
      return true;
    }

    const links = buildEscapeLinks(url);
    try {
      window.location.href = links[0];
    } catch {
      window.location.href = httpsUrl(url);
    }
    return true;
  }

  global.AnonBrowserGuard = {
    evaluate,
    isChrome,
    isInAppBrowser,
    isRealSafari,
    isRealBrowser,
    detectBrowserName,
    openInMainBrowser,
    buildEscapeLinks,
    armOpenBrowserLink,
    safariEscapeUrl
  };
})(typeof window !== 'undefined' ? window : global);
