Dobrodošli v repozitorij Spletne Strani Pisarne Sonce.

⚠️ Lastnina in pravice: Vse vsebine, koda, dokumentacija in drugi materiali v tem repozitoriju so last avtorjev/lastnikov repozitorija Sonce.
Kopiranje, distribuiranje ali uporaba brez dovoljenja lastnika ni dovoljena.

Če imate vprašanja glede uporabe ali dovoljenj, nas kontaktirajte.

© 2025 Sonce. Vse pravice pridržane.
-----------------------------------------------------------------------------------------------------------


# Sonce-News-Editor — Compatibility & Implementation Guide

This document explains how to prepare content so it uploads cleanly and renders correctly on the main website and its generator. It also defines the editor’s UX requirements and the export formats for maximum compatibility.

If you only read one section, read the Integration Checklist and Front Matter Schema.

---

## TL;DR — Integration Checklist

- Use a single source file per post with YAML front matter + Markdown body
- File naming: `content/news/YYYY/MM/YYYY-MM-DD-slug.md`
- Slug: lowercase-kebab-case; ASCII; no spaces; max 60 chars; unique per year
- Date: ISO 8601 with timezone, e.g. `2025-02-08T10:15:00+02:00`
- Required front matter keys: `title`, `slug`, `date`, `author`, `description`, `tags`, `draft`, `cover_image`, `cover_image_alt`, `lang`, `version`
- Recommended: `canonical_url`, `updated_at`, `category`, `template`, `id`, `og_image`
- Images: placed under `content/news/YYYY/MM/slug/assets/` and referenced relative (`./assets/…`)
- All images must have meaningful `alt` text; include width/height if known
- Content: CommonMark + GFM (tables, task lists); no raw scripts/iframes
- Export both Markdown and sanitized HTML, plus a manifest with checksums
- Batch export as a ZIP: one folder per post + `batch_manifest.json`
- Validate before export: slugs, dates, links, images, headings, contrast, metadata
- Prefer WebP; include JPG/PNG fallback when transparency or compatibility needed

---

## Directory & File Layout

```
content/
  news/
    2025/
      02/
        2025-02-08-example-news-post.md
        2025-02-08-example-news-post/
          assets/
            cover.webp
            cover.jpg
            inline-1.webp
            attachment.pdf
public/          # Generated site output (read-only here)
``` 

- The Markdown file can live beside an `assets/` folder (either sibling or child). The editor will export a canonical relative path `./assets/filename.ext` regardless of on-disk layout at authoring time.

---

## Front Matter Schema (Required for Compatibility)

Use YAML front matter. Keys are chosen to map cleanly to Hugo, Jekyll, Astro, Next.js MDX pipelines.

```yaml
---
# Required
id: "2f6b93bc-0e89-4e65-8b57-9f2f1f2c6c3c"   # UUID v4 (stable per post)
title: "Example News Post"
slug: "example-news-post"                     # lowercase, kebab-case, ASCII
lang: "uk"                                    # BCP 47, e.g., "uk", "en"
date: "2025-02-08T10:15:00+02:00"            # ISO 8601 with timezone
author: "Sonce Press Team"
description: "One-sentence summary (≤160 chars) for SEO and previews."
tags: ["announcement", "legal"]              # 1–8 tags, lowercase kebab-case
category: "updates"                           # Optional, single category
draft: false
version: 3                                     # Monotonic integer or semver string

# Recommended
updated_at: "2025-02-08T12:00:00+02:00"
canonical_url: "https://example.com/news/example-news-post/"
cover_image: "./assets/cover.webp"            # Relative to the post file
cover_image_alt: "Court house facade at sunrise"
og_image: "./assets/cover.jpg"               # Optional social image (1200x630)
template: "announcement"                      # one of: announcement | legal-update | event-recap

# Optional extras
reading_minutes: 4
attributions:
  - name: "Photographer Name"
    url: "https://…"
    type: "photo"
seo:
  noindex: false
  structured_data:                            # JSON-LD snippet if the site supports it
    "@context": "https://schema.org"
    "@type": "NewsArticle"
    headline: "Example News Post"
---
```

Notes:
- Prefer YAML for broadest SSG compatibility. TOML or JSON are possible but not recommended unless your main site demands it.
- `version` increases on each meaningful content change (used for cache-busting and audit).
- `id` is stable; do not regenerate between edits.

---

## Markdown Content Guidelines

- Flavor: CommonMark + GitHub Flavored Markdown (tables, task lists, strikethrough)
- Avoid raw HTML except for semantic blocks (`figure`, `figcaption`, `details`, `summary`)
- Prohibited: `script`, `iframe`, inline event handlers; the generator will strip them
- Headings: start at `##` (H2) inside content; the page title is H1
- Images: prefer Markdown syntax with title as caption
  - `![Accessible alt text](./assets/inline-1.webp "Optional caption")`
- Figures: if captioning or credit is required, use HTML for clarity

```html
<figure>
  <img src="./assets/inline-1.webp" alt="Court house facade" width="1200" height="800" />
  <figcaption>Photo by Jane Doe</figcaption>
</figure>
```

---

## Image & Asset Rules

- Preferred formats: WebP (primary), JPG/PNG (fallback), SVG (icons/logos only)
- Dimensions: provide width/height attributes when known for CLS prevention
- Size limits: individual asset ≤ 5 MB; total assets per post ≤ 50 MB
- Filenames: lowercase, kebab-case, ASCII; include content hints (e.g., `court-house-exterior.webp`)
- Accessibility: meaningful `alt` required; omit “image of …” phrasing
- Relative paths only: `./assets/...` — no absolute or external hotlinks by default
- Optional PDF attachments allowed (linked, not embedded)

---

## Export Format (Single Post)

When exporting, produce a portable bundle containing:

```
example-news-post/
  post.md          # Markdown with YAML front matter
  post.html        # Sanitized HTML render of the content
  assets/          # Images & attachments referenced by the post
  manifest.json    # Machine-readable metadata for the uploader/generator
```

Example `manifest.json`:

```json
{
  "schemaVersion": "1.0.0",
  "generator": {
    "name": "sonce-news-editor",
    "version": "0.1.0"
  },
  "post": {
    "id": "2f6b93bc-0e89-4e65-8b57-9f2f1f2c6c3c",
    "slug": "example-news-post",
    "file": "post.md",
    "html": "post.html",
    "assetsDir": "assets",
    "exportedAt": "2025-02-08T12:30:00Z",
    "checksum": {
      "algorithm": "sha256",
      "postMd": "<sha256-hex>",
      "postHtml": "<sha256-hex>",
      "assets": {
        "cover.webp": "<sha256-hex>",
        "inline-1.webp": "<sha256-hex>"
      }
    }
  }
}
```

- Checksums are optional but recommended. If omitted, ensure the uploader validates file integrity via size and last-modified.

---

## Batch Export

- Zip multiple single-post bundles into one archive with a `batch_manifest.json` at root
- `batch_manifest.json` maps each post directory to its `id`, `slug`, and path to `manifest.json`

```json
{
  "schemaVersion": "1.0.0",
  "exportedAt": "2025-02-08T12:45:00Z",
  "posts": [
    { "dir": "example-news-post", "manifest": "example-news-post/manifest.json" },
    { "dir": "second-news-post", "manifest": "second-news-post/manifest.json" }
  ]
}
```

---

## Slug & Title Generation Rules

- Title case: AP-style where possible; otherwise capitalize significant words
- Slug derivation (deterministic):
  1. Lowercase
  2. Transliterate to ASCII (e.g., Ukrainian → Latin)
  3. Remove punctuation except hyphens
  4. Replace whitespace/underscores with single `-`
  5. Collapse multiple hyphens
  6. Trim leading/trailing hyphens
  7. Truncate to 60 chars
- Ensure uniqueness within the site’s expected permalink space: `/news/YYYY/MM/slug/`

---

## Tag Suggestion (Heuristic)

- Extract keywords from title + headings + first 250 words
- Remove stop words (per language) and short tokens (<3 chars)
- Rank by TF-IDF/Rapid RAKE; map to canonical tag aliases list
- Minimum confidence threshold; show top 5 suggestions, allow manual override

Optional: maintain a canonical tags list at `data/tags.json` with aliases:

```json
[
  { "tag": "announcement", "aliases": ["news", "update"] },
  { "tag": "legal", "aliases": ["law", "court", "judicial"] }
]
```

---

## Content Validation (Preflight)

- Front matter: required keys present; types; date parseable; lang valid BCP 47
- Slug: matches rules; unique against local index
- Images: referenced files exist; `alt` present; max size constraints
- Links: no broken relative links; HTTPS for external
- Headings: start at H2; no skipped levels; unique IDs
- Accessibility: color contrast for inline styles; descriptive link text
- SEO: `description` ≤ 160 chars; `title` ≤ 70 chars; `og_image` size 1200×630 if present
- HTML sanitizer: allowlist tags: `a, p, h2–h6, ul, ol, li, blockquote, code, pre, img, figure, figcaption, table, thead, tbody, tr, th, td, hr, strong, em, sup, sub, br, details, summary`

---

## UX Features (Implementation Spec)

### Drag-and-Drop Images
- Drop zone accepts images/PDF; paste from clipboard supported
- On drop: prompt for `alt`, optional caption; auto-rename to kebab-case
- Convert to WebP (quality 82) with JPG/PNG fallback when needed
- Insert Markdown image or `<figure>` depending on caption presence

### Auto-Save Drafts (localStorage)
- Key: `sonce:news-editor:post:<postId>:v1`
- Debounced 1–2 seconds; save on blur/unload
- Persist: front matter + Markdown body + caret position + unsaved assets map
- On load: offer restore if newer than filesystem version

### Version History
- IndexedDB store: immutable snapshots with `postId`, `version`, `timestamp`, `authorId`, `note`
- Diff view (side-by-side); revert creates a new version, does not delete history

### Inline Editing Hints
- Tooltip/cheat sheet toggle: Markdown basics, links, images, headings, tables
- Lint hints inline for missing `alt`, heading order, long lines, passive voice (optional)

### Keyboard Shortcuts
- Save: Ctrl/Cmd+S
- Preview toggle: Ctrl/Cmd+P
- Bold: Ctrl/Cmd+B; Italic: Ctrl/Cmd+I; Code: Ctrl/Cmd+`\``
- Headings H2–H4: Ctrl/Cmd+Alt+2/3/4
- Link: Ctrl/Cmd+K; Image: Ctrl/Cmd+Shift+I; List: Ctrl/Cmd+Shift+L
- Insert template: Ctrl/Cmd+T; Export: Ctrl/Cmd+E
- Undo/Redo: Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z

### Content Templates
- Built-in: `announcement`, `legal-update`, `event-recap`
- Each template pre-populates headings/sections and optional blocks (FAQ, CTA)

Example template body (Markdown):

```markdown
## Summary

- Key point 1
- Key point 2

## Details

<figure>
  <img src="./assets/cover.webp" alt="Descriptive alt" width="1200" height="800" />
  <figcaption>Optional caption or credit</figcaption>
</figure>

## Next Steps / Call to Action

- Contact: …
- Deadline: …
```

---

## Collaboration (Optional / Future-Ready)

- Roles: `admin`, `editor`, `commenter`, `viewer`
- Authentication: email-link or OAuth; JWT in HttpOnly cookies; CSRF protection
- Comments: per-selection or per-block annotations; export excluded
- Concurrency: plan for CRDT/OT but start with optimistic locking (compare `version`)
- Audit trail: append-only log of edits and exports per `postId`

---

## Configuration Surface

Use environment variables or a `config.json` loaded at runtime/build:

```json
{
  "siteBaseUrl": "https://example.com",
  "contentRoot": "content/news",
  "imageMaxWidth": 1600,
  "allowedExternalImageHosts": ["example-cdn.com"],
  "canonicalTagsPath": "data/tags.json",
  "defaultAuthor": "Sonce Press Team",
  "export": {
    "includeHtml": true,
    "includeChecksums": true
  }
}
```

---

## Generator Compatibility Notes

- Jekyll: YAML front matter supported out-of-the-box; permalink from path. Ensure `kramdown` GFM enabled for tables.
- Hugo: Place files under `content/news`; front matter is YAML/TOML/JSON; Markdown via Goldmark (enable GFM extensions: tables, task lists).
- Astro/Next.js (MD/MDX): YAML front matter parsed by loader; ensure MDX plugins for GFM if needed; sanitize HTML.
- All: avoid custom shortcodes unless mirrored on the main site; use pure Markdown/HTML.

---

## Uploader/Deployment Expectations

- Accepts ZIP containing single or multiple posts
- Validates `manifest.json` (when present) and front matter
- Copies assets under site’s static dir preserving relative paths
- Writes Markdown to `content/news/YYYY/MM/YYYY-MM-DD-slug.md`
- Optional HTML may be ignored by some generators; safe to include regardless

---

## QA Checklist Before Upload

- Title present; ≤70 chars; no trailing punctuation
- Description present; ≤160 chars; not identical to title
- Slug valid; unique for target month/year
- Date/time correct timezone; `updated_at` set on edits
- Tags chosen from canonical list; 1–8 items
- Cover image exists; alt text set; reasonable file size; social image 1200×630
- All images referenced and present; no external hotlinks unless whitelisted
- Headings hierarchical; start at H2; no single-child sections
- Links valid; `https://`; descriptive link text
- Markdown preview and HTML export look the same (sanitizer parity)
- Lint passes (front matter, links, images, accessibility)

---

## Troubleshooting

- Post not appearing: check file path and `draft` flag
- Broken images: verify relative path `./assets/...` and case-sensitive filenames
- Bad characters in slug: ensure transliteration step ran; no Unicode left
- HTML stripped: sanitizer removed disallowed tags; convert to Markdown or supported HTML
- Wrong date sorting: ensure ISO 8601 with timezone; generator might be UTC

---

## Change Management

- Bump `version` on edits; record `updated_at`
- Keep `id` stable for cross-system references
- Schema changes must bump `schemaVersion` in `manifest.json` and update importer

---

## Roadmap Hints (Editor)

- Add server-side image optimization/thumbnailing on upload
- Integrate grammar/language checks for Ukrainian and English
- Live preview parity with site styles via shadow DOM and shared CSS tokens
- Optional “legal-update” structured data block for search engines

---

## License and Credits

- Internal tool for Sonce — adapt freely within your organization
- Image credits must be honored per `attributions` when exporting/publishing
