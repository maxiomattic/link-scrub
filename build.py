#!/usr/bin/env python3
"""Package the extension into a zip for the website and copy the shared sanitizer.

Usage: python3 build.py
"""
import json, pathlib, shutil, zipfile

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "site" / "public"
FILES = ["manifest.json", "sanitize.js", "hook.js", "rules.json",
         "popup.html", "popup.css", "popup.js", "LICENSE",
         "icons/16.png", "icons/48.png", "icons/128.png"]

version = json.loads((ROOT / "manifest.json").read_text())["version"]
dl = OUT / "download"
dl.mkdir(parents=True, exist_ok=True)
for old in dl.glob("link-scrub-*.zip"):
    old.unlink()
zip_path = dl / f"link-scrub-{version}.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for f in FILES:
        info = zipfile.ZipInfo(f"link-scrub/{f}", date_time=(2026, 1, 1, 0, 0, 0))
        info.external_attr = 0o644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, (ROOT / f).read_bytes())
shutil.copy(ROOT / "sanitize.js", OUT / "sanitize.js")
(OUT / "version.json").write_text(json.dumps(
    {"version": version, "file": f"/download/{zip_path.name}", "bytes": zip_path.stat().st_size}) + "\n")
# Render the site from site/src.
src = ROOT / "site" / "src"
kb = max(1, round(zip_path.stat().st_size / 1024))
for name in ("style.css", "app.js"):
    shutil.copy(src / name, OUT / name)
html = (src / "index.html").read_text()
for k, v in {"{{VERSION}}": version, "{{ZIP}}": f"/download/{zip_path.name}", "{{KB}}": str(kb)}.items():
    html = html.replace(k, v)
(OUT / "index.html").write_text(html)
print(zip_path.relative_to(ROOT), zip_path.stat().st_size, "bytes")
