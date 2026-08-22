/**
 * Browser guard — Chrome-only on main page; blocks in-app social webviews.
 */
(function (global) {
  'use strict';

  const IN_APP_PATTERNS = [
    /Instagram/i,
    /FBAN|FBAV|FB_IAB/i,
    /Twitter/i,
    /Threads/i,
    /TikTok|musical_ly/i,
    /Snapchat/i,
    /LinkedInApp/i,
    /Pinterest/i,
    /Line\//i,
    /KAKAOTALK/i,
    /MicroMessenger/i,
    /Weibo/i
  ];

  function isInAppBrowser(ua) {
    return IN_APP_PATTERNS.some((re) => re.test(ua));
  }

  function isChrome(ua) {
    const u = ua || navigator.userAgent;
    if (/Edg\//i.test(u)) return false;
    if (/OPR\//i.test(u)) return false;
    if (/SamsungBrowser/i.test(u)) return false;
    if (/Firefox/i.test(u)) return false;
    if (/CriOS/i.test(u)) return true;
    return /Chrome/i.test(u) && !/Chromium/i.test(u);
  }

  function detectBrowserName(ua) {
    const u = ua || navigator.userAgent;
    if (/Instagram/i.test(u)) return 'Instagram';
    if (/FBAN|FBAV/i.test(u)) return 'Facebook';
    if (/Twitter/i.test(u)) return 'X / Twitter';
    if (/Threads/i.test(u)) return 'Threads';
    if (/TikTok/i.test(u)) return 'TikTok';
    if (/Snapchat/i.test(u)) return 'Snapchat';
    if (/LinkedInApp/i.test(u)) return 'LinkedIn';
    if (/CriOS/i.test(u)) return 'Chrome (iOS)';
    if (/Chrome/i.test(u)) return 'Chrome';
    if (/Safari/i.test(u)) return 'Safari';
    if (/Firefox/i.test(u)) return 'Firefox';
    return 'Unknown';
  }

  function evaluate(config) {
    const ua = navigator.userAgent;
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
