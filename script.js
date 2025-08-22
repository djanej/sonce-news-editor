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
	const attachmentsInput = document.getElementById('attachments');
	const importMdInput = document.getElementById('importMd');

	const previewBtn = document.getElementById('preview-btn');
	const downloadBtn = document.getElementById('download-btn');
	const copyJsonBtn = document.getElementById('copy-json-btn');
	const downloadJsonBtn = document.getElementById('download-json-btn');
	const previewContent = document.getElementById('preview-content');
	const livePreviewCheckbox = document.getElementById('live-preview');

	const connectRepoBtn = document.getElementById('connect-repo-btn');
	const repoStatusEl = document.getElementById('repo-status');
	const saveRepoBtn = document.getElementById('save-repo-btn');
	const rebuildIndexBtn = document.getElementById('rebuild-index-btn');

	const templateSelect = document.getElementById('template-select');
	const applyTemplateBtn = document.getElementById('apply-template-btn');
	const deleteTemplateBtn = document.getElementById('delete-template-btn');
	const saveTemplateBtn = document.getElementById('save-template-btn');
	const templateNameInput = document.getElementById('template-name');

	const addDraftBtn = document.getElementById('add-draft-btn');
	const clearDraftsBtn = document.getElementById('clear-drafts-btn');
	const downloadZipBtn = document.getElementById('download-zip-btn');
	const draftsCountEl = document.getElementById('drafts-count');

	const insertHeroBtn = document.getElementById('insert-hero-btn');
	const insertAttachmentsBtn = document.getElementById('insert-attachments-btn');

	// Toolbar buttons
	const toolbar = document.querySelector('.toolbar-left');

	// State for FS Access API
	let repoDirHandle = null;
	let userEditedSlug = false;

	// Drafts state in localStorage
	const DRAFTS_KEY = 'sonce-news-drafts';
	const TEMPLATES_KEY = 'sonce-news-templates';

	function loadDrafts() {
		try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'); } catch { return []; }
	}
	function saveDrafts(drafts) {
		localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
		updateDraftsCount();
	}
	function updateDraftsCount() {
		const drafts = loadDrafts();
		draftsCountEl.textContent = `${drafts.length} drafts`;
	}

	function loadTemplates() {
		try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
	}
	function saveTemplates(templates) {
		localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
		refreshTemplateSelect();
	}
	function refreshTemplateSelect() {
		const templates = loadTemplates();
		templateSelect.innerHTML = '<option value="">Select template…</option>' + templates.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
	}

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

	function isValidUrl(value) {
		if (!value) return true;
		try { new URL(value, window.location.origin); return true; } catch { return false; }
	}

	function validateForm({ checkBody = true } = {}) {
		if (!titleInput.value.trim()) {
			alert('Title is required.');
			return false;
		}
		if (!dateInput.value) {
			alert('Date is required.');
			return false;
		}
		if (checkBody && !bodyInput.value.trim()) {
			alert('Body is required.');
			return false;
		}
		if (imageInput.value && !isValidUrl(imageInput.value)) {
			alert('Hero Image URL is not valid.');
			return false;
		}
		if (!tagsInput.value.trim()) {
			if (!confirm('No tags added. Continue?')) return false;
		}
		return true;
	}

	function buildMarkdown() {
		if (!validateForm()) return null;
		const title = titleInput.value.trim();
		const date = dateInput.value;
		const author = authorInput.value.trim();
		const image = imageInput.value.trim();
		const imageAlt = imageAltInput.value.trim();
		const tags = parseTags(tagsInput.value);
		const body = bodyInput.value.trim();
		const summary = (summaryInput.value || '').trim() || generateSummaryFromBody(body);

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

	function getVersionedFilename(baseName, existingNames) {
		if (!existingNames || !existingNames.length || !existingNames.includes(baseName)) return baseName;
		const extIdx = baseName.lastIndexOf('.');
		const name = baseName.slice(0, extIdx);
		const ext = baseName.slice(extIdx);
		let i = 2;
		let candidate = `${name}-${i}${ext}`;
		while (existingNames.includes(candidate)) {
			i += 1;
			candidate = `${name}-${i}${ext}`;
		}
		return candidate;
	}

	function downloadMarkdown() {
		const md = buildMarkdown();
		if (!md) return;
		const slug = getEffectiveSlug();
		slugInput.value = slug;
		const base = `${dateInput.value}-${slug || 'post'}.md`;
		const drafts = loadDrafts();
		const existing = drafts.map(d => d.filename);
		const filename = getVersionedFilename(base, existing);
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

	// Markdown preview
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

	// Live preview
	livePreviewCheckbox.addEventListener('change', () => {
		if (livePreviewCheckbox.checked) showPreview();
	});
	bodyInput.addEventListener('input', () => {
		if (livePreviewCheckbox.checked) showPreview();
	});

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
		const nameMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
		if (nameMatch) {
			slugInput.value = nameMatch[2];
			userEditedSlug = true;
		} else if (attrs.title) {
			slugInput.value = slugify(attrs.title);
		}
	});

	// FS Access helpers
	function apiSupported() { return !!window.showDirectoryPicker; }

	async function verifyPermission(handle, readWrite) {
		const opts = { mode: readWrite ? 'readwrite' : 'read' };
		if ((await handle.queryPermission(opts)) === 'granted') return true;
		if ((await handle.requestPermission(opts)) === 'granted') return true;
		return false;
	}

	async function ensureDir(root, parts) {
		let dir = root;
		for (const part of parts) { dir = await dir.getDirectoryHandle(part, { create: true }); }
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
		} catch (e) { return null; }
	}
	async function listMarkdownFiles(dirHandle) {
		const files = [];
		for await (const [name, handle] of dirHandle.entries()) {
			if (handle.kind === 'file' && name.toLowerCase().endsWith('.md')) files.push({ name, handle });
		}
		return files;
	}
	async function listFileNames(dirHandle) {
		const names = [];
		for await (const [name, handle] of dirHandle.entries()) {
			if (handle.kind === 'file') names.push(name);
		}
		return names;
	}

	connectRepoBtn.addEventListener('click', async () => {
		if (!apiSupported()) { alert('File System Access API is not supported in this browser.'); return; }
		try {
			repoDirHandle = await window.showDirectoryPicker({ id: 'sonce-news-repo' });
			const ok = await verifyPermission(repoDirHandle, true);
			if (!ok) { repoDirHandle = null; alert('Permission denied.'); return; }
			await ensureDir(repoDirHandle, ['content', 'news']);
			await ensureDir(repoDirHandle, ['static', 'uploads', 'news']);
			repoStatusEl.textContent = `Connected: ${repoDirHandle.name}`;
			saveRepoBtn.disabled = false;
			rebuildIndexBtn.disabled = false;
		} catch (err) { console.error(err); alert('Failed to connect to folder.'); }
	});

	async function copyAttachmentToRepo(file, yyyy, mm, date, baseName) {
		const imgDir = await ensureDir(repoDirHandle, ['static', 'uploads', 'news', yyyy, mm]);
		const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
		const fname = `${date}-${baseName}.${ext}`;
		await writeFile(imgDir, fname, file);
		return `/static/uploads/news/${yyyy}/${mm}/${fname}`;
	}

	function insertAtCursor(textarea, prefix, suffix, placeholder = '') {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = textarea.value.substring(start, end) || placeholder;
		const before = textarea.value.substring(0, start);
		const after = textarea.value.substring(end);
		const newVal = before + prefix + selected + suffix + after;
		textarea.value = newVal;
		const cursor = before.length + (prefix + selected + suffix).length;
		textarea.setSelectionRange(cursor, cursor);
		textarea.focus();
		if (livePreviewCheckbox.checked) showPreview();
	}

	// Toolbar actions
	toolbar.addEventListener('click', (e) => {
		const btn = e.target.closest('button');
		if (!btn) return;
		const action = btn.dataset.md;
		switch (action) {
			case 'h1': insertAtCursor(bodyInput, '# ', ''); break;
			case 'h2': insertAtCursor(bodyInput, '## ', ''); break;
			case 'h3': insertAtCursor(bodyInput, '### ', ''); break;
			case 'bold': insertAtCursor(bodyInput, '**', '**', 'bold'); break;
			case 'italic': insertAtCursor(bodyInput, '*', '*', 'italic'); break;
			case 'ul': insertAtCursor(bodyInput, '- ', ''); break;
			case 'ol': insertAtCursor(bodyInput, '1. ', ''); break;
			case 'quote': insertAtCursor(bodyInput, '> ', ''); break;
			case 'code': insertAtCursor(bodyInput, '```\n', '\n```', 'code'); break;
			case 'link': insertAtCursor(bodyInput, '[', '](https://)', 'text'); break;
			default: break;
		}
	});

	insertHeroBtn.addEventListener('click', () => {
		const url = imageInput.value.trim();
		const alt = imageAltInput.value.trim() || titleInput.value.trim();
		if (!url) { alert('No hero image URL set.'); return; }
		insertAtCursor(bodyInput, `![${alt}](${url})\n\n`, '');
	});

	insertAttachmentsBtn.addEventListener('click', async () => {
		if (!attachmentsInput.files || attachmentsInput.files.length === 0) { alert('No attachments selected.'); return; }
		const date = dateInput.value;
		const yyyy = date.slice(0, 4);
		const mm = date.slice(5, 7);
		const slug = getEffectiveSlug();
		let lines = '';
		for (let i = 0; i < attachmentsInput.files.length; i++) {
			const f = attachmentsInput.files[i];
			let imgUrl = '';
			if (repoDirHandle) {
				const baseName = `${slug || 'post'}-att-${String(i + 1).padStart(2, '0')}`;
				imgUrl = await copyAttachmentToRepo(f, yyyy, mm, date, baseName);
			} else {
				imgUrl = URL.createObjectURL(f);
			}
			lines += `![${f.name}](${imgUrl})\n\n`;
		}
		insertAtCursor(bodyInput, lines, '');
	});

	function downloadsZip(files) {
		// Minimal uncompressed ZIP (store) writer
		function crc32(buf) {
			// Polynomial 0xEDB88320
			const table = (function() {
				const t = new Uint32Array(256);
				for (let i = 0; i < 256; i++) {
					let c = i;
					for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
					t[i] = c >>> 0;
				}
				return t;
			})();
			let crc = -1;
			for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
			return (crc ^ -1) >>> 0;
		}
		const encoder = new TextEncoder();
		let fileRecords = [];
		let centralRecords = [];
		let offset = 0;
		for (const file of files) {
			const nameBytes = encoder.encode(file.name);
			const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
			const crc = crc32(data);
			const localHeader = new Uint8Array(30 + nameBytes.length);
			const dv = new DataView(localHeader.buffer);
			// Local file header signature
			dv.setUint32(0, 0x04034b50, true);
			dv.setUint16(4, 20, true); // version needed
			dv.setUint16(6, 0, true); // flags
			dv.setUint16(8, 0, true); // compression method 0 = store
			dv.setUint16(10, 0, true); // time
			dv.setUint16(12, 0, true); // date
			dv.setUint32(14, crc, true);
			dv.setUint32(18, data.length, true);
			dv.setUint32(22, data.length, true);
			dv.setUint16(26, nameBytes.length, true);
			dv.setUint16(28, 0, true); // extra length
			localHeader.set(nameBytes, 30);
			fileRecords.push(localHeader, data);
			const localHeaderOffset = offset;
			offset += localHeader.length + data.length;
			const central = new Uint8Array(46 + nameBytes.length);
			const cv = new DataView(central.buffer);
			cv.setUint32(0, 0x02014b50, true);
			cv.setUint16(4, 20, true); // version made by
			cv.setUint16(6, 20, true); // version needed
			cv.setUint16(8, 0, true); // flags
			cv.setUint16(10, 0, true); // method
			cv.setUint16(12, 0, true); // time
			cv.setUint16(14, 0, true); // date
			cv.setUint32(16, crc, true);
			cv.setUint32(20, data.length, true);
			cv.setUint32(24, data.length, true);
			cv.setUint16(28, nameBytes.length, true);
			cv.setUint16(30, 0, true); // extra len
			cv.setUint16(32, 0, true); // comment len
			cv.setUint16(34, 0, true); // disk number
			cv.setUint16(36, 0, true); // internal attr
			cv.setUint32(38, 0, true); // external attr
			cv.setUint32(42, localHeaderOffset, true);
			central.set(nameBytes, 46);
			centralRecords.push(central);
		}
		const centralOffset = offset;
		for (const c of centralRecords) offset += c.length;
		const end = new Uint8Array(22);
		const ev = new DataView(end.buffer);
		ev.setUint32(0, 0x06054b50, true);
		ev.setUint16(4, 0, true);
		ev.setUint16(6, 0, true);
		ev.setUint16(8, centralRecords.length, true);
		ev.setUint16(10, centralRecords.length, true);
		ev.setUint32(12, offset - centralOffset, true);
		ev.setUint32(16, centralOffset, true);
		ev.setUint16(20, 0, true);
		const blobParts = [...fileRecords, ...centralRecords, end];
		const blob = new Blob(blobParts, { type: 'application/zip' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'sonce-news-drafts.zip';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	addDraftBtn.addEventListener('click', () => {
		const md = buildMarkdown();
		if (!md) return;
		const slug = getEffectiveSlug();
		const base = `${dateInput.value}-${slug || 'post'}.md`;
		const drafts = loadDrafts();
		const existing = drafts.map(d => d.filename);
		const filename = getVersionedFilename(base, existing);
		drafts.push({ filename, content: md });
		saveDrafts(drafts);
		alert(`Saved as draft: ${filename}`);
	});

	clearDraftsBtn.addEventListener('click', () => {
		if (!confirm('Clear all drafts?')) return;
		saveDrafts([]);
	});

	downloadZipBtn.addEventListener('click', () => {
		const drafts = loadDrafts();
		if (drafts.length === 0) { alert('No drafts to download.'); return; }
		const encoder = new TextEncoder();
		const files = drafts.map(d => ({ name: `content/news/${d.filename}`, data: encoder.encode(d.content) }));
		// Optional: include a folder structure for images
		downloadsZip(files);
	});

	// Templates manager
	function currentFormToTemplatePayload() {
		return {
			title: titleInput.value,
			date: dateInput.value,
			author: authorInput.value,
			slug: slugInput.value,
			image: imageInput.value,
			imageAlt: imageAltInput.value,
			tags: tagsInput.value,
			summary: summaryInput.value,
			body: bodyInput.value
		};
	}
	function applyTemplatePayload(t) {
		if (!t) return;
		titleInput.value = t.title || titleInput.value;
		dateInput.value = t.date || dateInput.value;
		authorInput.value = t.author || '';
		slugInput.value = t.slug || '';
		imageInput.value = t.image || '';
		imageAltInput.value = t.imageAlt || '';
		tagsInput.value = t.tags || '';
		summaryInput.value = t.summary || '';
		bodyInput.value = t.body || '';
		if (livePreviewCheckbox.checked) showPreview();
	}

	saveTemplateBtn.addEventListener('click', () => {
		const name = templateNameInput.value.trim();
		if (!name) { alert('Enter a template name.'); return; }
		const templates = loadTemplates();
		templates.push({ name, payload: currentFormToTemplatePayload() });
		saveTemplates(templates);
		templateNameInput.value = '';
		alert('Template saved.');
	});
	applyTemplateBtn.addEventListener('click', () => {
		const idx = templateSelect.value;
		if (idx === '') return;
		const templates = loadTemplates();
		const t = templates[Number(idx)];
		applyTemplatePayload(t && t.payload);
	});
	deleteTemplateBtn.addEventListener('click', () => {
		const idx = templateSelect.value;
		if (idx === '') return;
		const templates = loadTemplates();
		templates.splice(Number(idx), 1);
		saveTemplates(templates);
	});
	refreshTemplateSelect();
	updateDraftsCount();

	// Repo save and index rebuild
	saveRepoBtn.addEventListener('click', async () => {
		if (!repoDirHandle) { alert('Connect a repo folder first.'); return; }
		const md = buildMarkdown();
		if (!md) return;
		try {
			const date = dateInput.value;
			const yyyy = date.slice(0, 4);
			const mm = date.slice(5, 7);
			const slug = getEffectiveSlug();
			slugInput.value = slug;

			const newsDir = await ensureDir(repoDirHandle, ['content', 'news']);

			// Optional hero copy
			if (imageFileInput.files && imageFileInput.files[0]) {
				const img = imageFileInput.files[0];
				const imgUrl = await copyAttachmentToRepo(img, yyyy, mm, date, `${slug || 'post'}-hero`);
				imageInput.value = imageInput.value.trim() || imgUrl;
			}

			// Optional attachments copy
			if (attachmentsInput.files && attachmentsInput.files.length) {
				for (let i = 0; i < attachmentsInput.files.length; i++) {
					const f = attachmentsInput.files[i];
					await copyAttachmentToRepo(f, yyyy, mm, date, `${slug || 'post'}-att-${String(i + 1).padStart(2, '0')}`);
				}
			}

			// Versioning based on existing files
			const existingNames = await listFileNames(newsDir);
			const baseName = `${date}-${slug || 'post'}.md`;
			const filename = getVersionedFilename(baseName, existingNames);
			await writeFile(newsDir, filename, new Blob([md], { type: 'text/markdown;charset=utf-8' }));
			await updateIndexJson(repoDirHandle, filename);
			repoStatusEl.textContent = `Saved: ${filename}`;
			alert('Saved to repo and index updated.');
		} catch (err) { console.error(err); alert('Save failed. See console for details.'); }
	});

	rebuildIndexBtn.addEventListener('click', async () => {
		if (!repoDirHandle) { alert('Connect a repo folder first.'); return; }
		try { await rebuildIndex(repoDirHandle); alert('Index rebuilt from Markdown files.'); }
		catch (err) { console.error(err); alert('Rebuild failed. See console for details.'); }
	});

	async function updateIndexJson(rootHandle, filenameJustSaved) {
		const newsDir = await ensureDir(rootHandle, ['content', 'news']);
		const indexName = 'index.json';
		let list = [];
		const existing = await readTextFile(newsDir, indexName);
		if (existing) { try { list = JSON.parse(existing); } catch (e) { list = []; } }
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
			} catch (e) { console.warn('Failed to parse', name, e); }
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
	titleInput.addEventListener('input', () => { if (!userEditedSlug) { slugInput.value = slugify(titleInput.value.trim()); } if (livePreviewCheckbox.checked) showPreview(); });
	imageInput.addEventListener('input', () => { if (livePreviewCheckbox.checked) showPreview(); });
	bodyInput.addEventListener('input', () => { if (livePreviewCheckbox.checked) showPreview(); });
})();