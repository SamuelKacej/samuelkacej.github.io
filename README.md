# Photo portfolio (GitHub Pages)

Dark portfolio site with a photo gallery and interactive 360° panoramas.

## Managing photos (no code needed)

Do everything on github.com in your repo:

- **Add:** open the `photos/` folder (normal photos) or `panos/` folder (360° panoramas) → **Add file → Upload files** → drag in your images → **Commit changes**.
- **Delete:** open the file → trash-can icon (⋯ menu → Delete file) → **Commit changes**.
- **Captions (optional):** edit `photos/captions.json` (or `panos/captions.json`), e.g. `{"IMG_001.jpg": "Sunrise over the lake"}`. Without a caption, the file name is used as the title.

About a minute after each commit, GitHub rebuilds and republishes the site automatically.

Panoramas must be **equirectangular** (2:1 ratio, as exported by 360° cameras and phone panorama modes). Formats: jpg, png, webp.

## One-time setup

1. Create a GitHub repo and upload everything in this folder.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and deploys. Your URL is `https://<username>.github.io/<repo>/`.

## Editing the text

Edit `src/index.html`: name, tagline, About text, email and social links. The header already has a commented-out **Shop** link and section placeholder.

## Image protection: what it does and doesn't do

- Right-click, drag-and-drop and long-press save are blocked, and photos are drawn as backgrounds with an invisible layer on top, so there's no "Save image as".
- The site only publishes **downsized copies** (1800 px photos, 6000 px panoramas). Your full-resolution originals in `photos/` and `panos/` are **not** deployed. Note that if the repo itself is public, anyone can still browse the originals on github.com. Use a private repo (GitHub Pages on private repos needs a paid plan) if that matters.
- A visitor can still take a screenshot or use browser DevTools to find the image URL. Nothing on the web can fully prevent that. To discourage reuse, set `WATERMARK_TEXT` in `scripts/build_site.py` (e.g. `"© Your Name"`).

## Local preview

```bash
pip install -r requirements.txt
python scripts/build_site.py
cd _site && python -m http.server 8000
```

Then open http://localhost:8000.
