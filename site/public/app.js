'use strict';
const { analyze, sanitizeText } = globalThis.__linkScrub;
const $ = (id) => document.getElementById(id);
const input = $('in'), diff = $('diff'), verdict = $('verdict'), copyBtn = $('copy');
const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = text;
  return e;
}

// Show each link with its removed params struck through.
function render() {
  const text = input.value.trim();
  diff.replaceChildren();
  let removed = 0, sites = new Set(), links = 0, last = 0;
  for (const m of text.matchAll(URL_RE)) {
    links++;
    diff.append(el('span', 'other', text.slice(last, m.index)));
    last = m.index + m[0].length;
    const a = analyze(m[0].replace(/[)\].,;:!?'"]+$/, ''));
    if (!a) { diff.append(el('span', 'other', m[0])); continue; }
    sites.add(a.site);
    diff.append(el('span', 'k', a.base));
    let sep = '?';
    let first = true;
    for (const p of a.params) {
      if (p.keep) {
        diff.append(el('span', 'k', (first ? '?' : '&') + p.seg));
        first = false;
      } else {
        removed++;
        diff.append(el('del', '', sep + p.seg));
      }
      sep = '&';
    }
    if (a.hadQuery && a.params.length === 0) diff.append(el('del', '', '?'));
    diff.append(el('span', 'k', a.hash));
  }
  diff.append(el('span', 'other', text.slice(last)));

  const cleaned = sanitizeText(text);
  copyBtn.disabled = !text;
  copyBtn.dataset.value = cleaned;
  if (!text) verdict.textContent = 'Paste a link to see what gets removed.';
  else if (!links) verdict.textContent = "That doesn't look like a link. Links start with https://";
  else if (!sites.size) verdict.textContent = "Link Scrub doesn't clean links from this site. It's left exactly as it is.";
  else if (!removed) verdict.textContent = 'This link is already clean.';
  else verdict.textContent = `Removed ${removed} tracking parameter${removed === 1 ? '' : 's'}.`;
}

async function copy(btn, value, label) {
  try {
    await navigator.clipboard.writeText(value);
    btn.textContent = 'Copied';
  } catch {
    btn.textContent = "Couldn't copy";
  }
  setTimeout(() => { btn.textContent = label; }, 1600);
}

input.addEventListener('input', render);
copyBtn.addEventListener('click', () => copy(copyBtn, copyBtn.dataset.value, 'Copy clean link'));
document.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', () => {
  input.value = b.dataset.sample;
  render();
}));
render();

// Point the install step at the right extensions page.
const ua = navigator.userAgent;
let page = 'chrome://extensions', name = 'Chrome';
if (navigator.brave) { page = 'brave://extensions'; name = 'Brave'; }
else if (/Edg\//.test(ua)) { page = 'edge://extensions'; name = 'Edge'; }
else if (/OPR\//.test(ua)) { page = 'opera://extensions'; name = 'Opera'; }
else if (/Vivaldi/.test(ua)) { page = 'vivaldi://extensions'; name = 'Vivaldi'; }
else if (/Firefox\//.test(ua)) { name = 'Firefox'; }
$('ext-url').textContent = page;
$('browser-hint').textContent = name === 'Firefox'
  ? "You're on Firefox, which Link Scrub doesn't support yet. These steps are for Chromium browsers."
  : `Looks like you're using ${name}. On another browser, use brave://, edge:// or chrome://extensions.`;
$('copy-ext').addEventListener('click', (e) => copy(e.currentTarget, page, 'Copy'));
