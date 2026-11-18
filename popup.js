// Opening the popup cleans whatever is on the clipboard right now
// (covers links copied from the address bar or other apps).
// The text stays in this popup's memory only for this call.
'use strict';
const { sanitizeText } = globalThis.__linkScrub;
const msg = document.getElementById('msg');

function show(text, cls) { msg.textContent = text; msg.className = cls || ''; }

async function run() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return show('Clipboard has no text.');
    const cleaned = sanitizeText(text);
    if (cleaned === text) return show('Nothing to clean. Clipboard is already tidy.', 'ok');
    await navigator.clipboard.writeText(cleaned);
    show('Removed tracking from the link(s) on your clipboard.', 'ok');
  } catch (e) {
    show('Could not access the clipboard: ' + e.message, 'err');
  }
}

document.getElementById('again').addEventListener('click', run);
run();
