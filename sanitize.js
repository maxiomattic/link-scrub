// Pure, offline URL sanitizer. No network, no storage, no side effects.
// Shared by the page hook, the popup, and the Node tests.
(function (root) {
  'use strict';

  const X_HOSTS = /^(?:www\.|mobile\.)?(?:x|twitter)\.com$/i;
  const YT_HOSTS = /^(?:(?:www|m|music)\.)?youtube(?:-nocookie)?\.com$|^youtu\.be$/i;

  // X: on post/status/i links every query param is tracking. Elsewhere
  // (search, profiles) drop only known trackers so search keeps working.
  const X_DROP = new Set(['a', 's', 't', 'ref_src', 'ref_url', 'cn', 'refsrc', 'twclid']);
  const X_STRIP_ALL = /\/status(?:es)?\/|^\/i\//i;

  // YouTube: keep only params that change what plays; everything else
  // (si, pp, feature, ab_channel, embeds_*, ...) goes.
  const YT_KEEP = new Set([
    'v', 't', 'start', 'end', 'time_continue', 'list', 'index',
    'search_query', 'sp', 'lc', 'q',
  ]);

  function keyOf(segment) {
    const k = segment.split('=')[0];
    try { return decodeURIComponent(k.replace(/\+/g, ' ')).toLowerCase(); }
    catch { return k.toLowerCase(); }
  }

  // Clean one absolute URL string. Returns the original string untouched
  // when nothing needs removing, so formatting is never altered needlessly.
  function sanitizeUrl(raw) {
    let u;
    try { u = new URL(raw); } catch { return raw; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return raw;

    const host = u.hostname;
    let keep;
    if (X_HOSTS.test(host)) {
      keep = X_STRIP_ALL.test(u.pathname) ? () => false : (k) => !X_DROP.has(k);
    } else if (YT_HOSTS.test(host)) {
      keep = (k) => YT_KEEP.has(k);
    } else {
      return raw;
    }

    // Work on the raw string so kept params keep their exact encoding.
    const hashAt = raw.indexOf('#');
    const beforeHash = hashAt === -1 ? raw : raw.slice(0, hashAt);
    const hash = hashAt === -1 ? '' : raw.slice(hashAt);
    const qAt = beforeHash.indexOf('?');
    if (qAt === -1) return raw;

    const base = beforeHash.slice(0, qAt);
    const segs = beforeHash.slice(qAt + 1).split('&').filter(Boolean);
    const kept = segs.filter((s) => keep(keyOf(s)));
    if (kept.length === segs.length && segs.length > 0) return raw;
    return base + (kept.length ? '?' + kept.join('&') : '') + hash;
  }

  const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
  const TRAILING = /[)\].,;:!?'"]+$/;

  // Clean every X/YouTube URL inside a block of text.
  // html=true handles &amp; inside attribute values.
  function sanitizeText(text, html) {
    if (typeof text !== 'string' || text.indexOf('http') === -1) return text;
    return text.replace(URL_RE, (m) => {
      const tail = (m.match(TRAILING) || [''])[0];
      let url = tail ? m.slice(0, -tail.length) : m;
      if (html) url = url.replace(/&amp;/g, '&');
      let clean = sanitizeUrl(url);
      if (clean === url) return m;
      if (html) clean = clean.replace(/&/g, '&amp;');
      return clean + tail;
    });
  }

  const api = { sanitizeUrl, sanitizeText };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.__linkScrub = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
