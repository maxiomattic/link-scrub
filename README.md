# Link Scrub

Brave/Chrome extension (Manifest V3) that strips share trackers from X and YouTube links.

- **X:** `a=` (per-share account token), `s=`, `t=`, `ref_src`, etc. Post links lose their whole query string.
- **YouTube:** everything except what changes playback (`v`, `t`, `list`, `index`, …). Drops `si=`, `pp=`, `feature=`, `ab_channel`.

## What it does

1. **Copying in the browser:** when any page writes a link to the clipboard (X's "Copy link", YouTube's share "Copy", Ctrl+C on selected text), the link is cleaned before it reaches the clipboard.
2. **Opening a tracked link:** someone sends you `x.com/...?...&a=...`. The tracker is removed before the request leaves the browser, so X never gets their token and your address bar stays clean.
3. **Anything else** (links copied in other apps): click the toolbar icon. It cleans what's on the clipboard.

## Privacy

- No network access, no storage, no background script, no messaging. The extension pages' CSP blocks all connections (`default-src 'none'`).
- The page hook never *reads* the clipboard. It only rewrites text the page itself is writing.
- The clipboard is only read when you click the toolbar icon, inside the popup, and it's dropped when the popup closes.
- Nothing is exposed to pages or other extensions (no `externally_connectable`, no `web_accessible_resources`).

## Install

`brave://extensions` → turn on **Developer mode** → **Load unpacked** → pick this folder.

## Test

```
node --test test/sanitize.test.js
node test/e2e.mjs "$(nix build --no-link --print-out-paths nixpkgs#chromium)/bin/chromium"
```
