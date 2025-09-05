#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';

function log(...args) { console.log('[news-cli]', ...args); }
function error(...args) { console.error('[news-cli]', ...args); }

function slugify(text) {
	return String(text || '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '')
		.substring(0, 80);
}

function parseTags(input) {
	if (!input) return [];
	return String(input).split(',').map(t => t.trim()).filter(Boolean);
}

function escapeYamlString(value) {
	if (value == null) return '';
	const s = String(value);
	const needsQuotes = /[:#\-?\[\]{}&,*>!|%@`\n\r\t]/.test(s) || s.includes('"');
	const escaped = s.replace(/"/g, '\\"');
	return needsQuotes ? `"${escaped}"` : s;
}

function estimateReadingTime(text) {
	const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
	const minutes = Math.max(1, Math.ceil(words / 200));
	return { minutes, label: `${minutes} min` };
}

function stripMarkdownToText(md) {
	if (!md) return '';
	let text = md;
	text = text.replace(/```[\s\S]*?```/g, ' ');
	text = text.replace(/`[^`]+`/g, ' ');
	text = text.replace(/^>\s?.+$/gm, ' ');
	text = text.replace(/^#{1,6}\s+/gm, '');
	text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
	text = text.replace(/\*([^*]+)\*/g, '$1');
	text = text.replace(/!?\[([^\]]+)\]\(([^\)]+)\)/g, '$1');
	text = text.replace(/\!\[.*?\]\(.*?\)/g, '');
	text = text.replace(/\s+/g, ' ').trim();
	return text;
}

function generateSummaryFromBody(body, maxLen = 200) {
	const text = stripMarkdownToText(body);
	if (text.length <= maxLen) return text;
	const truncated = text.slice(0, maxLen);
	const lastSpace = truncated.lastIndexOf(' ');
	return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

function buildFrontmatter({ title, date, author, image, imageAlt, tags, summary, slug }) {
	const lines = [
		'---',
		`title: ${escapeYamlString(title)}`,
		`date: ${date}`,
	];
	if (slug) lines.push(`slug: ${escapeYamlString(slug)}`);
	if (author) lines.push(`author: ${escapeYamlString(author)}`);
	if (image) lines.push(`image: ${escapeYamlString(image)}`);
	if (imageAlt) lines.push(`imageAlt: ${escapeYamlString(imageAlt)}`);
	if (summary) lines.push(`summary: ${escapeYamlString(summary)}`);
	if (tags && tags.length) lines.push(`tags: [${tags.map(t => escapeYamlString(t)).join(', ')}]`);
	lines.push('---');
	return lines.join('\n');
}

function parseFrontmatter(md) {
	const fmMatch = String(md).match(/^---\n([\s\S]*?)\n---\n?/);
	if (!fmMatch) return { attrs: {}, body: String(md) };
	const yaml = fmMatch[1];
	const body = md.slice(fmMatch[0].length);
	const attrs = {};
	const lines = yaml.split(/\r?\n/);
	let currentKey = null;
	let arrayMode = false;
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;
		if (arrayMode) {
			if (line.startsWith('- ')) {
				const val = line.slice(2).trim().replace(/^"|"$/g, '');
				attrs[currentKey].push(val);
				continue;
			} else {
				arrayMode = false;
				currentKey = null;
			}
		}
		const m = line.match(/^(\w+):\s*(.*)$/);
		if (!m) continue;
		const key = m[1];
		let value = m[2].trim();
		if (value === '') {
			attrs[key] = [];
			currentKey = key;
			arrayMode = true;
			continue;
		}
		if (value.startsWith('[') && value.endsWith(']')) {
			const inside = value.slice(1, -1).trim();
			attrs[key] = inside ? inside.split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [];
		} else {
			attrs[key] = value.replace(/^"|"$/g, '');
		}
	}
	return { attrs, body };
}

async function ensureDir(dirPath) {
	await fs.mkdir(dirPath, { recursive: true });
}

async function listFileNames(dirPath) {
	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });
		return entries.filter(e => e.isFile()).map(e => e.name);
	} catch {
		return [];
	}
}

function getVersionedFilename(baseName, existingNames) {
	if (!existingNames || existingNames.length === 0 || !existingNames.includes(baseName)) return baseName;
	const extIdx = baseName.lastIndexOf('.');
	const name = baseName.slice(0, extIdx);
	const ext = baseName.slice(extIdx);
	let i = 2;
	let candidate = `${name}-${i}${ext}`;
	while (existingNames.includes(candidate)) { i += 1; candidate = `${name}-${i}${ext}`; }
	return candidate;
}

async function copyIfLocalImage(imagePathOrUrl, rootDir, date, slug) {
	if (!imagePathOrUrl) return { image: '', copied: false };
	if (/^https?:\/\//i.test(imagePathOrUrl)) return { image: imagePathOrUrl, copied: false };
	const abs = path.resolve(process.cwd(), imagePathOrUrl);
	const yyyy = date.slice(0, 4);
	const mm = date.slice(5, 7);
	let ext = (path.extname(abs) || '.png').toLowerCase();
	const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
	if (!allowedExts.has(ext)) ext = '.png';
	const uploadsDir = path.join(rootDir, 'static', 'uploads', 'news', yyyy, mm);
	await ensureDir(uploadsDir);
	const target = path.join(uploadsDir, `${date}-${slug}-hero${ext}`);
	await fs.copyFile(abs, target);
	const webPath = `/static/uploads/news/${yyyy}/${mm}/${path.basename(target)}`;
	return { image: webPath, copied: true };
}

async function buildIndex(rootDir) {
	const newsDir = path.join(rootDir, 'content', 'news');
	await ensureDir(newsDir);
	const files = (await listFileNames(newsDir)).filter(n => n.toLowerCase().endsWith('.md'));
	const entries = [];
	for (const name of files) {
		try {
			const full = path.join(newsDir, name);
			const text = await fs.readFile(full, 'utf8');
			const { attrs, body } = parseFrontmatter(text);
			const m = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
			const date = attrs.date || (m ? m[1] : '') || '';
			const slug = (attrs.slug && slugify(attrs.slug)) || (m ? m[2] : slugify(attrs.title || 'post')) || 'post';
			const reading = estimateReadingTime(body || '');
			const summary = (attrs.summary || '').trim() || generateSummaryFromBody(body || '');
			const tags = Array.isArray(attrs.tags) ? attrs.tags : parseTags(attrs.tags || '');
			entries.push({
				id: `${date}-${slug}`,
				title: (attrs.title || '').trim(),
				date,
				author: (attrs.author || '').trim(),
				summary,
				hero: (attrs.image || '').trim(),
				image: (attrs.image || '').trim(),
				imageAlt: (attrs.imageAlt || '').trim(),
				tags,
				slug,
				filename: name,
				path: `/content/news/${name}`,
				link: `/content/news/${name}`,
				readingTimeMinutes: reading.minutes,
				readingTimeLabel: reading.label
			});
		} catch (e) {
			error('Failed to parse', name, e.message);
		}
	}
	entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
	const out = path.join(newsDir, 'index.json');
	await fs.writeFile(out, JSON.stringify(entries, null, 2));
	log('Wrote', out, `(${entries.length} entries)`);
}

async function createPost(opts) {
	const rootDir = path.resolve(opts.root || '.');
	const newsDir = path.join(rootDir, 'content', 'news');
	await ensureDir(newsDir);
	const date = opts.date || new Date().toISOString().slice(0, 10);
	const slug = slugify(opts.slug || opts.title || 'post');
	const baseName = `${date}-${slug}.md`;
	const existing = await listFileNames(newsDir);
	const filename = getVersionedFilename(baseName, existing);

	let image = opts.image || '';
	if (opts.copyImage && image) {
		const r = await copyIfLocalImage(image, rootDir, date, slug);
		image = r.image || image;
	}

	let body = '';
	if (opts.body) body = opts.body;
	else if (opts.bodyFile) body = await fs.readFile(path.resolve(opts.bodyFile), 'utf8');

	const summary = (opts.summary || '').trim() || generateSummaryFromBody(body);
	const tags = parseTags(opts.tags || '');
	const fm = buildFrontmatter({ title: opts.title, date, author: opts.author, image, imageAlt: opts.imageAlt || '', tags, summary, slug });
	const content = fm + '\n' + (body ? body + '\n' : '');
	const full = path.join(newsDir, filename);
	await fs.writeFile(full, content, 'utf8');
	log('Wrote', full);
	await buildIndex(rootDir);
}

function printHelp() {
	console.log(`Sonce News CLI\n\nUsage:\n  node tools/news-cli.mjs create --title "Title" [--date YYYY-MM-DD] [--author NAME] [--slug SLUG] [--image PATH_OR_URL] [--copy-image] [--imageAlt ALT] [--tags tag1,tag2] [--summary TEXT] [--body TEXT | --body-file FILE] [--root DIR]\n\n  node tools/news-cli.mjs rebuild-index [--root DIR]\n\n  node tools/news-cli.mjs slug "Some title"\n`);
}

function parseArgs(argv) {
	const args = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith('--')) {
			const key = a.slice(2);
			const next = argv[i + 1];
			if (next && !next.startsWith('--')) { args[key] = next; i++; }
			else { args[key] = true; }
		} else {
			args._.push(a);
		}
	}
	return args;
}

async function main() {
	const argv = process.argv.slice(2);
	const cmd = argv[0];
	const args = parseArgs(argv.slice(1));
	if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') { printHelp(); return; }
	if (cmd === 'slug') { const s = slugify(args._.join(' ')); console.log(s); return; }
	if (cmd === 'rebuild-index') { await buildIndex(args.root || '.'); return; }
	if (cmd === 'create') {
		if (!args.title) { error('Missing --title'); process.exit(1); }
		await createPost({
			root: args.root || '.',
			title: args.title,
			date: args.date,
			author: args.author,
			slug: args.slug,
			image: args.image,
			copyImage: !!args['copy-image'],
			imageAlt: args.imageAlt,
			tags: args.tags,
			summary: args.summary,
			body: args.body,
			bodyFile: args['body-file']
		});
		return;
	}
	printHelp();
}

main().catch(err => { error(err.stack || err.message || String(err)); process.exit(1); });