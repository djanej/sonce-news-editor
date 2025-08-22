(function() {
	const form = document.getElementById('news-form');
	const titleInput = document.getElementById('title');
	const dateInput = document.getElementById('date');
	const authorInput = document.getElementById('author');
	const slugInput = document.getElementById('slug');
	const imageInput = document.getElementById('image');
	const imageAltInput = document.getElementById('imageAlt');
	const tagsInput = document.getElementById('tags');
	const summaryInput = document.getElementById('summary');
	const bodyInput = document.getElementById('body');

	const imageFileInput = document.getElementById('imageFile');
	const importMdInput = document.getElementById('importMd');

	const previewBtn = document.getElementById('preview-btn');
	const downloadBtn = document.getElementById('download-btn');
	const copyJsonBtn = document.getElementById('copy-json-btn');
	const downloadJsonBtn = document.getElementById('download-json-btn');
	const previewContent = document.getElementById('preview-content');

	const connectRepoBtn = document.getElementById('connect-repo-btn');
	const repoStatusEl = document.getElementById('repo-status');
	const saveRepoBtn = document.getElementById('save-repo-btn');
	const rebuildIndexBtn = document.getElementById('rebuild-index-btn');

	// State for FS Access API
	let repoDirHandle = null;
	let userEditedSlug = false;

	// Set default date to today
	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0');
	const dd = String(today.getDate()).padStart(2, '0');
	dateInput.value = `${yyyy}-${mm}-${dd}`;

	function slugify(text) {
		return text
			.toString()
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)+/g, '')
			.substring(0, 80);
	}

	function parseTags(input) {
		if (!input) return [];
		return input
			.split(',')
			.map(t => t.trim())
			.filter(Boolean);
	}

	function escapeYamlString(value) {
		if (value == null) return '';
		const needsQuotes = /[:#\-?\[\]{}&,*>!|%@`\n\r\t]/.test(value) || value.includes('"');
		const escaped = value.replace(/"/g, '\\"');
		return needsQuotes ? `"${escaped}"` : value;
	}

	function estimateReadingTime(text) {
		const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
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

	function buildFrontmatter({ title, date, author, image, imageAlt, tags, summary }) {
		const lines = [
			'---',
			`title: ${escapeYamlString(title)}`,
			`date: ${date}`,
		];
		if (author) lines.push(`author: ${escapeYamlString(author)}`);
		if (image) lines.push(`image: ${escapeYamlString(image)}`);
		if (imageAlt) lines.push(`imageAlt: ${escapeYamlString(imageAlt)}`);
		if (summary) lines.push(`summary: ${escapeYamlString(summary)}`);
		if (tags && tags.length) lines.push(`tags: [${tags.map(t => escapeYamlString(t)).join(', ')}]`);
		lines.push('---');
		return lines.join('\n');
	}

	function getEffectiveSlug() {
		const explicit = slugInput.value.trim();
		if (explicit) return slugify(explicit);
		return slugify(titleInput.value.trim());
	}

	function buildMarkdown() {
		const title = titleInput.value.trim();
		const date = dateInput.value;
		const author = authorInput.value.trim();
		const image = imageInput.value.trim();
		const imageAlt = imageAltInput.value.trim();
		const tags = parseTags(tagsInput.value);
		const body = bodyInput.value.trim();
		const summary = (summaryInput.value || '').trim() || generateSummaryFromBody(body);

		if (!title) {
			alert('Please enter a title.');
			return null;
		}
		if (!date) {
			alert('Please enter a date.');
			return null;
		}

		const frontmatter = buildFrontmatter({ title, date, author, image, imageAlt, tags, summary });
		const content = body ? `\n${body}\n` : '\n';
		return `${frontmatter}${content}`;
	}

	function buildIndexEntry(filename) {
		const slug = getEffectiveSlug();
		slugInput.value = slug;
		const date = dateInput.value;
		const tags = parseTags(tagsInput.value);
		const body = bodyInput.value.trim();
		const reading = estimateReadingTime(body);
		const title = titleInput.value.trim();
		const summary = (summaryInput.value || '').trim() || generateSummaryFromBody(body);
		const entry = {
			id: `${date}-${slug || 'post'}`,
			title,
			date,
			author: (authorInput.value || '').trim(),
			summary,
			image: (imageInput.value || '').trim(),
			imageAlt: (imageAltInput.value || '').trim(),
			tags,
			slug: slug || 'post',
			filename: filename || `${date}-${slug || 'post'}.md`,
			path: `/content/news/${filename || `${date}-${slug || 'post'}.md`}`,
			link: `/content/news/${filename || `${date}-${slug || 'post'}.md`}`,
			readingTimeMinutes: reading.minutes,
			readingTimeLabel: reading.label
		};
		return entry;
	}

	function downloadMarkdown() {
		const md = buildMarkdown();
		if (!md) return;
		const slug = getEffectiveSlug();
		slugInput.value = slug;
		const filename = `${dateInput.value}-${slug || 'post'}.md`;
		const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function downloadJsonEntry() {
		const entry = buildIndexEntry();
		const json = JSON.stringify(entry, null, 2);
		const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${entry.id}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function copyJsonEntry() {
		const entry = buildIndexEntry();
		const json = JSON.stringify(entry, null, 2);
		try {
			await navigator.clipboard.writeText(json);
			alert('JSON copied to clipboard');
		} catch (err) {
			console.error(err);
			alert('Failed to copy to clipboard.');
		}
	}

	// Lightweight Markdown preview (headings, emphasis, code, lists, links)
	function renderMarkdown(md) {
		let html = md
			.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
			.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
			.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
			.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>')
			.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\*([^*]+)\*/g, '<em>$1</em>')
			.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');

		// Lists
		html = html
			.replace(/^(?:-\s.+\n?)+/gm, match => {
				const items = match.trim().split(/\n/).map(line => line.replace(/^-([\s])+/, '').replace(/^-\s+/, '').trim());
				return `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
			})
			.replace(/^(?:\d+\.\s.+\n?)+/gm, match => {
				const items = match.trim().split(/\n/).map(line => line.replace(/^\d+\.([\s])+/, '').replace(/^\d+\.\s+/, '').trim());
				return `<ol>${items.map(i => `<li>${i}</li>`).join('')}</ol>`;
			});

		// Paragraphs
		html = html
			.split(/\n{2,}/)
			.map(block => /<h\d|<ul>|<ol>|<pre>|<blockquote>/.test(block) ? block : `<p>${block.replace(/\n/g, '<br/>')}</p>`)
			.join('\n');

		return html;
	}

	function showPreview() {
		const md = buildMarkdown();
		if (!md) return;
		const bodyOnly = md.replace(/^---[\s\S]*?---\n?/, '');
		previewContent.innerHTML = renderMarkdown(bodyOnly);
	}

	// Import Markdown (.md) and populate fields
	function parseFrontmatter(md) {
		const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n?/);
		if (!fmMatch) return { attrs: {}, body: md };
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

	importMdInput.addEventListener('change', async (e) => {
		const file = e.target.files && e.target.files[0];
		if (!file) return;
		const text = await file.text();
		const { attrs, body } = parseFrontmatter(text);
		titleInput.value = attrs.title || titleInput.value;
		dateInput.value = attrs.date || dateInput.value;
		authorInput.value = attrs.author || '';
		imageInput.value = attrs.image || '';
		imageAltInput.value = attrs.imageAlt || '';
		summaryInput.value = attrs.summary || '';
		tagsInput.value = Array.isArray(attrs.tags) ? attrs.tags.join(', ') : (attrs.tags || '');
		bodyInput.value = body || '';
		// Infer slug from filename if matches pattern
		const nameMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
		if (nameMatch) {
			slugInput.value = nameMatch[2];
			userEditedSlug = true;
		} else if (attrs.title) {
			slugInput.value = slugify(attrs.title);
		}
	});

	// FS Access helpers
	function apiSupported() {
		return !!window.showDirectoryPicker;
	}

	async function verifyPermission(handle, readWrite) {
		const opts = { mode: readWrite ? 'readwrite' : 'read' };
		if ((await handle.queryPermission(opts)) === 'granted') return true;
		if ((await handle.requestPermission(opts)) === 'granted') return true;
		return false;
	}

	async function ensureDir(root, parts) {
		let dir = root;
		for (const part of parts) {
			dir = await dir.getDirectoryHandle(part, { create: true });
		}
		return dir;
	}

	async function getDir(root, parts, create) {
		let dir = root;
		for (const part of parts) {
			dir = await dir.getDirectoryHandle(part, { create });
		}
		return dir;
	}

	async function writeFile(dirHandle, fileName, data) {
		const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(data);
		await writable.close();
		return fileHandle;
	}

	async function readTextFile(dirHandle, fileName) {
		try {
			const fileHandle = await dirHandle.getFileHandle(fileName);
			const file = await fileHandle.getFile();
			return await file.text();
		} catch (e) {
			return null;
		}
	}

	async function listMarkdownFiles(dirHandle) {
		const files = [];
		for await (const [name, handle] of dirHandle.entries()) {
			if (handle.kind === 'file' && name.toLowerCase().endsWith('.md')) {
				files.push({ name, handle });
			}
		}
		return files;
	}

	connectRepoBtn.addEventListener('click', async () => {
		if (!apiSupported()) {
			alert('File System Access API is not supported in this browser. Use Chromium-based browsers on desktop.');
			return;
		}
		try {
			repoDirHandle = await window.showDirectoryPicker({ id: 'sonce-news-repo' });
			const ok = await verifyPermission(repoDirHandle, true);
			if (!ok) {
				repoDirHandle = null;
				alert('Permission denied.');
				return;
			}
			await ensureDir(repoDirHandle, ['content', 'news']);
			await ensureDir(repoDirHandle, ['static', 'uploads', 'news']);
			repoStatusEl.textContent = `Connected: ${repoDirHandle.name}`;
			saveRepoBtn.disabled = false;
			rebuildIndexBtn.disabled = false;
		} catch (err) {
			console.error(err);
			alert('Failed to connect to folder.');
		}
	});

	saveRepoBtn.addEventListener('click', async () => {
		if (!repoDirHandle) {
			alert('Connect a repo folder first.');
			return;
		}
		const md = buildMarkdown();
		if (!md) return;
		try {
			const date = dateInput.value;
			const yyyy = date.slice(0, 4);
			const mm = date.slice(5, 7);
			const slug = getEffectiveSlug();
			slugInput.value = slug;

			const newsDir = await ensureDir(repoDirHandle, ['content', 'news']);

			// Optional image copy
			if (imageFileInput.files && imageFileInput.files[0]) {
				const img = imageFileInput.files[0];
				const ext = (img.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
				const imgDir = await ensureDir(repoDirHandle, ['static', 'uploads', 'news', yyyy, mm]);
				const imgName = `${date}-${slug || 'post'}.${ext || 'png'}`;
				await writeFile(imgDir, imgName, img);
				const imagePath = `/static/uploads/news/${yyyy}/${mm}/${imgName}`;
				imageInput.value = imageInput.value.trim() || imagePath;
			}

			const filename = `${date}-${slug || 'post'}.md`;
			await writeFile(newsDir, filename, new Blob([md], { type: 'text/markdown;charset=utf-8' }));
			await updateIndexJson(repoDirHandle, filename);
			repoStatusEl.textContent = `Saved: ${filename}`;
			alert('Saved to repo and index updated.');
		} catch (err) {
			console.error(err);
			alert('Save failed. See console for details.');
		}
	});

	rebuildIndexBtn.addEventListener('click', async () => {
		if (!repoDirHandle) {
			alert('Connect a repo folder first.');
			return;
		}
		try {
			await rebuildIndex(repoDirHandle);
			alert('Index rebuilt from Markdown files.');
		} catch (err) {
			console.error(err);
			alert('Rebuild failed. See console for details.');
		}
	});

	async function updateIndexJson(rootHandle, filenameJustSaved) {
		const newsDir = await ensureDir(rootHandle, ['content', 'news']);
		const indexName = 'index.json';
		let list = [];
		const existing = await readTextFile(newsDir, indexName);
		if (existing) {
			try { list = JSON.parse(existing); } catch (e) { list = []; }
		}
		const entry = buildIndexEntry(filenameJustSaved);
		const idx = list.findIndex(p => p.id === entry.id);
		if (idx >= 0) list[idx] = entry; else list.push(entry);
		list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
		await writeFile(newsDir, indexName, new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' }));
	}

	async function rebuildIndex(rootHandle) {
		const newsDir = await ensureDir(rootHandle, ['content', 'news']);
		const mdFiles = await listMarkdownFiles(newsDir);
		const entries = [];
		for (const { name, handle } of mdFiles) {
			try {
				const file = await handle.getFile();
				const text = await file.text();
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
				console.warn('Failed to parse', name, e);
			}
		}
		entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
		await writeFile(newsDir, 'index.json', new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }));
	}

	// Events
	previewBtn.addEventListener('click', showPreview);
	downloadBtn.addEventListener('click', downloadMarkdown);
	copyJsonBtn.addEventListener('click', copyJsonEntry);
	downloadJsonBtn.addEventListener('click', downloadJsonEntry);

	slugInput.addEventListener('input', () => { userEditedSlug = true; });
	titleInput.addEventListener('input', () => {
		if (!userEditedSlug) {
			slugInput.value = slugify(titleInput.value.trim());
		}
	});
})();