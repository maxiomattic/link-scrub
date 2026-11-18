# Status

- [x] Sanitizer with unit tests: X, YouTube, Instagram, Threads, TikTok, Spotify, Facebook, Reddit, LinkedIn
- [x] Page hook: writeText, write(ClipboardItem), setData, selection copy
- [x] DNR rules strip trackers from opened links
- [x] Popup cleans the current clipboard
- [x] End-to-end test in headless Chromium (16/16), also run against the zip downloaded from the live site
- [x] Website on Cloudflare Workers: https://link-scrub.careride.workers.dev
- [x] Public GitHub repo: https://github.com/maxiomattic/link-scrub
- [ ] Load into Brave on the laptop (manual: Load unpacked)
- [ ] Ideas: Firefox build, Chrome Web Store listing, more sites (Pinterest, Amazon, Google)

Release: bump `version` in manifest.json, `python3 build.py`, `npx wrangler deploy`, commit, push.
