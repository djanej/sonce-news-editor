# Sonce News Editor

A simple in-browser tool to generate Markdown news posts with YAML frontmatter for the Sonce website.

## Features
- Form fields: Title, Date, Author (optional), Hero Image URL (optional), Body (Markdown), Tags/Category (optional)
- One-click Preview (renders Markdown, omits frontmatter)
- Download a `.md` file using a slugified filename: `YYYY-MM-DD-news-title.md`
- No backend, all processing happens locally in your browser

## Usage
1. Open `index.html` in your browser.
2. Fill in the form fields.
   - Date defaults to today but can be changed.
   - Tags: enter comma-separated values (e.g., `events, community`).
3. Click **Preview** to see how the body renders.
4. Click **Download Markdown** to save a `.md` file.
5. Upload the downloaded file (and any images) to the main site as needed.

## Frontmatter Example
```yaml
---
title: "News Title Here"
date: 2025-01-31
author: "Sindikata Sonce Koper"
image: "/uploads/news/hero-image.jpg"
tags: ["tag1", "tag2"]
---
```

The body content follows below the frontmatter and supports standard Markdown.

## Sample Images
A placeholder hero image is available in `sample-images/placeholder-hero.svg`.

## Development
The app is plain HTML, CSS, and JavaScript—no build step required. Open `index.html` directly or serve the folder with any static server.