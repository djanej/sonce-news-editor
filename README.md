# Sonce News Editor ☀️

A beautiful, modern Markdown news editor with a warm sun-inspired design. Generate professional news posts with YAML frontmatter, complete with image management, templates, and version control.

## ✨ Features

- **Beautiful Sun-Inspired UI** - Warm colors, smooth animations, and modern design
- **Markdown Editor** - Full-featured editor with toolbar and live preview
- **Image Management** - Drag & drop images, hero images, and attachments
- **Templates** - Save and reuse post templates
- **Version Control** - Track changes and restore previous versions
- **Auto-save** - Never lose your work with automatic saving
- **Export Options** - Download Markdown, JSON, or complete bundles
- **Repository Integration** - Save directly to your content repository
- **Responsive Design** - Works perfectly on all devices

## 🎯 Main Website Compatibility Guidelines

This section contains **ALL** the information you need to make generated news posts work 100% with the main website.

### 📁 Required File Structure

Your main website must have this exact directory structure:

```
your-website/
├── content/
│   └── news/                    # News posts directory
│       ├── index.json           # Auto-generated index file
│       └── YYYY-MM-DD-slug.md   # Individual post files
├── static/
│   └── uploads/
│       └── news/                # News images directory
│           ├── YYYY/            # Year folders
│           │   └── MM/          # Month folders
│           │       └── YYYY-MM-DD-slug-hero.ext
│           └── hero-image.jpg   # Direct hero images
└── tools/
    └── news-cli.mjs            # CLI tool for automation
```

### 🏷️ Frontmatter Fields (YAML)

Every news post **MUST** have this exact frontmatter structure:

```yaml
---
title: "Your Post Title"
date: 2024-01-15
author: "Author Name"
slug: "optional-custom-slug"
image: "/static/uploads/news/2024/01/2024-01-15-slug-hero.jpg"
imageAlt: "Alt text for accessibility"
summary: "Short excerpt shown on listing pages"
tags: [news, community, events]
---
```

#### Frontmatter Field Requirements:

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `title` | ✅ Yes | String | Post title (max 100 chars) | `"Community Event Announcement"` |
| `date` | ✅ Yes | Date | Publication date (YYYY-MM-DD) | `2024-01-15` |
| `author` | ❌ No | String | Author name | `"John Doe"` |
| `slug` | ❌ No | String | URL slug (auto-generated if empty) | `"community-event"` |
| `image` | ❌ No | String | Hero image path | `/static/uploads/news/2024/01/image.jpg` |
| `imageAlt` | ❌ No | String | Image alt text | `"People at community event"` |
| `summary` | ❌ No | String | Short excerpt (max 200 chars) | `"Join us for our annual..."` |
| `tags` | ❌ No | Array | Comma-separated tags | `[news, community, events]` |

### 📝 File Naming Rules

**CRITICAL**: Post files must follow this exact naming convention:

```
YYYY-MM-DD-slug.md
```

Examples:
- `2024-01-15-community-event.md`
- `2024-03-20-spring-announcement.md`
- `2024-12-25-holiday-update.md`

#### Naming Rules:
- **Date format**: Must be `YYYY-MM-DD` (ISO format)
- **Slug format**: Lowercase, hyphens only, no spaces
- **File extension**: Must be `.md` (Markdown)
- **No special characters**: Only letters, numbers, and hyphens
- **Max length**: Total filename should be under 100 characters

### 🖼️ Image Management Rules

#### Hero Images:
- **Path format**: `/static/uploads/news/YYYY/MM/YYYY-MM-DD-slug-hero.ext`
- **Directory structure**: Images are automatically organized by year/month
- **File naming**: `YYYY-MM-DD-slug-hero.ext`
- **Supported formats**: JPG, PNG, GIF, WebP, SVG
- **Recommended size**: 1200x630px (16:9 ratio)
- **Max file size**: 5MB

#### Additional Images:
- **Path format**: `/static/uploads/news/YYYY/MM/YYYY-MM-DD-slug-{description}.ext`
- **Multiple images**: Can have multiple attachments
- **Auto-organization**: Automatically placed in date-based folders

#### Image Upload Process:
1. **Drag & Drop**: Drag images directly into the editor
2. **File Input**: Use the file input buttons
3. **Paste**: Ctrl+V to paste images from clipboard
4. **Auto-copy**: Images are automatically copied to the correct folders when saving to repo

### 🔧 CLI Tool Usage

The included CLI tool (`tools/news-cli.mjs`) provides automation:

#### Create a new post:
```bash
node tools/news-cli.mjs create \
  --title "Your Post Title" \
  --date 2024-01-15 \
  --author "Author Name" \
  --slug "optional-slug" \
  --image "/path/to/image.jpg" \
  --copy-image \
  --tags "news,community" \
  --summary "Short excerpt" \
  --body "Post content here"
```

#### Rebuild the index:
```bash
node tools/news-cli.mjs rebuild-index
```

#### Generate a slug:
```bash
node tools/news-cli.mjs slug "Your Post Title"
```

### 📊 Auto-Generated Index

The system automatically creates `content/news/index.json` with this structure:

```json
[
  {
    "id": "2024-01-15-slug",
    "title": "Post Title",
    "date": "2024-01-15",
    "author": "Author Name",
    "summary": "Post summary",
    "image": "/static/uploads/news/2024/01/image.jpg",
    "imageAlt": "Alt text",
    "tags": ["news", "community"],
    "slug": "slug",
    "filename": "2024-01-15-slug.md",
    "path": "/content/news/2024-01-15-slug.md",
    "link": "/content/news/2024-01-15-slug.md",
    "readingTimeMinutes": 3,
    "readingTimeLabel": "3 min"
  }
]
```

### 🚀 Upload Steps for Main Website

#### Step 1: Generate the Post
1. Use the web editor or CLI tool to create your post
2. Ensure all required fields are filled
3. Add your content in Markdown format
4. Include hero image and any attachments

#### Step 2: Export and Upload
1. **Download Markdown**: Use the "Download Markdown" button
2. **Export Bundle**: Use "Export Bundle" for complete package with images
3. **Upload to Repository**: Use "Connect Repository" if you have access

#### Step 3: File Placement
1. Place the `.md` file in `content/news/` with correct naming
2. Ensure images are in `static/uploads/news/YYYY/MM/` folders
3. Run `node tools/news-cli.mjs rebuild-index` to update the index

#### Step 4: Verification
1. Check that the post appears in `content/news/index.json`
2. Verify all image paths are correct
3. Test the post renders correctly on your website

### 📋 Markdown Content Guidelines

#### Supported Markdown:
- **Headings**: `# H1`, `## H2`, `### H3`
- **Text**: `**bold**`, `*italic*`, `` `code` ``
- **Lists**: `- item` or `1. item`
- **Links**: `[text](url)`
- **Images**: `![alt](url)`
- **Quotes**: `> quote`
- **Code blocks**: ````code````

#### Content Best Practices:
- **Hero image**: Should be referenced in frontmatter
- **Body images**: Use relative paths or full URLs
- **Links**: Use absolute URLs for external links
- **Code**: Use triple backticks for code blocks
- **Lists**: Use proper Markdown list syntax

### 🔍 Troubleshooting

#### Common Issues:

1. **Post not appearing**: Check filename format and run `rebuild-index`
2. **Images not loading**: Verify image paths and file permissions
3. **Frontmatter errors**: Ensure YAML syntax is correct
4. **Slug conflicts**: Use unique slugs or let auto-generation handle it

#### Validation:
- Use the editor's preview function to check rendering
- Validate YAML syntax in the frontmatter
- Check that all required fields are present
- Verify image paths are accessible

### 🎨 Design Features

- **Warm Color Palette** - Inspired by the sun with oranges, yellows, and warm whites
- **Smooth Animations** - Subtle hover effects and transitions
- **Modern Typography** - Clean, readable fonts with proper hierarchy
- **Accessibility** - Enhanced focus states and keyboard navigation
- **Responsive Layout** - Adapts beautifully to any screen size

## 🚀 Getting Started

1. **Open the Editor** - Simply open `index.html` in your browser
2. **Fill in the Form** - Add title, date, author, and content
3. **Use the Toolbar** - Format text with the Markdown toolbar
4. **Preview** - Click Preview to see your rendered content
5. **Export** - Download your Markdown file or save to repository

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + S` - Download Markdown
- `Ctrl/Cmd + P` - Toggle live preview
- `Ctrl/Cmd + B` - Bold text
- `Ctrl/Cmd + I` - Italic text
- `Ctrl/Cmd + K` - Insert link
- `Ctrl/Cmd + Shift + I` - Insert attachments
- `Ctrl/Cmd + E` - Export bundle
- `Ctrl/Cmd + Alt + 2/3/4` - Insert headings

## 🔧 Advanced Features

### Templates
Save frequently used post structures as templates and apply them to new posts.

### Version History
Track changes to your posts and restore previous versions when needed.

### Repository Integration
Connect to your content repository to save posts directly and rebuild indexes.

### Auto-save
Your work is automatically saved as you type, with the ability to restore drafts.

## 🌟 Technical Features

- **Pure JavaScript** - No external dependencies
- **Local Storage** - All data stays in your browser
- **File System Access** - Modern browser APIs for file operations
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG compliant design

## 🔒 Privacy & Security

- **100% Local** - No data is sent to external servers
- **Browser Storage** - All data is stored locally in your browser
- **No Tracking** - No analytics or tracking code
- **Open Source** - Transparent and auditable code

## 🚧 Browser Support

- **Modern Browsers** - Chrome, Firefox, Safari, Edge
- **File System Access** - Chrome 86+, Edge 86+
- **Fallback Support** - Works without advanced APIs

## 📱 Mobile Support

The editor is fully responsive and works great on mobile devices:

- Touch-friendly interface
- Responsive layout
- Optimized for small screens
- Mobile keyboard support

## 🎨 Customization

The design can be easily customized by modifying the CSS variables in `style.css`:

```css
:root {
  --primary: #ff6b35;      /* Main accent color */
  --sun-yellow: #ffd54f;   /* Sun yellow */
  --sun-orange: #ff8a65;   /* Sun orange */
  --warm-white: #fff8e1;   /* Warm white */
  /* ... more variables */
}
```

## 🤝 Contributing

Feel free to contribute improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

---

**Made for Sonce** — A beautiful, local Markdown generator that brings the warmth of the sun to your content creation workflow. ☀️

## 📚 Quick Reference Checklist

Before publishing a news post, ensure:

- [ ] **Filename**: `YYYY-MM-DD-slug.md` format
- [ ] **Frontmatter**: All required fields present
- [ ] **Images**: Proper paths and alt text
- [ ] **Content**: Valid Markdown syntax
- [ ] **Index**: Run `rebuild-index` after adding
- [ ] **Testing**: Preview renders correctly
- [ ] **Upload**: Files in correct directories
