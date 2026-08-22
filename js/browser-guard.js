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

  global.AnonBrowserGuard = { evaluate, isChrome, isInAppBrowser, detectBrowserName };
})(typeof window !== 'undefined' ? window : global);
