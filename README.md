# Link Scrub

Link Scrub removes share trackers from links you copy or open on X, YouTube, Instagram, Threads, TikTok, Spotify, Facebook, Reddit and LinkedIn. Runs entirely offline; nothing leaves your browser.

**Website and download:** https://link-scrub.careride.workers.dev

Works in Brave, Chrome, Edge, Vivaldi and Opera (Manifest V3).

## Why

Share links carry tokens that tie the link back to whoever shared it. X's newer `a=` token, YouTube's `si=` and Instagram's `igsh=` let the site record that *you* shared a post and *who* opened your link. Removing them changes nothing about where the link goes.

## What it does

- **When you copy a link:** "Copy link" buttons, share sheets and Ctrl+C on any website. The link is cleaned before it reaches your clipboard.
- **When you open a link:** trackers are stripped before the browser requests the page (via `declarativeNetRequest`), so the site never receives the sharer's token.
- **Toolbar button:** cleans whatever is on your clipboard, for links copied from other apps.

## What it removes

| Site | Removed | Kept |
| --- | --- | --- |
| X / Twitter | `a` `s` `t` `ref_src` …; everything on post links | search terms |
| YouTube | `si` `pp` `feature` `ab_channel` and anything else | video, timestamp, playlist |
| Instagram | `igsh` `igshid` `igsi` `utm_*` | carousel position |
| Threads | `xmt` `slof` `igshid` | |
| TikTok | `_r` `_t` `is_from_webapp` `sender_device` and the rest | search terms |
| Spotify | `si` `pi` `nd` `dlsi` | everything else |
| Facebook | `mibextid` `rdid` `share_url` `fbclid` | post and photo IDs |
| Reddit | `share_id` `rdt` `utm_*` | comment context |
| LinkedIn | `rcm` `trk` `trackingId` `refId` `utm_*` | job IDs |

Short links (`vt.tiktok.com/…`, `spotify.link/…`, Reddit `/s/…`) hide the tracker inside the link itself and can't be cleaned without contacting the site, so they're left alone.

## Privacy

- No network access, no analytics, no storage, no background script. Extension pages run under `default-src 'none'`.
- On web pages it never reads the clipboard. A small hook rewrites only the text the page itself is writing (`clipboard.writeText`, `clipboard.write`, `DataTransfer.setData`, plain selection copies).
- The clipboard is read only when you click the toolbar button, inside the popup, and is dropped when the popup closes.
- No `externally_connectable`, no `web_accessible_resources`: no page or other extension can talk to it.

## Install

1. Download the zip from the [website](https://link-scrub.careride.workers.dev) and extract it.
2. Open `brave://extensions` (or `chrome://extensions`, `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and pick the `link-scrub` folder.

## Development

```
node --test test/sanitize.test.js                 # unit tests
node test/e2e.mjs /path/to/chromium [ext-dir]     # real-browser tests
python3 build.py                                  # zip + website into site/public
npx wrangler deploy                               # publish the site (Cloudflare Workers)
```

`sanitize.js` holds all the per-site rules. `rules.json` mirrors them for links you open.

## License

MIT
