/**
 * Browser guard — blocks social in-app webviews; Chrome-only for main page.
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
    /GSA\//i,
    /; wv\)/i,
    /WebView/i
  ];

  const REFERRER_PATTERNS = [
    /instagram\.com/i,
    /threads\.net/i,
    /facebook\.com/i,
    /fb\.com/i,
    /tiktok\.com/i,
    /snapchat\.com/i,
    /twitter\.com/i,
    /x\.com/i,
    /linkedin\.com/i
  ];

  function isInAppBrowser(ua) {
    const u = ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    if (IN_APP_PATTERNS.some((re) => re.test(u))) return true;

    // iOS WKWebView (no Safari token)
    if (/iPhone|iPod|iPad/i.test(u) && /AppleWebKit/i.test(u) && !/Safari/i.test(u)) {
      return true;
    }

    // Android embedded WebView
    if (/Android/i.test(u) && /Version\/[\d.]+/i.test(u) && /Chrome/i.test(u) && /wv/i.test(u)) {
      return true;
    }

    if (typeof document !== 'undefined') {
      const ref = document.referrer || '';
      if (REFERRER_PATTERNS.some((re) => re.test(ref))) return true;
    }

    // Meta / React Native bridges often present in in-app browsers
    if (typeof window !== 'undefined') {
      if (window.ReactNativeWebView) return true;
      if (window.webkit && window.webkit.messageHandlers) {
        const keys = Object.keys(window.webkit.messageHandlers || {});
        if (keys.some((k) => /instagram|facebook|meta|threads|barcelona/i.test(k))) return true;
      }
    }

    return false;
  }

  function isChrome(ua) {
    const u = ua || navigator.userAgent;
    if (isInAppBrowser(u)) return false;
    if (/Edg\//i.test(u)) return false;
    if (/OPR\//i.test(u) || /Opera/i.test(u)) return false;
    if (/SamsungBrowser/i.test(u)) return false;
    if (/Firefox|FxiOS/i.test(u)) return false;
    if (/CriOS/i.test(u)) return true;
    // Desktop / Android Chrome
    return /Chrome|Chromium/i.test(u) && /Google Inc|Chrome/i.test(navigator.vendor + u);
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
    if (/; wv\)/i.test(u) || /WebView/i.test(u)) return 'In-App WebView';
    if (/CriOS/i.test(u)) return 'Chrome (iOS)';
    if (/Chrome/i.test(u)) return 'Chrome';
    if (/Safari/i.test(u)) return 'Safari';
    if (/Firefox/i.test(u)) return 'Firefox';
    return 'Unknown';
  }

  function evaluate(config) {
    const ua = navigator.userAgent || '';
    const cfg = (config && config.browser) || {};
    const requireChrome = cfg.requireChrome !== false;
    const blockInApp = cfg.blockInAppBrowsers !== false;
    const loadMessage = 'For Loading purposes, this page requires to be loaded inside non web view.';

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

  function buildEscapeLinks(url) {
    const target = url || window.location.href;
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return [target];
    }

    const hostPath = parsed.host + parsed.pathname + parsed.search + parsed.hash;
    const httpsUrl = 'https://' + hostPath;
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const links = [];

    if (isAndroid) {
      // Default system browser / Chrome via VIEW intent (no forced package)
      links.push(
        'intent://' +
          hostPath +
          '#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=' +
          encodeURIComponent(httpsUrl) +
          ';end'
      );
      // Force Chrome
      links.push(
        'intent://' +
          hostPath +
          '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
          encodeURIComponent(httpsUrl) +
          ';end'
      );
      links.push('googlechrome://navigate?url=' + encodeURIComponent(httpsUrl));
      links.push(httpsUrl);
    } else if (isIOS) {
      links.push('x-safari-https://' + hostPath);
      links.push('googlechromes://' + hostPath);
      links.push('googlechrome://' + hostPath);
      links.push(httpsUrl);
    } else {
      links.push(httpsUrl);
    }

    return links;
  }

  function navigateViaAnchor(href) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function navigateViaIframe(href) {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = href;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 1500);
    } catch {
      /* ignore */
    }
  }

  function openInMainBrowser(url) {
    const links = buildEscapeLinks(url);
    const primary = links[0];

    // Same-gesture native navigation (works better inside Instagram)
    navigateViaAnchor(primary);
    navigateViaIframe(primary);

    try {
      window.location.href = primary;
    } catch {
      /* ignore */
    }

    // Cascade fallbacks if still stuck in the webview
    links.slice(1).forEach((href, i) => {
      setTimeout(() => {
        if (document.visibilityState !== 'visible') return;
        navigateViaAnchor(href);
        try {
          window.location.href = href;
        } catch {
          /* ignore */
        }
      }, 400 * (i + 1));
    });

    return primary;
  }

  function armOpenBrowserLink(anchorEl, url) {
    if (!anchorEl) return;
    const links = buildEscapeLinks(url);
    const primary = links[0];
    anchorEl.setAttribute('href', primary);
    anchorEl.setAttribute('target', '_blank');
    anchorEl.setAttribute('rel', 'noopener noreferrer');

    const fire = (e) => {
      // Do not preventDefault — let the <a> navigate natively
      openInMainBrowser(url || window.location.href);
      if (e && e.type === 'click') {
        // Keep default anchor nav as well
      }
    };

    anchorEl.addEventListener('touchstart', fire, { passive: true });
    anchorEl.addEventListener('pointerdown', fire, { passive: true });
    anchorEl.addEventListener('click', (e) => {
      fire(e);
    });
  }

  global.AnonBrowserGuard = {
    evaluate,
    isChrome,
    isInAppBrowser,
    detectBrowserName,
    openInMainBrowser,
    buildEscapeLinks,
    armOpenBrowserLink
  };
})(typeof window !== 'undefined' ? window : global);
