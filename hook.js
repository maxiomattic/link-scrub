// Runs in the page's own JS world at document_start, so it can rewrite
// what the page puts on the clipboard (e.g. X's "Copy link", YouTube's
// share "Copy"). It only transforms text the page is already writing:
// it never reads the clipboard, stores nothing, and sends nothing anywhere.
(function () {
  'use strict';
  const api = globalThis.__linkScrub;
  if (!api) return;
  // Don't leave the helper on the page's global object.
  try { delete globalThis.__linkScrub; } catch {}
  const clean = api.sanitizeText;

  const TEXTY = /^text\/(plain|html|uri-list)$/i;
  const isHtml = (t) => /html/i.test(t);

  // navigator.clipboard.writeText(text)
  const C = globalThis.Clipboard && Clipboard.prototype;
  if (C && C.writeText) {
    const orig = C.writeText;
    C.writeText = function (text) {
      return orig.call(this, clean(String(text)));
    };
  }

  // navigator.clipboard.write([ClipboardItem])
  if (C && C.write && globalThis.ClipboardItem) {
    const origWrite = C.write;
    const CI = ClipboardItem;
    C.write = function (items) {
      try {
        items = Array.from(items, (item) => {
          if (!item || !item.types || !item.types.some((t) => TEXTY.test(t))) return item;
          const parts = {};
          for (const type of item.types) {
            parts[type] = TEXTY.test(type)
              ? item.getType(type).then((b) => b.text())
                  .then((s) => new Blob([clean(s, isHtml(type))], { type }))
              : item.getType(type);
          }
          return new CI(parts, item.presentationStyle ? { presentationStyle: item.presentationStyle } : undefined);
        });
      } catch {}
      // Called synchronously so the user's click still counts as the gesture.
      return origWrite.call(this, items);
    };
  }

  // e.clipboardData.setData(...) inside copy handlers / execCommand('copy')
  const D = globalThis.DataTransfer && DataTransfer.prototype;
  if (D && D.setData) {
    const origSet = D.setData;
    D.setData = function (type, data) {
      if (TEXTY.test(type) || /^text$/i.test(type)) data = clean(String(data), isHtml(type));
      return origSet.call(this, type, data);
    };
  }

  // Plain Ctrl+C of selected text that the page didn't handle itself.
  // Bubble phase on window = runs after the page's own handlers.
  window.addEventListener('copy', (e) => {
    if (e.defaultPrevented || !e.clipboardData) return;
    let text = '';
    const el = document.activeElement;
    if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') &&
        typeof el.selectionStart === 'number') {
      text = el.value.slice(el.selectionStart, el.selectionEnd);
    } else {
      const sel = document.getSelection();
      text = sel ? sel.toString() : '';
    }
    if (!text) return;
    const cleaned = clean(text);
    if (cleaned === text) return; // leave rich copies alone if nothing to fix
    e.clipboardData.setData('text/plain', cleaned);
    e.preventDefault();
  });
})();
