(function() {
	const form = document.getElementById('news-form');
	const titleInput = document.getElementById('title');
	const dateInput = document.getElementById('date');
	const authorInput = document.getElementById('author');
	const imageInput = document.getElementById('image');
	const tagsInput = document.getElementById('tags');
	const bodyInput = document.getElementById('body');
	const previewBtn = document.getElementById('preview-btn');
	const downloadBtn = document.getElementById('download-btn');
	const previewContent = document.getElementById('preview-content');

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
		// Escape existing quotes
		const escaped = value.replace(/"/g, '\\"');
		return needsQuotes ? `"${escaped}"` : value;
	}

	function buildFrontmatter({ title, date, author, image, tags }) {
		const lines = [
			'---',
			`title: ${escapeYamlString(title)}`,
			`date: ${date}`,
		];
		if (author) lines.push(`author: ${escapeYamlString(author)}`);
		if (image) lines.push(`image: ${escapeYamlString(image)}`);
		if (tags && tags.length) lines.push(`tags: [${tags.map(t => escapeYamlString(t)).join(', ')}]`);
		lines.push('---');
		return lines.join('\n');
	}

	function buildMarkdown() {
		const title = titleInput.value.trim();
		const date = dateInput.value;
		const author = authorInput.value.trim();
		const image = imageInput.value.trim();
		const tags = parseTags(tagsInput.value);
		const body = bodyInput.value.trim();

		if (!title) {
			alert('Please enter a title.');
			return null;
		}
		if (!date) {
			alert('Please enter a date.');
			return null;
		}

		const frontmatter = buildFrontmatter({ title, date, author, image, tags });
		const content = body ? `\n${body}\n` : '\n';
		return `${frontmatter}${content}`;
	}

	function downloadMarkdown() {
		const md = buildMarkdown();
		if (!md) return;
		const slug = slugify(titleInput.value.trim());
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
				const items = match.trim().split(/\n/).map(line => line.replace(/^-[\s]+/, '').trim());
				return `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
			})
			.replace(/^(?:\d+\.\s.+\n?)+/gm, match => {
				const items = match.trim().split(/\n/).map(line => line.replace(/^\d+\.[\s]+/, '').trim());
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
		// Remove frontmatter section for preview
		const bodyOnly = md.replace(/^---[\s\S]*?---\n?/, '');
		previewContent.innerHTML = renderMarkdown(bodyOnly);
	}

	previewBtn.addEventListener('click', showPreview);
	downloadBtn.addEventListener('click', downloadMarkdown);
})();