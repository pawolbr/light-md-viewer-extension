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

  // Check library availability
  var hasMarked = typeof marked !== 'undefined';
  var hasHljs = typeof hljs !== 'undefined';
  var hasCodeMirror = typeof CodeMirror !== 'undefined';

  // DOM references
  var rendered = document.getElementById('rendered');
  var rawView = document.getElementById('rawView');
  var btnView = document.getElementById('btnView');
  var btnEdit = document.getElementById('btnEdit');
  var btnSplit = document.getElementById('btnSplit');
  var btnDownload = document.getElementById('btnDownload');
  var btnCopyMd = document.getElementById('btnCopyMd');
  var btnCopyHtml = document.getElementById('btnCopyHtml');
  var saveStatus = document.getElementById('saveStatus');

  if (!hasMarked) {
    rendered.innerHTML = '<p style="color:#c62828;padding:2em;">Failed to load markdown parser. Please reload the extension.</p>';
    return;
  }

  // Configure marked.js
  marked.setOptions({
    highlight: function (code, lang) {
      if (!hasHljs) return code;
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
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

  // Initialize CodeMirror (if available)
  var cm = null;
  if (hasCodeMirror) {
    cm = CodeMirror(document.getElementById('editorHost'), {
      value: rawMd,
      mode: 'gfm',
      theme: 'default',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 4,
      indentWithTabs: false,
      extraKeys: {
        'Enter': 'newlineAndIndentContinueMarkdownList',
        'Ctrl-S': function () { if (dirty) downloadFile(); },
        'Cmd-S': function () { if (dirty) downloadFile(); }
      }
    });
  } else {
    btnEdit.disabled = true;
    btnSplit.disabled = true;
    btnEdit.title = 'Editor unavailable';
    btnSplit.title = 'Editor unavailable';
  }

  // Initialize mermaid (guard against load failure)
  var hasMermaid = typeof mermaid !== 'undefined';
  if (hasMermaid) {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
  }

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

  // Expand container width when tables are wider than the default 900px
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
    var needed = maxTableWidth + 128;
    container.style.maxWidth = (needed > 900 ? needed + 'px' : '');
  }

  // Helper to get current markdown content
  function getCurrentContent() {
    return cm ? cm.getValue() : rawMd;
  }

  // Initial render
  rendered.innerHTML = marked.parse(rawMd);
  renderMermaid();
  adjustContainerWidth();

  // Handle anchor links
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

  // Track changes + live preview in split mode
  var splitTimer = null;
  if (cm) {
    cm.on('changes', function () {
      var val = cm.getValue();
      dirty = (val !== savedContent);
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
          rendered.innerHTML = marked.parse(cm.getValue());
          renderMermaid();
          adjustContainerWidth();
        }, 300);
      }
    });
  }

  var mode = 'view';

  function showView() {
    mode = 'view';
    rendered.innerHTML = marked.parse(getCurrentContent());
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
    if (!cm) return;
    mode = 'edit';
    rendered.style.display = 'none';
    rawView.style.display = 'block';
    document.querySelector('.container').className = 'container';
    btnEdit.classList.add('active');
    btnView.classList.remove('active');
    btnSplit.classList.remove('active');
    btnCopyMd.classList.add('show');
    btnCopyHtml.classList.remove('show');
    setTimeout(function () { cm.refresh(); cm.focus(); }, 10);
  }

  function showSplit() {
    if (!cm) return;
    mode = 'split';
    rendered.innerHTML = marked.parse(getCurrentContent());
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
    setTimeout(function () { cm.refresh(); cm.focus(); }, 10);
  }

  // Export: Download as .md file
  function downloadFile() {
    var content = getCurrentContent();
    var blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    chrome.runtime.sendMessage({
      action: 'download',
      url: url,
      filename: currentFilename
    }, function (response) {
      if (response && response.ok) {
        savedContent = content;
        dirty = false;
        btnDownload.classList.remove('unsaved');
        saveStatus.textContent = 'Downloaded';
        saveStatus.style.color = '#2e7d32';
        setTimeout(function () { if (!dirty) saveStatus.textContent = ''; }, 2000);
      } else {
        saveStatus.textContent = 'Download failed';
        saveStatus.style.color = '#c62828';
      }
      URL.revokeObjectURL(url);
    });
  }

  // Export: Copy raw markdown to clipboard
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

  // Export: Copy rendered HTML to clipboard
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

  // Button click handlers (using data-action attributes since onclick doesn't work from content scripts)
  document.querySelector('.toolbar').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var action = btn.dataset.action;
    if (action === 'view') showView();
    else if (action === 'edit') showEdit();
    else if (action === 'split') showSplit();
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
})();
