// End-to-end check in real headless Chromium with the extension loaded.
// Usage: node test/e2e.mjs <chromium-binary>
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ext = path.resolve(new URL('..', import.meta.url).pathname);
const extId = [...createHash('sha256').update(ext).digest('hex').slice(0, 32)]
  .map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
const page = readFileSync(new URL('page.html', import.meta.url));
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(page); }).listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const origin = `http://127.0.0.1:${srv.address().port}`;
const prof = mkdtempSync(path.join(tmpdir(), 'ls-e2e-'));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(process.argv[2], [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
  `--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

let ws, id = 0; const pending = new Map(); const events = [];
async function connect(url) {
  ws = new WebSocket(url);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else events.push(d); };
}
const send = (method, params = {}, sessionId) => new Promise((r) => {
  const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver;
for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); } }
await connect(ver.webSocketDebuggerUrl);

let fails = 0;
const check = (name, got, want) => { const ok = got === want; if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `\n   got:  ${got}\n   want: ${want}`}`); };

async function tab(url) {
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId); await send('Network.enable', {}, sessionId);
  await send('Page.navigate', { url }, sessionId); await sleep(1500);
  const ev = async (expression) => (await send('Runtime.evaluate',
    { expression, awaitPromise: true, userGesture: true, returnByValue: true }, sessionId)).result;
  return { sessionId, ev };
}
await send('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });

const p = await tab(origin + '/');
const read = async () => (await p.ev('navigator.clipboard.readText()')).result.value;
check('helper not left on page global', (await p.ev('typeof window.__linkScrub')).result.value, 'undefined');

await p.ev(`navigator.clipboard.writeText('https://x.com/jack/status/20?s=20&a=AbC')`);
check('X Copy link (writeText)', await read(), 'https://x.com/jack/status/20');

await p.ev(`navigator.clipboard.write([new ClipboardItem({'text/plain': new Blob(['https://www.youtube.com/watch?v=abc&si=Z&t=7'], {type:'text/plain'})})])`);
check('clipboard.write ClipboardItem', await read(), 'https://www.youtube.com/watch?v=abc&t=7');

await p.ev(`(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById('sel'));
  const s = getSelection(); s.removeAllRanges(); s.addRange(r); return document.execCommand('copy'); })()`);
check('select text + copy', await read(), 'Look at https://x.com/jack/status/20 now');

await p.ev(`(() => { const t = document.getElementById('ta'); t.focus(); t.select(); return document.execCommand('copy'); })()`);
check('textarea copy', await read(), 'https://youtu.be/abc?t=9');

await p.ev(`(() => { document.addEventListener('copy', e => { e.clipboardData.setData('text/plain', 'https://youtu.be/q?si=1'); e.preventDefault(); }, {once:true}); return document.execCommand('copy'); })()`);
check('page copy handler setData', await read(), 'https://youtu.be/q');

await p.ev(`navigator.clipboard.writeText('https://example.com/?a=1')`);
check('other sites untouched', await read(), 'https://example.com/?a=1');

// Popup cleans whatever is already on the clipboard (e.g. from the address bar).
await send('Browser.grantPermissions', { origin: `chrome-extension://${extId}`, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
// Put a dirty link on the clipboard from the extension page (no hook there), then re-run the popup.
const pop = await tab(`chrome-extension://${extId}/popup.html`);
await pop.ev(`navigator.clipboard.writeText('see https://x.com/u/status/9?a=TOKEN&s=20')`);
await pop.ev(`document.getElementById('again').click()`); await sleep(500);
check('popup clean', (await pop.ev('navigator.clipboard.readText()')).result.value, 'see https://x.com/u/status/9');
console.log('   popup says:', (await pop.ev(`document.getElementById('msg').textContent`)).result.value);

// Opening a tracked link: DNR strips params before the request leaves.
for (const [from, to] of [
  ['https://x.com/jack/status/20?s=20&a=AbC', 'https://x.com/jack/status/20'],
  ['https://youtu.be/dQw4w9WgXcQ?si=abc&t=4', 'https://youtu.be/dQw4w9WgXcQ?t=4'],
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=yg&si=a', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
]) {
  events.length = 0;
  const t = await tab(from);
  const reqs = events.filter((e) => e.method === 'Network.requestWillBeSent' && e.params.type === 'Document' && e.sessionId === t.sessionId).map((e) => e.params.request.url);
  check(`open ${from}`, reqs.includes(to) && reqs.indexOf(to) === 1 ? to : JSON.stringify(reqs.slice(0, 3)), to);
}

chrome.kill(); srv.close();
await new Promise((r) => chrome.once("exit", r));
rmSync(prof, { recursive: true, force: true, maxRetries: 5 });
console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
