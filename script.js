(function() {
	// EMERGENCY MODAL KILLER - Available immediately
	window.emergencyKillModal = function() {
		const modal = document.getElementById('modal-overlay');
		if (modal) {
			modal.hidden = true;
			modal.style.display = 'none';
			modal.setAttribute('data-force-hide', 'true');
			console.log('EMERGENCY: Modal killed immediately');
			return true;
		}
		console.log('No modal found to kill');
		return false;
	};
	
	// Try to kill modal immediately if it exists
	if (document.getElementById('modal-overlay')) {
		window.emergencyKillModal();
	}
	
	// Add global emergency functions immediately
	window.forceCloseModal = window.emergencyKillModal;
	window.killModal = function() {
		const modal = document.getElementById('modal-overlay');
		if (modal) {
			modal.hidden = true;
			modal.style.display = 'none';
			modal.setAttribute('data-force-hide', 'true');
			modal.remove();
			console.log('Modal completely destroyed');
		}
	};
	
	// DOM element references - will be initialized when DOM is ready
	let form, titleInput, dateInput, authorInput, slugInput, imageInput, imageAltInput, tagsInput, summaryInput, bodyInput;
	let imageFileInput, attachmentsInput, importMdInput;
	let previewBtn, downloadBtn, copyMdBtn, copyJsonBtn, downloadJsonBtn, previewContent, livePreviewCheckbox;
	let connectRepoBtn, repoStatusEl, saveRepoBtn, rebuildIndexBtn;
	let templateSelect, applyTemplateBtn, deleteTemplateBtn, saveTemplateBtn, templateNameInput;
	let addDraftBtn, clearDraftsBtn, downloadZipBtn, draftsCountEl;
	let insertHeroBtn, insertAttachmentsBtn;
	let toolbar;
	let exportBundleBtn, saveVersionBtn, historyBtn, cheatSheetBtn, dropZone, dropOverlay;
	let restoreBanner, restoreBtn, dismissRestoreBtn, lintPanel, tagSuggestionsEl, notesInput, toastContainer;

	// State for FS Access API
	let repoDirHandle = null;
	let userEditedSlug = false;

	// Drafts state in localStorage
	const DRAFTS_KEY = 'sonce-news-drafts';
	const TEMPLATES_KEY = 'sonce-news-templates';
	const AUTOSAVE_KEY = 'sonce:news-editor:auto:v1';

	// Assets tracked for export bundle (in-memory)
	const trackedAssets = []; // { file: File|Blob, name: string, alt: string }

	// Error handling wrapper
	function safeExecute(fn, errorMessage = 'An error occurred') {
		try {
			return fn();
		} catch (error) {
			console.error(errorMessage, error);
			toast(errorMessage, 'error');
			return null;
		}
	}

	// Initialize DOM element references
	function initializeDOMElements() {
		form = document.getElementById('news-form');
		titleInput = document.getElementById('title');
		dateInput = document.getElementById('date');
		authorInput = document.getElementById('author');
		slugInput = document.getElementById('slug');
		imageInput = document.getElementById('image');
		imageAltInput = document.getElementById('imageAlt');
		tagsInput = document.getElementById('tags');
		summaryInput = document.getElementById('summary');
		bodyInput = document.getElementById('body');

		imageFileInput = document.getElementById('imageFile');
		attachmentsInput = document.getElementById('attachments');
		importMdInput = document.getElementById('importMd');

		previewBtn = document.getElementById('preview-btn');
		downloadBtn = document.getElementById('download-btn');
		copyMdBtn = document.getElementById('copy-md-btn');
		copyJsonBtn = document.getElementById('copy-json-btn');
		downloadJsonBtn = document.getElementById('download-json-btn');
		previewContent = document.getElementById('preview-content');
		livePreviewCheckbox = document.getElementById('live-preview');

		connectRepoBtn = document.getElementById('connect-repo-btn');
		repoStatusEl = document.getElementById('repo-status');
		saveRepoBtn = document.getElementById('save-repo-btn');
		rebuildIndexBtn = document.getElementById('rebuild-index-btn');

		templateSelect = document.getElementById('template-select');
		applyTemplateBtn = document.getElementById('apply-template-btn');
		deleteTemplateBtn = document.getElementById('delete-template-btn');
		saveTemplateBtn = document.getElementById('save-template-btn');
		templateNameInput = document.getElementById('template-name');

		addDraftBtn = document.getElementById('add-draft-btn');
		clearDraftsBtn = document.getElementById('clear-drafts-btn');
		downloadZipBtn = document.getElementById('download-zip-btn');
		draftsCountEl = document.getElementById('drafts-count');

		insertHeroBtn = document.getElementById('insert-hero-btn');
		insertAttachmentsBtn = document.getElementById('insert-attachments-btn');

		// Toolbar buttons
		toolbar = document.querySelector('.toolbar-left');

		// New UI elements
		exportBundleBtn = document.getElementById('export-bundle-btn');
		saveVersionBtn = document.getElementById('save-version-btn');
		historyBtn = document.getElementById('history-btn');
		cheatSheetBtn = document.getElementById('cheat-sheet-btn');
		dropZone = document.getElementById('drop-zone');
		dropOverlay = document.getElementById('drop-overlay');
		restoreBanner = document.getElementById('restore-banner');
		restoreBtn = document.getElementById('restore-btn');
		dismissRestoreBtn = document.getElementById('dismiss-restore-btn');
		lintPanel = document.getElementById('lint-panel');
		tagSuggestionsEl = document.getElementById('tag-suggestions');
		notesInput = document.getElementById('notes');
		toastContainer = document.getElementById('toast-container');
		
		// EMERGENCY: Kill any existing modal immediately
		const modalOverlay = document.getElementById('modal-overlay');
		if (modalOverlay) {
			modalOverlay.hidden = true;
			modalOverlay.style.display = 'none';
			modalOverlay.setAttribute('data-force-hide', 'true');
			console.log('EMERGENCY: Modal killed during DOM initialization');
		}
	}

	// Initialize the application
	function initializeApp() {
		try {
			console.log('Initializing application...');
			
			// Initialize DOM elements first
			initializeDOMElements();
			
			// Ensure modal is hidden on startup - FORCE IT
			const modalOverlay = document.getElementById('modal-overlay');
			if (modalOverlay) {
				modalOverlay.hidden = true;
				modalOverlay.style.display = 'none';
				modalOverlay.setAttribute('data-force-hide', 'true');
				console.log('Modal forcefully hidden on startup');
			}
			
			// Set default date to today
			const today = new Date();
			const yyyy = today.getFullYear();
			const mm = String(today.getMonth() + 1).padStart(2, '0');
			const dd = String(today.getDate()).padStart(2, '0');
			dateInput.value = `${yyyy}-${mm}-${dd}`;

						// Load autosaved content if available
			loadAutosave();
			
			// Initialize autosave banner
			const data = getAutosave();
			if (restoreBanner) {
				restoreBanner.hidden = true;
			}
			const __hasMeaningful = (() => {
				try {
					if (!data || typeof data !== 'object') return false;
					const fields = ['title','author','slug','image','imageAlt','tags','summary','body','notes'];
					return fields.some((k) => typeof data[k] === 'string' && data[k].trim().length > 0);
				} catch (e) {
					return false;
				}
			})();
			if (__hasMeaningful && restoreBanner) {
				restoreBanner.hidden = false;
				restoreBtn.onclick = () => { 
					deserializeForm(data); 
					restoreBanner.hidden = true; 
					clearAutosave(); 
					toast('Draft restored', 'success'); 
				};
				dismissRestoreBtn.onclick = () => { 
					restoreBanner.hidden = true; 
					clearAutosave(); 
				};
			}
			
			// Initialize other components
			refreshTemplateSelect();
			updateDraftsCount();

			// Set up autosave
			setupAutosave();
			
			// Set up all event handlers
			setupEventHandlers();
			
			// Final safety check: ensure overlay is hidden
			setTimeout(() => {
				if (dropOverlay && !dropOverlay.hidden) {
					console.log('Final safety check: hiding overlay');
					showDropOverlay(false);
				}
			}, 100);
			
			console.log('Application initialized successfully');
		} catch (error) {
			console.error('Failed to initialize app:', error);
			toast('Failed to initialize application', 'error');
		}
	}

	function toast(message, type = 'info', timeoutMs = 2500) {
		if (!toastContainer) return;
		
		try {
			const t = document.createElement('div');
			t.className = `toast ${type}`;
			t.textContent = message;
			toastContainer.appendChild(t);
			
			// Auto-remove after timeout
			setTimeout(() => { 
				if (t.parentNode) {
					t.remove(); 
				}
			}, timeoutMs);
		} catch (error) {
			console.error('Failed to show toast:', error);
		}
	}

	function openModal(title, contentEl) {
		try {
			console.log('openModal called with:', { title, hasContent: !!contentEl });
			
			const overlay = document.getElementById('modal-overlay');
			const closeBtn = document.getElementById('modal-close');
			if (!overlay || !closeBtn) {
				console.error('Modal elements not found:', { overlay: !!overlay, closeBtn: !!closeBtn });
				return;
			}
			
			// Clear any existing content and set new content
			document.getElementById('modal-title').textContent = title || 'Modal';
			const body = document.getElementById('modal-body');
			body.innerHTML = '';
			if (contentEl) {
				body.appendChild(contentEl);
			}
			
			// Show the modal
			overlay.hidden = false;
			overlay.style.display = 'grid';
			overlay.removeAttribute('data-force-hide');
			console.log('Modal opened:', { title, hidden: overlay.hidden, display: overlay.style.display });
			
			// Set up close button handler
			closeBtn.onclick = () => { 
				console.log('Close button clicked');
				overlay.hidden = true; 
				overlay.style.display = 'none';
				overlay.setAttribute('data-force-hide', 'true');
			};
			
			// Set up overlay click handler to close modal
			overlay.addEventListener('click', (e) => { 
				if (e.target === overlay) {
					console.log('Overlay clicked, closing modal');
					overlay.hidden = true; 
					overlay.style.display = 'none';
					overlay.setAttribute('data-force-hide', 'true');
				}
			}, { once: true });
			
			// Add escape key handler
			const escapeHandler = (e) => {
				if (e.key === 'Escape') {
					console.log('Escape key pressed, closing modal');
					overlay.hidden = true;
					overlay.style.display = 'none';
					overlay.setAttribute('data-force-hide', 'true');
					document.removeEventListener('keydown', escapeHandler);
				}
			};
			document.addEventListener('keydown', escapeHandler);
			
		} catch (error) {
			console.error('Failed to open modal:', error);
			toast('Failed to open modal', 'error');
		}
	}

	function closeModal() {
		try {
			console.log('closeModal called');
			const overlay = document.getElementById('modal-overlay');
			if (overlay) {
				overlay.hidden = true;
				overlay.style.display = 'none';
				overlay.setAttribute('data-force-hide', 'true');
				console.log('Modal closed successfully');
			} else {
				console.log('No modal overlay found to close');
			}
		} catch (error) {
			console.error('Failed to close modal:', error);
		}
	}

	function quickPrompt(label, defaultValue = '') {
		return new Promise((resolve) => {
			try {
				const wrap = document.createElement('div');
				wrap.innerHTML = `
					<label style="display:block; font-weight:600; margin-bottom:6px;">${label}</label>
					<input id="__prompt_input" type="text" value="${defaultValue.replace(/"/g, '&quot;')}" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid #334155; background:#0b1220; color:#e5e7eb;" />
					<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
						<button id="__prompt_cancel" style="padding:8px 16px; border-radius:6px; border:1px solid #334155; background:#0b1220; color:#e5e7eb;">Cancel</button>
						<button id="__prompt_ok" style="padding:8px 16px; border-radius:6px; border:1px solid #22c55e; background:#22c55e; color:white;">OK</button>
					</div>
				`;
				
				const overlay = document.getElementById('modal-overlay');
				const input = wrap.querySelector('#__prompt_input');
				
				wrap.querySelector('#__prompt_cancel').onclick = () => { overlay.hidden = true; resolve(defaultValue); };
				wrap.querySelector('#__prompt_ok').onclick = () => { 
					const v = input.value.trim(); 
					overlay.hidden = true; 
					resolve(v || defaultValue); 
				};
				
				openModal('Input Required', wrap);
				setTimeout(() => input.focus(), 100);
			} catch (error) {
				console.error('Failed to show prompt:', error);
				resolve(defaultValue);
			}
		});
	}

	function loadDrafts() {
		try {
			const stored = localStorage.getItem(DRAFTS_KEY);
			return stored ? JSON.parse(stored) : [];
		} catch (error) {
			console.error('Failed to load drafts:', error);
			return [];
		}
	}
	function saveDrafts(drafts) {
		try {
			localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
		} catch (error) {
			console.error('Failed to save drafts:', error);
			toast('Failed to save drafts', 'error');
		}
	}
	function updateDraftsCount() {
		try {
			const drafts = loadDrafts();
			if (draftsCountEl) {
				draftsCountEl.textContent = `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`;
			}
		} catch (error) {
			console.error('Failed to update drafts count:', error);
		}
	}

	function loadTemplates() {
		try {
			const stored = localStorage.getItem(TEMPLATES_KEY);
			return stored ? JSON.parse(stored) : [];
		} catch (error) {
			console.error('Failed to load templates:', error);
			return [];
		}
	}
	function saveTemplates(templates) {
		try {
			localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
		} catch (error) {
			console.error('Failed to save templates:', error);
			toast('Failed to save templates', 'error');
		}
	}
	function refreshTemplateSelect() {
		try {
			if (!templateSelect) return;
			const templates = loadTemplates();
			templateSelect.innerHTML = '<option value="">Select template…</option>';
			templates.forEach((t, i) => {
				const opt = document.createElement('option');
				opt.value = i;
				opt.textContent = t.name;
				templateSelect.appendChild(opt);
			});
		} catch (error) {
			console.error('Failed to refresh template select:', error);
		}
	}


	function transliterateToAscii(input) {
		const map = {
			'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ie','ж':'zh','з':'z','и':'y','і':'i','ї':'i','й':'i','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ь':'','ю':'iu','я':'ia',
			'А':'A','Б':'B','В':'V','Г':'H','Ґ':'G','Д':'D','Е':'E','Є':'Ye','Ж':'Zh','З':'Z','И':'Y','І':'I','Ї':'I','Й':'I','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Shch','Ь':'','Ю':'Yu','Я':'Ya'
		};
		return input.split('').map(ch => map[ch] || ch).join('');
	}

	function removeStopWords(text) {
		const stop = new Set(['a','an','the','and','or','but','of','for','in','on','to','from','with','by','at','as','is','are','be','this','that','these','those','it','its','was','were','has','have','had','will','can','do','over']);
		return text.split(/\s+/).filter(w => !stop.has(w)).join(' ');
	}

	function slugify(text) {
		const result = text
			.toString()
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)+/g, '')
			.substring(0, 80);
		
		// Handle edge case where result might be empty
		return result || 'untitled';
	}

	function smartSlug(text) {
		const t = transliterateToAscii(text || '').replace(/[^\w\s-]/g, ' ');
		return slugify(removeStopWords(t));
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
		const s = String(value);
		const needsQuotes = /[:#\-?\[\]{}&,*>!|%@`\n\r\t]/.test(s) || s.includes('"');
		const escaped = s.replace(/"/g, '\\"');
		return needsQuotes ? `"${escaped}"` : s;
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

	function escapeHtml(input) {
		return String(input || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function sanitizeUrl(url) {
		const u = String(url || '').trim();
		if (!u) return '#';
		if (/^(https?:|blob:|data:image\/|\/)/i.test(u)) return u;
		if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '#';
		return u;
	}

	function buildFrontmatter({ title, date, author, image, imageAlt, tags, summary }) {
		const lines = [
			'---',
			`title: ${escapeYamlString(title)}`,
			`date: ${date}`,
			`slug: ${escapeYamlString(getEffectiveSlug() || 'post')}`,
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
		if (explicit) return smartSlug(explicit);
		return smartSlug(titleInput.value.trim());
	}

	function isValidUrl(value) {
		if (!value) return true;
		try { 
			const u = new URL(value, window.location.origin); 
			if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'blob:' || (u.protocol === 'data:' && /^data:image\//i.test(value)) || value.startsWith('/')) return true; 
			return false;
		} catch { return false; }
	}

	// Form validation
	function validateForm() {
		const errors = [];
		
		if (!titleInput.value.trim()) {
			errors.push('Title is required');
		}
		const titleTrimmed = titleInput.value.trim();
		if (titleTrimmed && titleTrimmed.length > 100) {
			errors.push('Title must be 100 characters or less');
		}
		
		if (!dateInput.value) {
			errors.push('Date is required');
		}
		const dateVal = dateInput.value;
		if (dateVal) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
				errors.push('Date must be in YYYY-MM-DD format');
			} else {
				const [yy, mm, dd] = dateVal.split('-').map(Number);
				const dt = new Date(Date.UTC(yy, mm - 1, dd));
				const valid = dt.getUTCFullYear() === yy && (dt.getUTCMonth() + 1) === mm && dt.getUTCDate() === dd;
				if (!valid) errors.push('Date is not a valid calendar date');
			}
		}
		
		if (!bodyInput.value.trim()) {
			errors.push('Body content is required');
		}
		
		const imageVal = imageInput.value.trim();
		if (imageVal) {
			const ok = /^\/static\/uploads\/news\/\d{4}\/\d{2}\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|gif|webp|svg)$/i.test(imageVal);
			if (!ok) {
				errors.push('Hero image path must be /static/uploads/news/YYYY/MM/YYYY-MM-DD-slug-hero.ext');
			}
			if (!imageAltInput.value.trim()) {
				errors.push('Image Alt Text is required when a hero image is set');
			}
		}

		const summaryVal = (summaryInput.value || '').trim();
		if (summaryVal && summaryVal.length > 200) {
			errors.push('Summary must be 200 characters or less');
		}
		
		return errors;
	}

	function showFormErrors(errors) {
		if (errors.length === 0) return;
		
		const errorMessage = errors.join(', ');
		toast(errorMessage, 'error');
		
		// Highlight first error field
		if (!titleInput.value.trim()) {
			titleInput.focus();
			titleInput.style.borderColor = '#ef4444';
			setTimeout(() => titleInput.style.borderColor = '', 3000);
		} else if (!dateInput.value) {
			dateInput.focus();
			dateInput.style.borderColor = '#ef4444';
			setTimeout(() => dateInput.style.borderColor = '', 3000);
		} else if (!bodyInput.value.trim()) {
			bodyInput.focus();
			bodyInput.style.borderColor = '#ef4444';
			setTimeout(() => bodyInput.style.borderColor = '', 3000);
		}
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

		const slug = getEffectiveSlug() || 'post';
		const frontmatter = buildFrontmatter({ title, date, author, image, imageAlt, tags, summary, slug });
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
			hero: (imageInput.value || '').trim(),
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

	// Enhanced download function with validation
	function downloadMarkdown() {
		const errors = validateForm();
		if (errors.length > 0) {
			showFormErrors(errors);
			return;
		}
		
		try {
			const md = buildMarkdown();
			if (!md) {
				toast('Failed to generate markdown', 'error');
				return;
			}
			
			const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${dateInput.value}-${getEffectiveSlug() || 'post'}.md`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			toast('Markdown downloaded successfully', 'success');
		} catch (error) {
			console.error('Download failed:', error);
			toast('Download failed', 'error');
		}
	}

	function copyMarkdown() {
		const errors = validateForm();
		if (errors.length > 0) { showFormErrors(errors); return; }
		try {
			const md = buildMarkdown();
			navigator.clipboard.writeText(md).then(() => {
				toast('Markdown copied to clipboard', 'success');
			}).catch((err) => {
				console.error('Copy failed:', err);
				toast('Failed to copy markdown', 'error');
			});
		} catch (error) {
			console.error('Copy failed:', error);
			toast('Failed to copy markdown', 'error');
		}
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
		toast('JSON entry downloaded', 'success');
	}

	async function copyJsonEntry() {
		const entry = buildIndexEntry();
		const json = JSON.stringify(entry, null, 2);
		try {
			await navigator.clipboard.writeText(json);
			toast('JSON copied to clipboard', 'success');
		} catch (err) {
			console.error(err);
			toast('Failed to copy to clipboard', 'error');
		}
	}

	// Markdown preview
	function renderMarkdown(md) {
		let html = md
			.replace(/^######\s+(.+)$/gm, (m, t) => `<h6>${escapeHtml(t)}</h6>`)
			.replace(/^#####\s+(.+)$/gm, (m, t) => `<h5>${escapeHtml(t)}</h5>`)
			.replace(/^####\s+(.+)$/gm, (m, t) => `<h4>${escapeHtml(t)}</h4>`)
			.replace(/^###\s+(.+)$/gm, (m, t) => `<h3>${escapeHtml(t)}</h3>`)
			.replace(/^##\s+(.+)$/gm, (m, t) => `<h2>${escapeHtml(t)}</h2>`)
			.replace(/^#\s+(.+)$/gm, (m, t) => `<h1>${escapeHtml(t)}</h1>`)
			.replace(/^>\s?(.+)$/gm, (m, t) => `<blockquote>${escapeHtml(t)}</blockquote>`)
			.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${escapeHtml(code)}</code></pre>`)
			.replace(/`([^`]+)`/g, (m, code) => `<code>${escapeHtml(code)}</code>`)
			.replace(/\*\*([^*]+)\*\*/g, (m, t) => `<strong>${escapeHtml(t)}</strong>`)
			.replace(/\*([^*]+)\*/g, (m, t) => `<em>${escapeHtml(t)}</em>`)
			.replace(/!\[(.*?)\]\((.*?)\)/g, (m, alt, src) => `<img src="${sanitizeUrl(src)}" alt="${escapeHtml(alt)}"/>`)
			.replace(/\[(.*?)\]\((.*?)\)/g, (m, text, href) => `<a href="${sanitizeUrl(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}<\/a>`);

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
			.map(block => /<h\d|<ul>|<ol>|<pre>|<blockquote>|<img|<a \/|<strong>|<em>|<code>/.test(block) ? block : `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
			.join('\n');

		return html;
	}

	// Enhanced preview function with validation
	function showPreview() {
		try {
			const body = bodyInput.value || '';
			const html = renderMarkdown(body);
			previewContent.innerHTML = html || '<div class="placeholder"><span class="placeholder-icon">📝</span><p>Nothing to preview yet.</p></div>';
		} catch (error) {
			console.error('Preview failed:', error);
			previewContent.innerHTML = '<div class="placeholder"><span class="placeholder-icon">⚠️</span><p>Failed to generate preview</p></div>';
		}
	}

	// Live preview - moved to setupEventHandlers

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

	// Import Markdown handler - moved to setupEventHandlers

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

	// Connect repo handler - moved to setupEventHandlers

	async function copyAttachmentToRepo(file, yyyy, mm, date, baseName) {
		const imgDir = await ensureDir(repoDirHandle, ['static', 'uploads', 'news', yyyy, mm]);
		let ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
		const allowed = new Set(['jpg','jpeg','png','gif','webp','svg']);
		if (!allowed.has(ext)) ext = 'png';
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

	// Toolbar actions - moved to setupEventHandlers

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

	// Draft handlers - moved to setupEventHandlers

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

	// Built-in templates (seed once)
	(function seedTemplates() {
		const templates = loadTemplates();
		if (!templates || templates.length === 0) {
			const nowIso = new Date().toISOString().slice(0,10);
			const builtIns = [
				{ name: 'Announcement', payload: { title: 'Important Announcement', date: nowIso, body: '## Summary\n\n- Key point 1\n- Key point 2\n\n## Details\n\nWrite the details here.\n\n## Next Steps / Call to Action\n\n- Contact: …\n- Deadline: …\n' } },
				{ name: 'Legal Update', payload: { title: 'Legal Update: Case Result', date: nowIso, body: '## Context\n\nBrief background.\n\n## Outcome\n\nWhat was decided.\n\n## Implications\n\nWhy this matters.\n\n## FAQ\n\n- **Q:** …\n  **A:** …\n' } },
				{ name: 'Event Recap', payload: { title: 'Event Recap: [Event Name]', date: nowIso, body: '## Highlights\n\n- …\n\n## Photos\n\n![Alt](./assets/cover.webp "Caption")\n\n## What Comes Next\n\nCTA or next steps.\n' } }
			];
			saveTemplates(builtIns);
		}
		refreshTemplateSelect();
	})();

	// Template handlers - moved to setupEventHandlers
	refreshTemplateSelect();
	updateDraftsCount();

	// Repo save and index rebuild - moved to setupEventHandlers

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
				const slug = (attrs.slug && smartSlug(attrs.slug)) || (m ? m[2] : smartSlug(attrs.title || 'post')) || 'post';
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
			} catch (e) { console.warn('Failed to parse', name, e); }
		}
		entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
		await writeFile(newsDir, 'index.json', new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }));
	}

	// Autosave (localStorage)
	function serializeForm() {
		return {
			title: titleInput.value,
			date: dateInput.value,
			author: authorInput.value,
			slug: slugInput.value,
			image: imageInput.value,
			imageAlt: imageAltInput.value,
			tags: tagsInput.value,
			summary: summaryInput.value,
			body: bodyInput.value,
			notes: notesInput ? notesInput.value : '',
			updatedAt: new Date().toISOString()
		};
	}
	
	function getAutosave() {
		try {
			const stored = localStorage.getItem(AUTOSAVE_KEY);
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (error) {
			console.error('Failed to get autosave:', error);
		}
		return null;
	}
	
	function loadAutosave() {
		try {
			const stored = localStorage.getItem(AUTOSAVE_KEY);
			if (stored) {
				const data = JSON.parse(stored);
				const __hasMeaningful = (() => {
					try {
						if (!data || typeof data !== 'object') return false;
						const fields = ['title','author','slug','image','imageAlt','tags','summary','body','notes'];
						return fields.some((k) => typeof data[k] === 'string' && data[k].trim().length > 0);
					} catch (e) {
						return false;
					}
				})();
				if (__hasMeaningful) {
					restoreBanner.hidden = false;
					restoreBtn.onclick = () => { 
						deserializeForm(data); 
						restoreBanner.hidden = true; 
						clearAutosave();
						toast('Draft restored', 'success'); 
					};
					dismissRestoreBtn.onclick = () => { 
						restoreBanner.hidden = true; 
						clearAutosave(); 
					};
				} else if (restoreBanner) {
					restoreBanner.hidden = true;
				}
			}
		} catch (error) {
			console.error('Failed to load autosave:', error);
			clearAutosave();
		}
	}
	
	function deserializeForm(data) {
		if (!data) return;
		titleInput.value = data.title || '';
		dateInput.value = data.date || dateInput.value;
		authorInput.value = data.author || '';
		slugInput.value = data.slug || '';
		imageInput.value = data.image || '';
		imageAltInput.value = data.imageAlt || '';
		tagsInput.value = data.tags || '';
		summaryInput.value = data.summary || '';
		bodyInput.value = data.body || '';
		if (notesInput) notesInput.value = data.notes || '';
		if (livePreviewCheckbox.checked) showPreview();
	}

	function saveAutosave() {
		try {
			const data = serializeForm();
			if (data && Object.keys(data).length > 0) {
				localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
			}
		} catch (error) {
			console.error('Failed to save autosave:', error);
		}
	}

	function clearAutosave() {
		try {
			localStorage.removeItem(AUTOSAVE_KEY);
		} catch (error) {
			console.error('Failed to clear autosave:', error);
		}
	}

	// Debounced autosave function
	let autosaveTimeout;
	function debouncedAutosave() {
		clearTimeout(autosaveTimeout);
		autosaveTimeout = setTimeout(() => {
			saveAutosave();
		}, 1000); // Save after 1 second of inactivity
	}

	function setupAutosave() {
		try {
			// Set up autosave for form inputs
			const formInputs = form.querySelectorAll('input, textarea');
			formInputs.forEach(input => {
				input.addEventListener('input', debouncedAutosave);
			});
		} catch (error) {
			console.error('Failed to setup autosave:', error);
		}
	}

	let autosaveTimer = null;
	// Moved into setupAutosave/initializeApp to avoid early null deref
	// initAutosaveBanner moved to initializeApp

	// Tag suggestions
	function suggestTags() {
		if (!tagSuggestionsEl) return;
		const text = (titleInput.value + ' ' + bodyInput.value).toLowerCase();
		const tokens = text.split(/\W+/).filter(t => t.length >= 3);
		const freq = {};
		const stop = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'doesn', 'let', 'put', 'say', 'she', 'too', 'use']);
		for (const tok of tokens) { if (tok.length < 3 || stop.has(tok)) continue; freq[tok] = (freq[tok] || 0) + 1; }
		const top = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([k]) => k);
		
		// Clear existing suggestions safely
		tagSuggestionsEl.innerHTML = '';
		
		// Create DOM elements safely to prevent XSS
		top.forEach(tag => {
			const span = document.createElement('span');
			span.className = 'chip';
			span.setAttribute('data-tag', tag);
			span.textContent = tag; // Use textContent to prevent XSS
			tagSuggestionsEl.appendChild(span);
		});
	}
	// Tag suggestions - moved to setupEventHandlers

	// Validation & lint panel
	function validateContentDetailed() {
		const warnings = [];
		const md = bodyInput.value || '';
		// Images alt
		const imgRe = /!\[(.*?)\]\((.*?)\)/g; let m;
		while ((m = imgRe.exec(md))) { if (!m[1] || !m[1].trim()) warnings.push({ level: 'warn', msg: `Image missing alt: ${m[2]}` }); }
		// Check hero image alt
		if (imageInput.value && !imageAltInput.value.trim()) warnings.push({ level: 'warn', msg: 'Hero image alt text is missing.' });
		// Headings start at H2
		const headingLines = md.split(/\n/).filter(l => /^#{1,6}\s+/.test(l));
		if (headingLines.some(l => l.startsWith('# '))) warnings.push({ level: 'warn', msg: 'Use H2 (##) as first heading. H1 is reserved for title.' });
		// Links http
		if (/\]\(http:\/\//i.test(md)) warnings.push({ level: 'warn', msg: 'Use HTTPS links when possible.' });
		// Description length
		const desc = (summaryInput.value || '').trim() || generateSummaryFromBody(md);
		if (desc.length > 160) warnings.push({ level: 'warn', msg: 'Description exceeds 160 characters.' });
		if (!warnings.length) warnings.push({ level: 'ok', msg: 'No issues found.' });
		return warnings;
	}
	function renderLintPanel() {
		const results = validateContentDetailed();
		
		// Clear existing content safely
		lintPanel.innerHTML = '';
		
		// Create DOM elements safely to prevent XSS
		results.forEach(r => {
			const div = document.createElement('div');
			div.className = r.level;
			div.textContent = `• ${r.msg}`; // Use textContent to prevent XSS
			lintPanel.appendChild(div);
		});
	}
	// Validation & lint panel - moved to setupEventHandlers

	// Drag & drop and paste
	function showDropOverlay(show) { 
		if (!dropOverlay) return; 
		dropOverlay.hidden = !show; 
		console.log('Drop overlay:', show ? 'shown' : 'hidden');
	}
	
	// Ensure overlay is hidden on startup
	showDropOverlay(false);
	
	// Additional safety: hide overlay on various events
	window.addEventListener('blur', () => showDropOverlay(false));
	window.addEventListener('error', () => showDropOverlay(false));
	window.addEventListener('load', () => showDropOverlay(false));
	
	// Drag & drop handlers - moved to setupEventHandlers
	// Drop zone and paste handlers - moved to setupEventHandlers

	async function insertImageAsset(file, alt) {
		const date = dateInput.value;
		const yyyy = date.slice(0, 4);
		const mm = date.slice(5, 7);
		const slug = getEffectiveSlug();
		let url = '';
		if (repoDirHandle) {
			const baseName = `${slug || 'post'}-drop-${Math.random().toString(36).slice(2,8)}`;
			url = await copyAttachmentToRepo(file, yyyy, mm, date, baseName);
		} else {
			url = URL.createObjectURL(file);
		}
		trackedAssets.push({ file, name: file.name, alt });
		insertAtCursor(bodyInput, `![${alt}](${url})\n\n`, '');
	}

	// Export bundle
	async function computeSha256(uint8) {
		const hash = await crypto.subtle.digest('SHA-256', uint8);
		return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
	}

	async function exportBundle() {
		const md = buildMarkdown();
		if (!md) return;
		const slug = getEffectiveSlug() || 'post';
		const bodyOnly = md.replace(/^---[\s\S]*?---\n?/, '');
		const html = renderMarkdown(bodyOnly);
		const encoder = new TextEncoder();
		const files = [];
		const dir = `${slug}`;
		const mdBytes = encoder.encode(md);
		const htmlBytes = encoder.encode(html);
		const checksum = {
			algorithm: 'sha256',
			postMd: await computeSha256(mdBytes),
			postHtml: await computeSha256(htmlBytes),
			assets: {}
		};
		files.push({ name: `${dir}/post.md`, data: mdBytes });
		files.push({ name: `${dir}/post.html`, data: htmlBytes });
		for (const asset of trackedAssets) {
			const arrayBuf = await asset.file.arrayBuffer();
			const u8 = new Uint8Array(arrayBuf);
			files.push({ name: `${dir}/assets/${asset.name}`, data: u8 });
			checksum.assets[asset.name] = await computeSha256(u8);
		}
		const manifest = {
			schemaVersion: '1.0.0',
			generator: { name: 'sonce-news-editor', version: '0.1.0' },
			post: {
				id: `${dateInput.value}-${slug}`,
				slug,
				file: 'post.md',
				html: 'post.html',
				assetsDir: 'assets',
				exportedAt: new Date().toISOString(),
				checksum
			}
		};
		files.push({ name: `${dir}/manifest.json`, data: encoder.encode(JSON.stringify(manifest, null, 2)) });
		downloadsZip(files);
		toast('Exported bundle', 'success');
	}
	// Export bundle handler - moved to setupEventHandlers

	// Version history (IndexedDB)
	function openHistoryDB() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open('sonce-news-history', 1);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true });
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}
	async function saveSnapshot(note) {
		const db = await openHistoryDB();
		const tx = db.transaction('snapshots', 'readwrite');
		const store = tx.objectStore('snapshots');
		const key = `${dateInput.value}-${getEffectiveSlug()}`;
		const data = serializeForm();
		await new Promise((resolve, reject) => {
			const req = store.add({ postKey: key, note: note || '', createdAt: new Date().toISOString(), data });
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	}
	async function listSnapshots() {
		const db = await openHistoryDB();
		const tx = db.transaction('snapshots', 'readonly');
		const store = tx.objectStore('snapshots');
		const key = `${dateInput.value}-${getEffectiveSlug()}`;
		return new Promise((resolve) => {
			const results = [];
			store.openCursor().onsuccess = (e) => {
				const cursor = e.target.result;
				if (cursor) {
					if (cursor.value.postKey === key) results.push(cursor.value);
					cursor.continue();
				} else { resolve(results.sort((a,b) => (a.createdAt < b.createdAt ? 1 : -1))); }
			};
		});
	}

	// Version history handlers - moved to setupEventHandlers

	// Cheat sheet - moved to setupEventHandlers

	// Keyboard shortcuts - moved to setupEventHandlers

	// Events - moved to setupEventHandlers

	// Initialize the application
	document.addEventListener('DOMContentLoaded', () => {
		initializeApp();
	});

	// Ensure modal close button always works
	document.addEventListener('DOMContentLoaded', () => {
		const closeBtn = document.getElementById('modal-close');
		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				const overlay = document.getElementById('modal-overlay');
				if (overlay) {
					overlay.hidden = true;
				}
			});
		}
		
		// Add global function to force close modal
		window.forceCloseModal = () => {
			const overlay = document.getElementById('modal-overlay');
			if (overlay) {
				overlay.hidden = true;
				console.log('Modal force closed');
			} else {
				console.log('No modal found');
			}
		};
		
		// Add emergency modal killer
		window.killModal = () => {
			const overlay = document.getElementById('modal-overlay');
			if (overlay) {
				overlay.hidden = true;
				overlay.style.display = 'none';
				overlay.remove();
				console.log('Modal completely destroyed');
			}
		};
		
		// Add keyboard shortcut to force close modal (Ctrl+Shift+M)
		document.addEventListener('keydown', (e) => {
			if (e.ctrlKey && e.shiftKey && e.key === 'M') {
				e.preventDefault();
				window.forceCloseModal();
			}
		});
	});


	// Set up all event handlers
	function setupEventHandlers() {
		try {
			console.log('Setting up event handlers...');
			
			// Main action buttons
			if (previewBtn) previewBtn.addEventListener('click', showPreview);
			if (downloadBtn) downloadBtn.addEventListener('click', downloadMarkdown);
			if (copyMdBtn) copyMdBtn.addEventListener('click', copyMarkdown);
			if (copyJsonBtn) copyJsonBtn.addEventListener('click', copyJsonEntry);
			if (downloadJsonBtn) downloadJsonBtn.addEventListener('click', downloadJsonEntry);
			if (exportBundleBtn) exportBundleBtn.addEventListener('click', exportBundle);
			if (saveVersionBtn) saveVersionBtn.addEventListener('click', async () => {
				await saveSnapshot('Manual snapshot');
				toast('Version saved', 'success');
			});
			if (historyBtn) historyBtn.addEventListener('click', async () => {
				const list = await listSnapshots();
				const wrap = document.createElement('div');
				if (!list.length) { 
					wrap.textContent = 'No versions yet.'; 
					openModal('Version History', wrap); 
					return; 
				}
				wrap.innerHTML = list.map((s, i) => `
					<div style="display:flex; align-items:center; justify-content:space-between; gap:8px; border-bottom:1px solid #334155; padding:8px 0;">
						<div>
							<div><strong>${new Date(s.createdAt).toLocaleString()}</strong></div>
							<div class="hint">${s.note || ''}</div>
						</div>
						<div style="display:flex; gap:8px;">
							<button data-idx="${i}" data-act="preview">Preview</button>
							<button data-idx="${i}" data-act="restore" class="primary">Restore</button>
						</div>
					</div>
				`).join('');
				wrap.addEventListener('click', (e) => {
					const btn = e.target.closest('button'); 
					if (!btn) return;
					const idx = Number(btn.dataset.idx); 
					const act = btn.dataset.act; 
					const snap = list[idx];
					if (act === 'restore') { 
						deserializeForm(snap.data); 
						toast('Version restored', 'success'); 
						closeModal();
					}
					if (act === 'preview') { 
						const pre = document.createElement('pre'); 
						pre.textContent = JSON.stringify(snap.data, null, 2); 
						openModal('Snapshot Preview', pre); 
					}
				});
				openModal('Version History', wrap);
			});
			if (cheatSheetBtn) cheatSheetBtn.addEventListener('click', () => {
				const el = document.createElement('div');
				el.innerHTML = `
					<h4>Markdown Basics</h4>
					<ul>
						<li><code>## Heading</code></li>
						<li><code>**bold**</code>, <code>*italic*</code>, <code>\`code\`</code></li>
						<li><code>- list</code> or <code>1. list</code></li>
						<li><code>[text](https://example.com)</code></li>
						<li><code>![alt](./assets/image.webp "caption")</code></li>
					</ul>
				`;
				openModal('Cheat Sheet', el);
			});

			// Form input handlers
			if (slugInput) slugInput.addEventListener('input', () => { userEditedSlug = true; });
			if (titleInput) titleInput.addEventListener('input', () => { 
				if (!userEditedSlug) { 
					slugInput.value = smartSlug(titleInput.value.trim()); 
				} 
				if (livePreviewCheckbox && livePreviewCheckbox.checked) showPreview(); 
			});
			if (imageInput) imageInput.addEventListener('input', () => { 
				if (livePreviewCheckbox && livePreviewCheckbox.checked) showPreview(); 
			});
			if (bodyInput) bodyInput.addEventListener('input', () => { 
				if (livePreviewCheckbox && livePreviewCheckbox.checked) showPreview(); 
			});

			// Live preview
			if (livePreviewCheckbox) livePreviewCheckbox.addEventListener('change', () => {
				if (livePreviewCheckbox.checked) showPreview();
			});

			// Import handlers
			if (importMdInput) importMdInput.addEventListener('change', async (e) => {
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
					slugInput.value = smartSlug(attrs.title);
				}
				toast('Markdown imported', 'success');
			});

			// Repo handlers
			if (connectRepoBtn) connectRepoBtn.addEventListener('click', async () => {
				if (!apiSupported()) { 
					toast('File System Access API is not supported in this browser', 'error'); 
					return; 
				}
				try {
					repoDirHandle = await window.showDirectoryPicker({ id: 'sonce-news-repo' });
					const ok = await verifyPermission(repoDirHandle, true);
					if (!ok) { 
						repoDirHandle = null; 
						toast('Permission denied', 'error'); 
						return; 
					}
					await ensureDir(repoDirHandle, ['content', 'news']);
					await ensureDir(repoDirHandle, ['static', 'uploads', 'news']);
					repoStatusEl.textContent = `Connected: ${repoDirHandle.name}`;
					saveRepoBtn.disabled = false;
					rebuildIndexBtn.disabled = false;
					toast('Repo connected', 'success');
				} catch (err) { 
					console.error(err); 
					toast('Failed to connect to folder', 'error'); 
				}
			});

			if (saveRepoBtn) saveRepoBtn.addEventListener('click', async () => {
				if (!repoDirHandle) { 
					toast('Connect a repo folder first', 'error'); 
					return; 
				}
				
				// Validate before saving
				const errs = validateForm();
				if (errs.length) { showFormErrors(errs); return; }
				
				// Prevent race conditions
				if (saveRepoBtn.disabled) return;
				saveRepoBtn.disabled = true;
				const originalText = saveRepoBtn.textContent;
				saveRepoBtn.textContent = 'Saving...';
				
				const md = buildMarkdown();
				if (!md) {
					saveRepoBtn.disabled = false;
					saveRepoBtn.textContent = originalText;
					return;
				}
				try {
					const date = dateInput.value;
					const yyyy = date.slice(0, 4);
					const mm = date.slice(5, 7);
					const slug = getEffectiveSlug();
					slugInput.value = slug;

					const newsDir = await ensureDir(repoDirHandle, ['content', 'news']);

					// Optional hero copy
					if (imageFileInput && imageFileInput.files && imageFileInput.files[0]) {
						const img = imageFileInput.files[0];
						const imgUrl = await copyAttachmentToRepo(img, yyyy, mm, date, `${slug || 'post'}-hero`);
						imageInput.value = imageInput.value.trim() || imgUrl;
					}

					// Optional attachments copy
					if (attachmentsInput && attachmentsInput.files && attachmentsInput.files.length) {
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
					toast('Saved to repo', 'success');
					await saveSnapshot('Auto snapshot on Save to Repo');
				} catch (err) { 
					console.error(err); 
					toast('Save failed. See console for details', 'error'); 
				} finally {
					// Always re-enable button
					saveRepoBtn.disabled = false;
					saveRepoBtn.textContent = originalText;
				}
			});

			if (rebuildIndexBtn) rebuildIndexBtn.addEventListener('click', async () => {
				if (!repoDirHandle) { 
					toast('Connect a repo folder first', 'error'); 
					return; 
				}
				
				// Prevent race conditions
				if (rebuildIndexBtn.disabled) return;
				rebuildIndexBtn.disabled = true;
				const originalText = rebuildIndexBtn.textContent;
				rebuildIndexBtn.textContent = 'Rebuilding...';
				
				try { 
					await rebuildIndex(repoDirHandle); 
					toast('Index rebuilt', 'success'); 
				}
				catch (err) { 
					console.error(err); 
					toast('Rebuild failed. See console for details', 'error'); 
				} finally {
					// Always re-enable button
					rebuildIndexBtn.disabled = false;
					rebuildIndexBtn.textContent = originalText;
				}
			});

			// Template handlers
			if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', () => {
				const name = templateNameInput.value.trim();
				if (!name) { 
					toast('Enter a template name', 'error'); 
					return; 
				}
				const templates = loadTemplates();
				templates.push({ name, payload: currentFormToTemplatePayload() });
				saveTemplates(templates);
				templateNameInput.value = '';
				refreshTemplateSelect();
				toast('Template saved', 'success');
			});

			if (applyTemplateBtn) applyTemplateBtn.addEventListener('click', () => {
				const idx = templateSelect.value;
				if (idx === '') return;
				const templates = loadTemplates();
				const t = templates[Number(idx)];
				applyTemplatePayload(t && t.payload);
			});

			if (deleteTemplateBtn) deleteTemplateBtn.addEventListener('click', () => {
				const idx = templateSelect.value;
				if (idx === '') return;
				const templates = loadTemplates();
				templates.splice(Number(idx), 1);
				saveTemplates(templates);
				refreshTemplateSelect();
				toast('Template deleted', 'success');
			});

			// Draft handlers
			if (addDraftBtn) addDraftBtn.addEventListener('click', () => {
				const errs = validateForm();
				if (errs.length) { showFormErrors(errs); return; }
				const md = buildMarkdown();
				const slug = getEffectiveSlug();
				const base = `${dateInput.value}-${slug || 'post'}.md`;
				const drafts = loadDrafts();
				const existing = drafts.map(d => d.filename);
				const filename = getVersionedFilename(base, existing);
				drafts.push({ filename, content: md });
				saveDrafts(drafts);
				updateDraftsCount();
				toast(`Saved as draft: ${filename}`, 'success');
			});

			if (clearDraftsBtn) clearDraftsBtn.addEventListener('click', () => {
				if (!confirm('Clear all drafts?')) return;
				saveDrafts([]);
				updateDraftsCount();
				toast('All drafts cleared', 'success');
			});

			if (downloadZipBtn) downloadZipBtn.addEventListener('click', () => {
				const drafts = loadDrafts();
				if (drafts.length === 0) { 
					toast('No drafts to download', 'error'); 
					return; 
				}
				const encoder = new TextEncoder();
				const files = drafts.flatMap(d => {
					const html = renderMarkdown((d.content || '').replace(/^---[\s\S]*?---\n?/, ''));
					const manifest = JSON.stringify({ 
						schemaVersion: '1.0.0', 
						generator: { name: 'sonce-news-editor', version: '0.1.0' }, 
						post: { file: 'post.md', html: 'post.html' } 
					}, null, 2);
					const baseDir = d.filename.replace(/\.md$/,'');
					return [
						{ name: `${baseDir}/post.md`, data: encoder.encode(d.content) },
						{ name: `${baseDir}/post.html`, data: encoder.encode(html) },
						{ name: `${baseDir}/manifest.json`, data: encoder.encode(manifest) },
					];
				});
				downloadsZip(files);
			});

			// Toolbar handlers
			if (toolbar) toolbar.addEventListener('click', (e) => {
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

			if (insertHeroBtn) insertHeroBtn.addEventListener('click', () => {
				const url = imageInput.value.trim();
				const alt = imageAltInput.value.trim() || titleInput.value.trim();
				if (!url) { 
					toast('No hero image URL set', 'error'); 
					return; 
				}
				insertAtCursor(bodyInput, `![${alt}](${url})\n\n`, '');
				toast('Hero image inserted');
			});

			if (insertAttachmentsBtn) insertAttachmentsBtn.addEventListener('click', async () => {
				if (!attachmentsInput || !attachmentsInput.files || attachmentsInput.files.length === 0) { 
					toast('No attachments selected', 'error'); 
					return; 
				}
				const date = dateInput.value;
				const yyyy = date.slice(0, 4);
				const mm = date.slice(5, 7);
				const slug = getEffectiveSlug();
				let lines = '';
				for (let i = 0; i < attachmentsInput.files.length; i++) {
					const f = attachmentsInput.files[i];
					const defaultAlt = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
					const alt = await quickPrompt('Alt text for image', defaultAlt);
					if (alt) {
						let url = '';
						if (repoDirHandle) {
							const baseName = `${slug || 'post'}-att-${String(i + 1).padStart(2, '0')}`;
							url = await copyAttachmentToRepo(f, yyyy, mm, date, baseName);
						} else {
							url = URL.createObjectURL(f);
						}
						trackedAssets.push({ file: f, name: f.name, alt });
						lines += `![${alt}](${url})\n\n`;
					}
				}
				if (lines) {
					insertAtCursor(bodyInput, lines, '');
					toast('Attachments inserted', 'success');
				}
			});

			// Tag suggestions
			if (titleInput) titleInput.addEventListener('input', suggestTags);
			if (bodyInput) bodyInput.addEventListener('input', suggestTags);
			if (tagSuggestionsEl) tagSuggestionsEl.addEventListener('click', (e) => {
				const chip = e.target.closest('.chip');
				if (!chip) return;
				const tag = chip.dataset.tag;
				const tags = parseTags(tagsInput.value);
				if (!tags.includes(tag)) tags.push(tag);
				tagsInput.value = tags.join(', ');
			});

			// Validation & lint panel
			if (bodyInput) bodyInput.addEventListener('input', renderLintPanel);
			if (summaryInput) summaryInput.addEventListener('input', renderLintPanel);

			// Drag & drop and paste
			if (dropZone) dropZone.addEventListener('drop', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				showDropOverlay(false); 
				dropZone.classList.remove('dragover');
				const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
				if (!files.length) { 
					toast('No images dropped', 'error'); 
					return; 
				}
				for (const f of files) {
					const defaultAlt = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
					const alt = await quickPrompt('Alt text for image', defaultAlt);
					await insertImageAsset(f, alt || defaultAlt);
				}
				toast('Images inserted', 'success');
			});

			// Paste handler
			window.addEventListener('paste', async (e) => {
				const items = e.clipboardData && e.clipboardData.items ? [...e.clipboardData.items] : [];
				const images = items.filter(i => i.type && i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean);
				if (!images.length) return;
				for (const f of images) {
					const defaultAlt = 'pasted image';
					const alt = await quickPrompt('Alt text for pasted image', defaultAlt);
					await insertImageAsset(f, alt || defaultAlt);
				}
				toast('Pasted images inserted', 'success');
			});

			// Drag and drop overlay
			['dragenter','dragover'].forEach(evt => {
				document.addEventListener(evt, (e) => { 
					e.preventDefault(); 
					showDropOverlay(true); 
					if (dropZone) dropZone.classList.add('dragover'); 
				});
			});
			
			['dragleave','drop'].forEach(evt => {
				document.addEventListener(evt, (e) => { 
					e.preventDefault(); 
					if (evt === 'drop') return; 
					showDropOverlay(false); 
					if (dropZone) dropZone.classList.remove('dragover'); 
				});
			});

			// Improve drop zone dragover behavior
			if (dropZone) {
				dropZone.addEventListener('dragover', (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
					dropZone.classList.add('dragover');
				});
			}

			// Force hide button
			const forceHideBtn = document.getElementById('force-hide-overlay');
			if (forceHideBtn) {
				forceHideBtn.addEventListener('click', () => {
					showDropOverlay(false);
					toast('Overlay manually hidden', 'info');
				});
			}

			// Keyboard shortcuts
			document.addEventListener('keydown', (e) => {
				const isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
				const mod = isMac ? e.metaKey : e.ctrlKey;
				if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); if (downloadBtn) downloadBtn.click(); }
				if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); if (livePreviewCheckbox) { livePreviewCheckbox.checked = !livePreviewCheckbox.checked; if (livePreviewCheckbox.checked) showPreview(); } }
				if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); insertAtCursor(bodyInput, '**', '**', 'bold'); }
				if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); insertAtCursor(bodyInput, '*', '*', 'italic'); }
				if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); insertAtCursor(bodyInput, '[', '](https://)', 'text'); }
				if (mod && e.shiftKey && e.key.toLowerCase() === 'i') { e.preventDefault(); if (insertAttachmentsBtn) insertAttachmentsBtn.click(); }
				if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); if (exportBundleBtn) exportBundleBtn.click(); }
				if (mod && e.altKey && e.key === '2') { e.preventDefault(); insertAtCursor(bodyInput, '## ', ''); }
				if (mod && e.altKey && e.key === '3') { e.preventDefault(); insertAtCursor(bodyInput, '### ', ''); }
				if (mod && e.altKey && e.key === '4') { e.preventDefault(); insertAtCursor(bodyInput, '#### ', ''); }
				
				// Force hide overlay
				if (e.ctrlKey && e.shiftKey && e.key === 'H') {
					showDropOverlay(false);
					toast('Overlay hidden with keyboard shortcut', 'info');
				}
				
				// Force close modal
				if (e.ctrlKey && e.shiftKey && e.key === 'M') {
					e.preventDefault();
					closeModal();
				}
			});

			// Additional safety: hide overlay on various events
			window.addEventListener('blur', () => showDropOverlay(false));
			window.addEventListener('error', () => showDropOverlay(false));
			window.addEventListener('load', () => showDropOverlay(false));

			console.log('Event handlers set up successfully');
		} catch (error) {
			console.error('Failed to setup event handlers:', error);
			toast('Failed to setup event handlers', 'error');
		}
	}
})();