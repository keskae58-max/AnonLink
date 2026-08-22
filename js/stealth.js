/**
 * Stealth channel resolver — no plaintext URLs in source or DOM.
 * Segments are shuffled at rest and reassembled only on user gesture.
 */
(function (global) {
  'use strict';

  const ORDER_KEY = '_s0';

  function b64Decode(str) {
    try {
      return atob(str);
    } catch {
      return '';
    }
  }

  function shuffleRestore(segments, inverse) {
    if (!Array.isArray(segments) || !Array.isArray(inverse)) return '';
    const buf = new Array(segments.length);
    for (let origIdx = 0; origIdx < segments.length; origIdx++) {
      buf[origIdx] = b64Decode(segments[inverse[origIdx]]);
    }
    return buf.join('');
  }

  function deriveOrder(len, seed) {
    const arr = Array.from({ length: len }, (_, i) => i);
    let s = seed;
    for (let i = len - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function encodeSegments(url) {
    const chunkSize = Math.max(2, Math.ceil(url.length / 4));
    const parts = [];
    for (let i = 0; i < url.length; i += chunkSize) {
      parts.push(btoa(url.slice(i, i + chunkSize)));
    }
    const order = deriveOrder(parts.length, url.length * 7919);
    const shuffled = order.map((idx) => parts[idx]);
    const inverse = new Array(order.length);
    order.forEach((origIdx, pos) => {
      inverse[origIdx] = pos;
    });
    return { segments: shuffled, order: inverse };
  }

  function resolveChannel(config) {
    const ch = config && config.channel;
    if (!ch || !ch.segments) return '';
    const inverse = ch.order;
    if (!inverse) {
      return ch.segments.map(b64Decode).join('');
    }
    return shuffleRestore(ch.segments, inverse);
  }

  function openChannel(config) {
    const target = resolveChannel(config);
    if (!target) return false;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (w) {
      w.opener = null;
      w.location.replace(target);
    }
    return true;
  }

  async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return Array.from(new Uint8Array(bits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  global.AnonStealth = {
    encodeSegments,
    resolveChannel,
    openChannel,
    hashPassword,
    ORDER_KEY
  };
})(typeof window !== 'undefined' ? window : global);
