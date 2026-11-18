// Pure, offline URL sanitizer. No network, no storage, no side effects.
// Shared by the page hook, the popup, the website demo, and the Node tests.
(function (root) {
  'use strict';

  const UTM = (k) => k.startsWith('utm_');
  const drop = (set, extra) => (k) => !(set.has(k) || (extra && extra(k)));
  const keepOnly = (set) => (k) => set.has(k);
  const none = () => false;

  // Each site: host test + a function (pathname) => (key) => keep?
  const SITES = [
    {
      name: 'X',
      host: /^(?:www\.|mobile\.)?(?:x|twitter)\.com$/,
      // Post links: every param is tracking. Elsewhere keep search params.
      rule: (p) => (/\/status(?:es)?\/|^\/i\//.test(p) ? none
        : drop(new Set(['a', 's', 't', 'ref_src', 'ref_url', 'cn', 'refsrc', 'twclid']), UTM)),
    },
    {
      name: 'YouTube',
      host: /^(?:(?:www|m|music)\.)?youtube(?:-nocookie)?\.com$|^youtu\.be$/,
      // Keep only what changes playback; si, pp, feature, ab_channel, is... go.
      rule: () => keepOnly(new Set(['v', 't', 'start', 'end', 'time_continue', 'list',
        'index', 'search_query', 'sp', 'lc', 'q'])),
    },
    {
      name: 'Instagram',
      host: /^(?:www\.|m\.)?instagram\.com$/,
      rule: () => drop(new Set(['igsh', 'igshid', 'igsi', 'ig_rid', 'ig_mid', 'hl']), UTM),
    },
    {
      name: 'Threads',
      host: /^(?:www\.)?threads\.(?:net|com)$/,
      rule: () => drop(new Set(['xmt', 'slof', 'igsh', 'igshid', 'igsi', 'hl']), UTM),
    },
    {
      name: 'TikTok',
      host: /^(?:(?:www|m)\.)?tiktok\.com$/,
      rule: () => keepOnly(new Set(['q', 'lang'])),
    },
    {
      name: 'Spotify',
      host: /^open\.spotify\.com$/,
      rule: () => drop(new Set(['si', 'pi', 'nd', 'dlsi', 'go', 'sp_cid', 'pt', 'pt_success']), UTM),
    },
    {
      name: 'Facebook',
      host: /^(?:(?:www|m|web|mbasic)\.)?facebook\.com$|^fb\.watch$/,
      rule: () => drop(new Set(['mibextid', 'rdid', 'share_url', 'sfnsn', 'fbclid', 'ref',
        '__cft__[0]', '__tn__', 'paipv', 'eav', 'extid']), UTM),
    },
    {
      name: 'Reddit',
      host: /^(?:(?:www|old|new|np|m)\.)?reddit\.com$/,
      rule: () => drop(new Set(['share_id', 'rdt', 'ref', 'ref_source', 'ref_campaign',
        'post_fullname', '$deep_link', 'correlation_id', 'post_index']), UTM),
    },
    {
      name: 'LinkedIn',
      host: /^(?:(?:www|[a-z]{2})\.)?linkedin\.com$/,
      rule: () => drop(new Set(['rcm', 'trk', 'trkinfo', 'trackingid', 'lipi', 'refid',
        'midtoken', 'midsig', 'eid', 'otptoken', 'originalsubdomain']), UTM),
    },
  ];

  function keyOf(segment) {
    const k = segment.split('=')[0];
    try { return decodeURIComponent(k.replace(/\+/g, ' ')).toLowerCase(); }
    catch { return k.toLowerCase(); }
  }

  function siteFor(host) {
    host = host.toLowerCase();
    return SITES.find((s) => s.host.test(host)) || null;
  }

  // Split a URL into pieces and mark which query params are removed.
  // Returns null for URLs we don't handle.
  function analyze(raw) {
    let u;
    try { u = new URL(raw); } catch { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const site = siteFor(u.hostname);
    if (!site) return null;
    const keep = site.rule(u.pathname);

    // Work on the raw string so kept params keep their exact encoding.
    const hashAt = raw.indexOf('#');
    const beforeHash = hashAt === -1 ? raw : raw.slice(0, hashAt);
    const hash = hashAt === -1 ? '' : raw.slice(hashAt);
    const qAt = beforeHash.indexOf('?');
    const base = qAt === -1 ? beforeHash : beforeHash.slice(0, qAt);
    const params = qAt === -1 ? []
      : beforeHash.slice(qAt + 1).split('&').filter(Boolean)
        .map((seg) => ({ seg, keep: keep(keyOf(seg)) }));
    return { site: site.name, base, params, hash, hadQuery: qAt !== -1 };
  }

  // Clean one absolute URL string. Returns the original string untouched
  // when nothing needs removing, so formatting is never altered needlessly.
  function sanitizeUrl(raw) {
    const a = analyze(raw);
    if (!a || !a.hadQuery) return raw;
    const kept = a.params.filter((p) => p.keep).map((p) => p.seg);
    if (kept.length === a.params.length && kept.length > 0) return raw;
    return a.base + (kept.length ? '?' + kept.join('&') : '') + a.hash;
  }

  const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
  const TRAILING = /[)\].,;:!?'"]+$/;

  // Clean every supported URL inside a block of text.
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

  const api = { sanitizeUrl, sanitizeText, analyze, sites: SITES.map((s) => s.name) };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.__linkScrub = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
