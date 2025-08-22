# Sonce News Editor

A simple in-browser tool to generate Markdown news posts with YAML frontmatter for the Sonce website. Zero-backend, works locally and integrates directly with your static site repo structure.

## Highlights
- Clean form with Title, Date, Author, Slug, Summary, Tags, Hero Image URL/Alt
- Import existing `.md` to edit
- Markdown toolbar (H1/H2/H3, bold, italic, lists, quote, code, link)
- Live preview toggle next to the editor
- Image handling:
  - Optional hero image upload and automatic copy to `/static/uploads/news/YYYY/MM/`
  - Attachment images input and one-click insert into the body
- Smart summary generator from body
- Filename versioning to avoid collisions (`YYYY-MM-DD-slug[-2|-3…].md`)
- JSON entry copy/download for site integration
- Repo folder integration via File System Access API:
  - Save Markdown to `content/news/`
  - Auto-update `content/news/index.json`
  - Rebuild index from all Markdown posts
- Templates manager (save/apply/delete) via localStorage
- Drafts storage and ZIP export for offline batches

## Browser Usage
1. Open `index.html` in a Chromium-based browser (Chrome, Edge, Brave) for best compatibility.
2. Fill out the fields. Title and Body are required.
3. Use the toolbar to insert formatting without remembering Markdown.
4. Toggle Live Preview to see changes as you type.
5. Optional image options:
   - Set a Hero Image URL or upload a hero image to be copied into the repo on save.
   - Add attachment images and press “Insert Attachments” to embed them.
6. Click Preview or Download Markdown to save a single `.md` file.
7. Optionally click Copy/Download JSON Entry to integrate with your listing page logic.

### Connect to Repo and Save
- Click “Connect Repo Folder” and select your site repo root.
  - The editor writes to `content/news/` and `static/uploads/news/` under that root.
- Click “Save to Repo” to:
  - Copy images to `/static/uploads/news/YYYY/MM/`
  - Save the Markdown file to `content/news/`
  - Update `content/news/index.json`
- Click “Rebuild Index” to regenerate `index.json` from all posts in `content/news/`.

### Drafts and ZIP Export
- Use “Add to Drafts” to queue many posts offline.
- “Download Drafts ZIP” saves a `sonce-news-drafts.zip` containing `content/news/*.md` so you can unzip into your repo.
- “Clear Drafts” resets your local drafts.

### Templates
- Save frequently used setups (title, tags, author, body, etc.).
- Apply or delete templates anytime. Templates are stored locally in your browser.

## Frontmatter Example
```yaml
---
title: "News Title Here"
date: 2025-01-31
author: "Sindikata Sonce Koper"
image: "/static/uploads/news/2025/01/2025-01-31-post-hero.jpg"
imageAlt: "Short alt text for accessibility"
summary: "Short excerpt shown on the listing page"
tags: ["events", "community"]
---
```

## Node CLI (optional)
A minimal CLI is provided for scripted or terminal workflows.

Create a post and rebuild index:
```bash
node tools/news-cli.mjs create \
  --title "Title" \
  --date 2025-02-01 \
  --author "Sonce" \
  --tags "events, community" \
  --image ./path/to/local.jpg --copy-image \
  --body-file ./body.md \
  --root /path/to/site/repo
```

Rebuild index only:
```bash
node tools/news-cli.mjs rebuild-index --root /path/to/site/repo
```

Generate a slug:
```bash
node tools/news-cli.mjs slug "Some Title Here"
```

The CLI writes `.md` files to `content/news/` and `index.json` into the same folder under `--root`.

## Notes
- Use Chromium-based browsers to enable the File System Access “Connect Repo” flow.
- The site expects:
  - Markdown posts in `content/news/`
  - Listing data in `content/news/index.json`
  - Uploaded images under `static/uploads/news/YYYY/MM/`
- The editor sorts `index.json` by date descending.

## Development
The app is plain HTML, CSS, and JavaScript—no build step required. Open `index.html` directly or serve the folder with any static server.