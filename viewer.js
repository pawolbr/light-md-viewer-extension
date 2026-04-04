// Light MD Viewer - Chrome Extension
// Core application logic: rendering, editing, mode switching, export

(function () {
  'use strict';

  // Read data passed from content script via hidden DOM element
  var dataEl = document.getElementById('__light-md-data');
  if (!dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var rawMd = data.content;
  var currentFilename = data.filename;

  var savedContent = rawMd;
  var dirty = false;
  var fileHandle = null;

  // Check library availability
  var hasMarked = typeof marked !== 'undefined';
  var hasHljs = typeof hljs !== 'undefined';
  var hasEditor = typeof LightMDEditor !== 'undefined';
  var hasMermaid = typeof mermaid !== 'undefined';

  // DOM references
  var rendered = document.getElementById('rendered');
  var rawView = document.getElementById('rawView');
  var btnView = document.getElementById('btnView');
  var btnEdit = document.getElementById('btnEdit');
  var btnSplit = document.getElementById('btnSplit');
  var btnSave = document.getElementById('btnSave');
  var btnDownload = document.getElementById('btnDownload');
  var btnCopyMd = document.getElementById('btnCopyMd');
  var btnCopyHtml = document.getElementById('btnCopyHtml');
  var saveStatus = document.getElementById('saveStatus');

  if (!hasMarked) {
    rendered.innerHTML = '<p style="color:#c62828;padding:2em;">Failed to load markdown parser. Please reload the extension.</p>';
    return;
  }

  // Configure marked.js v16 — code renderer with highlight.js integration
  marked.use({
    breaks: true,
    gfm: true,
    renderer: {
      code: function (token) {
        var text = token.text || '';
        var lang = token.lang || '';

        // Mermaid blocks: preserve for renderMermaid() to process
        if (lang === 'mermaid') {
          return '<pre><code class="language-mermaid">' + escapeForPre(text) + '</code></pre>';
        }

        // Syntax highlighting with highlight.js
        var highlighted;
        if (hasHljs && lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(text, { language: lang }).value;
        } else if (hasHljs) {
          highlighted = hljs.highlightAuto(text).value;
        } else {
          highlighted = escapeForPre(text);
        }
        return '<pre><code class="hljs language-' + escapeAttr(lang) + '">' + highlighted + '</code></pre>';
      }
    }
  });

  // Add id attributes to headings for anchor navigation
  marked.use({
    hooks: {
      postprocess: function (html) {
        return html.replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, function (match, level, content) {
          var slug = content.replace(/<[^>]*>/g, '').toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
          return '<h' + level + ' id="' + slug + '">' + content + '</h' + level + '>';
        });
      }
    }
  });

  // Initialize editor (CodeMirror 6 via LightMDEditor bundle)
  var editor = null;
  if (hasEditor) {
    editor = LightMDEditor.create(
      document.getElementById('editorHost'),
      rawMd,
      {
        onChange: function (val) {
          dirty = (val !== savedContent);
          btnSave.classList.toggle('unsaved', dirty);
          btnDownload.classList.toggle('unsaved', dirty);
          if (dirty) {
            saveStatus.textContent = 'Unsaved changes';
            saveStatus.style.color = '#e65100';
          } else {
            saveStatus.textContent = '';
          }
          if (mode === 'split') {
            clearTimeout(splitTimer);
            splitTimer = setTimeout(function () {
              rendered.innerHTML = renderMarkdown(editor.getValue());
              renderMermaid();
              adjustContainerWidth();
            }, 300);
          }
        }
      }
    );
  } else {
    btnEdit.disabled = true;
    btnSplit.disabled = true;
    btnEdit.title = 'Editor unavailable';
    btnSplit.title = 'Editor unavailable';
  }

  // Initialize mermaid (guard against load failure)
  try {
    if (hasMermaid) {
      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
    }
  } catch (e) {
    console.error('Light MD Viewer: mermaid init failed:', e);
    hasMermaid = false;
  }

  // --- HTML sanitizer (allowlist-based) ---

  // Allowlist of safe HTML tags
  var allowedTags = {
    A: true, ABBR: true, ARTICLE: true, ASIDE: true,
    B: true, BLOCKQUOTE: true, BR: true,
    CAPTION: true, CODE: true, COL: true, COLGROUP: true,
    DD: true, DEL: true, DETAILS: true, DFN: true, DIV: true,
    DL: true, DT: true, EM: true,
    FIGCAPTION: true, FIGURE: true,
    H1: true, H2: true, H3: true, H4: true, H5: true, H6: true,
    HR: true, I: true, IMG: true, INS: true, KBD: true,
    LI: true, MARK: true, OL: true, P: true, PRE: true,
    Q: true, S: true, SAMP: true, SECTION: true,
    SMALL: true, SPAN: true, STRONG: true, SUB: true,
    SUMMARY: true, SUP: true,
    TABLE: true, TBODY: true, TD: true, TFOOT: true, TH: true,
    THEAD: true, TR: true, U: true, UL: true, VAR: true, WBR: true
  };

  var urlAttrs = { href: true, src: true, 'xlink:href': true, formaction: true, action: true };

  function sanitizeHtml(html) {
    var template = document.createElement('template');
    template.innerHTML = html;

    var walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    var nodesToRemove = [];
    var node;

    while ((node = walker.nextNode())) {
      if (!allowedTags[node.tagName]) {
        nodesToRemove.push(node);
        continue;
      }

      Array.prototype.slice.call(node.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var value = attr.value.trim();
        var normalized = value.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();

        // Strip event handlers
        if (name.startsWith('on')) {
          node.removeAttribute(attr.name);
          return;
        }

        // Validate URL attributes
        if (urlAttrs[name]) {
          if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:')) {
            node.removeAttribute(attr.name);
            return;
          }
          // Block data: URIs except safe raster image types
          if (normalized.startsWith('data:') &&
              !/^data:image\/(png|jpeg|gif|webp|bmp)(;|,)/.test(normalized)) {
            node.removeAttribute(attr.name);
            return;
          }
        }

        // Auto-add noopener noreferrer to target=_blank links
        if (name === 'target' && value === '_blank') {
          var rel = node.getAttribute('rel') || '';
          if (!/\bnoopener\b/i.test(rel)) rel = (rel + ' noopener').trim();
          if (!/\bnoreferrer\b/i.test(rel)) rel = (rel + ' noreferrer').trim();
          node.setAttribute('rel', rel);
        }
      });
    }

    nodesToRemove.forEach(function (n) { n.remove(); });
    return template.innerHTML;
  }

  function renderMarkdown(md) {
    return sanitizeHtml(marked.parse(md));
  }

  // --- Utility ---

  function escapeForPre(str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // --- Mermaid ---

  function renderMermaid() {
    if (!hasMermaid) return;
    document.querySelectorAll('pre code.language-mermaid').forEach(function (block) {
      var pre = block.parentElement;
      var div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = block.textContent;
      pre.replaceWith(div);
    });
    mermaid.run();
  }

  // --- Layout ---

  function adjustContainerWidth() {
    var container = document.querySelector('.container');
    if (container.classList.contains('split-mode')) {
      container.style.maxWidth = '';
      return;
    }
    var tables = rendered.querySelectorAll('table');
    var maxTableWidth = 0;
    tables.forEach(function (t) {
      if (t.scrollWidth > maxTableWidth) maxTableWidth = t.scrollWidth;
    });
    // 128px = card padding (40*2) + container padding (24*2)
    var needed = maxTableWidth + 128;
    container.style.maxWidth = (needed > 900 ? needed + 'px' : '');
  }

  function getCurrentContent() {
    return editor ? editor.getValue() : rawMd;
  }

  // --- Initial render ---

  try {
    rendered.innerHTML = renderMarkdown(rawMd);
    renderMermaid();
    adjustContainerWidth();
  } catch (e) {
    console.error('Light MD Viewer: render error:', e);
    rendered.innerHTML = '<p style="color:#c62828;padding:2em;">Error rendering markdown. Check console for details.</p>';
  }

  // --- Anchor links ---

  rendered.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (link && link.getAttribute('href') && link.getAttribute('href').startsWith('#')) {
      e.preventDefault();
      var id = decodeURIComponent(link.getAttribute('href').substring(1));
      var target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        history.replaceState(null, '', '#' + id);
      }
    }
  });

  // --- Live preview timer ---

  var splitTimer = null;
  var mode = 'view';

  // --- Mode switching ---

  function showView() {
    mode = 'view';
    rendered.innerHTML = renderMarkdown(getCurrentContent());
    renderMermaid();
    rendered.style.display = 'block';
    rawView.style.display = 'none';
    document.querySelector('.container').className = 'container';
    btnView.classList.add('active');
    btnEdit.classList.remove('active');
    btnSplit.classList.remove('active');
    btnCopyMd.classList.remove('show');
    btnCopyHtml.classList.remove('show');
    adjustContainerWidth();
  }

  function showEdit() {
    mode = 'edit';
    rendered.style.display = 'none';
    rawView.style.display = 'block';
    document.querySelector('.container').className = 'container';
    btnEdit.classList.add('active');
    btnView.classList.remove('active');
    btnSplit.classList.remove('active');
    btnCopyMd.classList.add('show');
    btnCopyHtml.classList.remove('show');
    if (editor) setTimeout(function () { editor.refresh(); editor.focus(); }, 10);
  }

  function showSplit() {
    mode = 'split';
    rendered.innerHTML = renderMarkdown(getCurrentContent());
    renderMermaid();
    rendered.style.display = 'block';
    rawView.style.display = 'block';
    document.querySelector('.container').className = 'container split-mode';
    btnSplit.classList.add('active');
    btnView.classList.remove('active');
    btnEdit.classList.remove('active');
    btnCopyMd.classList.add('show');
    btnCopyHtml.classList.add('show');
    adjustContainerWidth();
    if (editor) setTimeout(function () { editor.refresh(); editor.focus(); }, 10);
  }

  // --- Export functions ---

  function saveFile() {
    var content = getCurrentContent();

    if (typeof window.showSaveFilePicker !== 'function') {
      // Fallback: use download if File System Access API is unavailable
      downloadFile();
      return;
    }

    (fileHandle ? Promise.resolve(fileHandle) : window.showSaveFilePicker({
      suggestedName: currentFilename,
      types: [{
        description: 'Markdown',
        accept: { 'text/markdown': ['.md', '.markdown', '.mdown'] }
      }]
    }))
    .then(function (handle) {
      fileHandle = handle;
      return handle.createWritable();
    })
    .then(function (writable) {
      return writable.write(content).then(function () { return writable.close(); });
    })
    .then(function () {
      savedContent = content;
      dirty = false;
      btnSave.classList.remove('unsaved');
      btnDownload.classList.remove('unsaved');
      saveStatus.textContent = 'Saved';
      saveStatus.style.color = '#2e7d32';
      setTimeout(function () { if (!dirty) saveStatus.textContent = ''; }, 2000);
    })
    .catch(function (e) {
      if (e.name === 'AbortError') return; // User cancelled picker
      // If a stale handle failed, reset so next save shows picker again
      fileHandle = null;
      console.error('Light MD Viewer: save failed:', e);
      saveStatus.textContent = 'Save failed';
      saveStatus.style.color = '#c62828';
    });
  }

  function downloadFile() {
    var content = getCurrentContent();
    var blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    function onResponse(event) {
      if (event.source !== window) return;
      if (!event.data || event.data.type !== '__light-md-download-response') return;
      window.removeEventListener('message', onResponse);

      var response = event.data.response;
      if (response && response.ok) {
        savedContent = content;
        dirty = false;
        btnSave.classList.remove('unsaved');
        btnDownload.classList.remove('unsaved');
        saveStatus.textContent = 'Downloaded';
        saveStatus.style.color = '#2e7d32';
        setTimeout(function () { if (!dirty) saveStatus.textContent = ''; }, 2000);
      } else {
        saveStatus.textContent = 'Download failed';
        saveStatus.style.color = '#c62828';
      }
      URL.revokeObjectURL(url);
    }

    window.addEventListener('message', onResponse);
    window.postMessage({
      type: '__light-md-download',
      url: url,
      filename: currentFilename
    }, '*');
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(getCurrentContent()).then(function () {
      saveStatus.textContent = 'Copied to clipboard';
      saveStatus.style.color = '#2e7d32';
      setTimeout(function () { saveStatus.textContent = ''; }, 2000);
    }).catch(function () {
      saveStatus.textContent = 'Copy failed';
      saveStatus.style.color = '#c62828';
    });
  }

  function copyHtml() {
    var html = rendered.innerHTML;
    var blob = new Blob([html], { type: 'text/html' });
    navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([html], { type: 'text/plain' }) })
    ]).then(function () {
      saveStatus.textContent = 'HTML copied';
      saveStatus.style.color = '#2e7d32';
      setTimeout(function () { saveStatus.textContent = ''; }, 2000);
    }).catch(function () {
      saveStatus.textContent = 'Copy failed';
      saveStatus.style.color = '#c62828';
    });
  }

  // --- Toolbar event handler ---

  document.querySelector('.toolbar').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    var action = btn.dataset.action;
    if (action === 'view') showView();
    else if (action === 'edit') showEdit();
    else if (action === 'split') showSplit();
    else if (action === 'save') saveFile();
    else if (action === 'download') downloadFile();
    else if (action === 'copyMd') copyToClipboard();
    else if (action === 'copyHtml') copyHtml();
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', function (e) {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Global Ctrl+S / Cmd+S handler — prevents Chrome's native "Save Page As"
  // and triggers the extension's download instead (works outside the editor too)
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (dirty) saveFile();
    }
  });
})();
