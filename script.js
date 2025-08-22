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
	let previewBtn, downloadBtn, copyJsonBtn, downloadJsonBtn, previewContent, livePreviewCheckbox;
	let connectRepoBtn, repoStatusEl, saveRepoBtn, rebuildIndexBtn;
	let templateSelect, applyTemplateBtn, deleteTemplateBtn, saveTemplateBtn, templateNameInput;
	let addDraftBtn, clearDraftsBtn, downloadZipBtn, draftsCountEl;
	let insertHeroBtn, insertAttachmentsBtn;
	let toolbar;
	let exportBundleBtn, saveVersionBtn, historyBtn, cheatSheetBtn, dropZone, dropOverlay;
	let restoreBanner, restoreBtn, dismissRestoreBtn, lintPanel, tagSuggestionsEl, notesInput, toastContainer;
	
	// Modal focus management
	let lastFocusedElement = null;
	let modalKeydownHandler = null;
	
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
			if (data && restoreBanner) {
				restoreBanner.hidden = false;
				restoreBtn.onclick = () => { 
					deserializeForm(data); 
					restoreBanner.hidden = true; 
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
			
			// Helper to gather focusable elements
			function getFocusableElements(container) {
				return [...container.querySelectorAll('a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
					.filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
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
			document.body.classList.add('body-scroll-lock');
			lastFocusedElement = document.activeElement;
			console.log('Modal opened:', { title, hidden: overlay.hidden, display: overlay.style.display });
			
			// Focus management
			const focusables = getFocusableElements(overlay);
			if (focusables.length) {
				(focusables.find(el => el.id === 'modal-close') || focusables[0]).focus();
			}
			
			// Set up close button handler
			closeBtn.onclick = () => closeModal();
			
			// Set up overlay click handler to close modal
			overlay.addEventListener('click', (e) => { 
				if (e.target === overlay) {
					console.log('Overlay clicked, closing modal');
					closeModal();
				}
			}, { once: true });
			
			// Add escape key handler
			const escapeHandler = (e) => {
				if (e.key === 'Escape') {
					console.log('Escape key pressed, closing modal');
					closeModal();
					document.removeEventListener('keydown', escapeHandler);
				}
			};
			document.addEventListener('keydown', escapeHandler);
			
			// Trap focus within modal
			modalKeydownHandler = (e) => {
				if (e.key !== 'Tab') return;
				const els = getFocusableElements(overlay);
				if (!els.length) return;
				const first = els[0];
				const last = els[els.length - 1];
				const active = document.activeElement;
				if (e.shiftKey) {
					if (active === first || !overlay.contains(active)) {
						e.preventDefault();
						last.focus();
					}
				} else {
					if (active === last || !overlay.contains(active)) {
						e.preventDefault();
						first.focus();
					}
				}
			};
			document.addEventListener('keydown', modalKeydownHandler, true);
			
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
			}
			// Remove scroll lock and restore focus
			document.body.classList.remove('body-scroll-lock');
			if (modalKeydownHandler) {
				document.removeEventListener('keydown', modalKeydownHandler, true);
				modalKeydownHandler = null;
			}
			if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
				lastFocusedElement.focus();
			}
			lastFocusedElement = null;
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
	
	// ... existing code ...
	// Markdown preview
	function escapeHtml(text) {
		return String(text || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
	}
	function sanitizeUrl(url, type = 'link') {
		try {
			const raw = String(url || '').trim();
			if (!raw) return '#';
			if (/^(\/|\.\/|\.\.\/)/.test(raw)) return raw;
			const u = new URL(raw, window.location.origin);
			const proto = (u.protocol || '').toLowerCase();
			if (type === 'image') {
				if (proto === 'data:') return /^data:image\//i.test(raw) ? raw : '#';
				if (proto === 'http:' || proto === 'https:' || proto === 'blob:') return u.href;
				return '#';
			}
			// links
			if (proto === 'http:' || proto === 'https:' || proto === 'mailto:' || proto === 'tel:') return u.href;
			return '#';
		} catch {
			return '#';
		}
	}
	function renderMarkdown(md) {
		let html = md;
		// Code blocks first
		html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${escapeHtml(code)}</code></pre>`);
		// Blockquotes
		html = html.replace(/^>\s?(.+)$/gm, (_, q) => `<blockquote>${escapeHtml(q)}</blockquote>`);
		// Headings
		html = html
			.replace(/^###\s+(.+)$/gm, (_, t) => `<h3>${escapeHtml(t)}</h3>`) 
			.replace(/^##\s+(.+)$/gm, (_, t) => `<h2>${escapeHtml(t)}</h2>`) 
			.replace(/^#\s+(.+)$/gm, (_, t) => `<h1>${escapeHtml(t)}</h1>`);
		// Images
		html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, src) => `<img src="${sanitizeUrl(src, 'image')}" alt="${escapeHtml(alt)}"/>`);
		// Links
		html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, href) => {
			const safeHref = sanitizeUrl(href, 'link');
			const target = /^https?:/i.test(safeHref) ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
			return `<a href="${safeHref}"${target}>${escapeHtml(text)}</a>`;
		});
		// Inline code
		html = html.replace(/`([^`]+)`/g, (_, t) => `<code>${escapeHtml(t)}</code>`);
		// Emphasis/strong
		html = html
			.replace(/\*\*([^*]+)\*\*/g, (_, t) => `<strong>${escapeHtml(t)}</strong>`) 
			.replace(/\*([^*]+)\*/g, (_, t) => `<em>${escapeHtml(t)}</em>`);
		// Lists
		html = html
			.replace(/^(?:-\s.+\n?)+/gm, match => {
				const items = match.trim().split(/\n/).map(line => line.replace(/^-\s+/, '').trim());
				return `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
			})
			.replace(/^(?:\d+\.\s.+\n?)+/gm, match => {
				const items = match.trim().split(/\n/).map(line => line.replace(/^\d+\.\s+/, '').trim());
				return `<ol>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ol>`;
			});
		// Paragraphs
		html = html
			.split(/\n{2,}/)
			.map(block => /<h\d|<ul>|<ol>|<pre>|<blockquote>|<img|<a\s/.test(block) ? block : `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
			.join('\n');
		return html;
	}
	// Enhanced preview function with validation
	function showPreview() {
		const errors = validateForm();
		if (errors.length > 0) {
			showFormErrors(errors);
			return;
		}
		
		try {
			const md = buildMarkdown();
			if (!md) {
				previewContent.innerHTML = '<div class="placeholder"><span class="placeholder-icon">⚠️</span><p>Failed to generate preview</p></div>';
				return;
			}
			const bodyOnly = md.replace(/^---[\s\S]*?---\n?/, '');
			const html = renderMarkdown(bodyOnly);
			previewContent.innerHTML = html;
		} catch (error) {
			console.error('Preview failed:', error);
			previewContent.innerHTML = '<div class="placeholder"><span class="placeholder-icon">⚠️</span><p>Failed to generate preview</p></div>';
		}
	}
	// Live preview - moved to setupEventHandlers
	// ... existing code ...
})();