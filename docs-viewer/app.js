/**
 * docs-viewer/app.js
 * Giao diện xem toàn bộ tài liệu dự án Movie Ticket Booking.
 * Dữ liệu được nạp từ docs-data.js (generate bởi build-data.js).
 */
(function () {
  'use strict';

  const DATA = window.DOCS_DATA || { generatedAt: '', files: [] };
  const docs = DATA.files;
  const docsByPath = new Map(docs.map((d) => [d.path, d]));

  const state = {
    activePath: null,
    view: 'home',
    theme: localStorage.getItem('dv_theme') || 'dark',
    filter: '',
    collapsed: new Set(JSON.parse(localStorage.getItem('dv_collapsed') || '[]')),
    rawMode: false,
    pendingHighlight: null,
    pendingAnchor: null,
    searchSelected: 0
  };

  const READING_ORDER = [
    { path: 'AI-contracts/00-operating-policy.md', label: 'Operating policy' },
    { path: 'AI-contracts/02-source-of-truth.md', label: 'Source of truth' },
    { path: 'AI-contracts/03-project-contract.md', label: 'Project contract + changes/ đang mở' },
    { path: 'AI-contracts/state/README.md', label: 'State: README, contract-status, current-ticket' },
    { path: 'AI-contracts/19-learning-first-policy.md', label: 'Learning-first policy + learning gate' },
    { path: 'AI-contracts/contracts/product-contract.md', label: 'Các technical contract (product → quality)' },
    { path: 'AI-contracts/21-post-mvp-optimization-policy.md', label: 'Post-MVP optimization + performance baseline' },
    { path: 'AI-contracts/roadmap/weeks-4-10.md', label: 'Ticket tương ứng trong roadmap weeks 4–10' },
    { path: 'AI-contracts/05-software-engineering-workflow.md', label: 'Software engineering workflow' },
    { path: 'AI-contracts/07-code-review-policy.md', label: 'Code review + evidence policy' },
    { path: 'AI-contracts/09-next-task-decision-policy.md', label: 'Next task decision policy' }
  ];

  const GROUP_ICONS = { 'Gốc dự án': '🏠', 'AI Contracts': '📜', Docs: '📚' };

  const $ = (id) => document.getElementById(id);
  const DOM = {
    docCountBadge: $('doc-count-badge'),
    btnBrand: $('btn-brand'),
    btnHome: $('btn-home'),
    btnSearch: $('btn-search'),
    btnTheme: $('btn-theme'),
    sidebarFilterInput: $('sidebar-filter-input'),
    sidebarTree: $('sidebar-tree'),
    viewHome: $('view-home'),
    viewReader: $('view-reader'),
    statsRow: $('stats-row'),
    readingOrderList: $('reading-order-list'),
    recentList: $('recent-list'),
    groupCards: $('group-cards'),
    breadcrumb: $('breadcrumb'),
    btnCopyPath: $('btn-copy-path'),
    btnRawToggle: $('btn-raw-toggle'),
    docMeta: $('doc-meta'),
    docTitle: $('doc-title'),
    docContent: $('doc-content'),
    docRaw: $('doc-raw'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),
    tocList: $('toc-list'),
    readerToc: $('reader-toc'),
    searchModal: $('search-modal'),
    searchInput: $('search-input'),
    searchResults: $('search-results')
  };

  /* ================= Helpers ================= */

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function getFileIcon(doc) {
    const f = doc.filename;
    if (doc.ext !== '.md') return '⚡';
    if (f.startsWith('ADR')) return '🏛️';
    if (f.startsWith('CCR')) return '🔄';
    if (f.includes('contract')) return '📜';
    if (f.includes('policy') || f.includes('rules')) return '🛡️';
    if (f.includes('README') || f.includes('muc-luc')) return '📖';
    return '📄';
  }

  /* ================= Markdown parser ================= */

  function inlineMarkdown(text) {
    if (!text) return '';
    let out = escapeHtml(text);

    // Bảo vệ inline code bằng sentinel NUL trước khi xử lý định dạng khác
    const codeSlots = [];
    out = out.replace(/`([^`]+)`/g, (_, code) => {
      codeSlots.push(code);
      return '\u0000' + (codeSlots.length - 1) + '\u0000';
    });

    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => renderLink(label, href));

    out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + codeSlots[+i] + '</code>');
    return out;
  }

  function renderLink(label, href) {
    if (/^https?:\/\//i.test(href)) {
      return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
    }
    if (href.startsWith('#')) {
      return `<a href="${href}">${label}</a>`;
    }
    const resolved = resolveDocPath(href);
    if (resolved) {
      const anchor = href.includes('#') ? href.split('#').slice(1).join('#') : '';
      const anchorAttr = anchor ? ` data-anchor="${escapeHtml(anchor)}"` : '';
      return `<a href="#file=${encodeURIComponent(resolved)}" data-doc="${resolved}"${anchorAttr}>${label}</a>`;
    }
    return `<span>${label}</span>`;
  }

  function resolveDocPath(href) {
    let clean = href.split('#')[0];
    try { clean = decodeURIComponent(clean); } catch (e) { /* giữ nguyên */ }
    if (!clean) return null;

    const activeDoc = state.activePath ? docsByPath.get(state.activePath) : null;
    const baseDir = activeDoc ? activeDoc.path.split('/').slice(0, -1).join('/') : '';

    const candidates = [];
    if (baseDir) candidates.push(baseDir + '/' + clean);
    candidates.push(clean);

    for (const cand of candidates) {
      const parts = [];
      for (const seg of cand.split('/')) {
        if (seg === '' || seg === '.') continue;
        if (seg === '..') parts.pop();
        else parts.push(seg);
      }
      const normalized = parts.join('/');
      if (docsByPath.has(normalized)) return normalized;
    }
    return null;
  }

  function renderListBlock(lines) {
    const indentOf = (l) => Math.floor(l.match(/^\s*/)[0].replace(/\t/g, '  ').length / 2);

    function helper(subset, level) {
      const ordered = /^\s*\d+[.)]\s/.test(subset[0]);
      const items = [];
      subset.forEach((line) => {
        if (indentOf(line) <= level) {
          const m = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/);
          items.push({ text: m ? m[1] : line.trim(), subLines: [] });
        } else {
          if (!items.length) items.push({ text: '', subLines: [] });
          items[items.length - 1].subLines.push(line);
        }
      });
      const tag = ordered ? 'ol' : 'ul';
      const body = items.map((it) => {
        let text = it.text;
        let check = '';
        const task = text.match(/^\[( |x|X)\]\s+(.*)$/);
        if (task) {
          check = `<span class="task-check">${task[1].trim() ? '☑' : '☐'}</span>`;
          text = task[2];
        }
        const nested = it.subLines.length ? helper(it.subLines, level + 1) : '';
        return `<li>${check}${inlineMarkdown(text)}${nested}</li>`;
      }).join('');
      return `<${tag}>${body}</${tag}>`;
    }
    return helper(lines, indentOf(lines[0]));
  }

  function flushQuote(buffer) {
    if (!buffer.length) return '';
    let type = null;
    let first = buffer[0];
    const m = first.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
    if (m) {
      type = m[1].toLowerCase();
      buffer[0] = m[2];
    }
    const inner = buffer.filter((l) => l !== '').map((l) => inlineMarkdown(l)).join('<br>');
    if (type) {
      return `<div class="callout callout-${type}"><div class="callout-title">📌 ${type.toUpperCase()}</div><div>${inner}</div></div>`;
    }
    return `<blockquote>${inner}</blockquote>`;
  }

  function parseMarkdown(mdText) {
    const lines = mdText.split('\n');
    let html = '';
    let inCode = false, codeLang = '', codeBuf = [];
    let tableBuf = [], listBuf = [], quoteBuf = [];
    const usedAnchors = {};

    function flushTable() {
      if (tableBuf.length >= 2) {
        const headers = tableBuf[0].split('|').slice(1, -1).map((h) => h.trim());
        const rows = tableBuf.slice(2).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
        html += `<table><thead><tr>${headers.map((h) => `<th>${inlineMarkdown(h)}</th>`).join('')}</tr></thead><tbody>`;
        rows.forEach((row) => {
          html += `<tr>${row.map((c) => `<td>${inlineMarkdown(c)}</td>`).join('')}</tr>`;
        });
        html += '</tbody></table>';
      } else if (tableBuf.length === 1) {
        html += `<p>${inlineMarkdown(tableBuf[0])}</p>`;
      }
      tableBuf = [];
    }
    function flushList() {
      if (listBuf.length) { html += renderListBlock(listBuf); listBuf = []; }
    }
    function flushAll() {
      flushList(); flushTable();
      if (quoteBuf.length) { html += flushQuote(quoteBuf); quoteBuf = []; }
    }

    lines.forEach((line) => {
      if (line.trim().startsWith('```')) {
        if (inCode) {
          if (codeLang === 'mermaid') {
            html += `<div class="mermaid" data-mermaid="${escapeHtml(codeBuf.join('\n').trim())}"></div>`;
          } else {
            html += `<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`;
          }
          inCode = false; codeBuf = [];
        } else {
          flushAll();
          inCode = true;
          codeLang = line.trim().substring(3).trim().toLowerCase();
        }
        return;
      }
      if (inCode) { codeBuf.push(line); return; }

      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        if (quoteBuf.length) { html += flushQuote(quoteBuf); quoteBuf = []; }
        tableBuf.push(trimmed);
        return;
      } else if (tableBuf.length) {
        flushTable();
      }

      if (trimmed.startsWith('>')) {
        flushList(); flushTable();
        quoteBuf.push(trimmed.replace(/^>\s?/, ''));
        return;
      } else if (quoteBuf.length) {
        html += flushQuote(quoteBuf); quoteBuf = [];
      }

      if (/^\s*(?:[-*]|\d+[.)])\s+/.test(line)) {
        listBuf.push(line);
        return;
      } else if (listBuf.length && /^\s{2,}\S/.test(line)) {
        listBuf.push(line); // dòng nối tiếp của list item
        return;
      } else if (listBuf.length) {
        flushList();
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushAll();
        const level = heading[1].length;
        const text = heading[2];
        let anchor = text.toLowerCase().replace(/[^\w\sÀ-ỹ-]/g, '').trim().replace(/\s+/g, '-');
        if (usedAnchors[anchor] !== undefined) { usedAnchors[anchor]++; anchor += '-' + usedAnchors[anchor]; }
        else usedAnchors[anchor] = 0;
        html += `<h${level} id="${anchor}">${inlineMarkdown(text)}</h${level}>`;
        return;
      }

      if (trimmed === '---' || trimmed === '***') {
        flushAll();
        html += '<hr>';
        return;
      }

      if (trimmed.length > 0) {
        html += `<p>${inlineMarkdown(line)}</p>`;
      }
    });

    if (inCode && codeBuf.length) html += `<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`;
    flushAll();
    return html;
  }

  /* ================= Cross-reference IDs ================= */

  const REF_PATTERNS = [
    /\bLG-TKT-W\d{2}-D\d{2}\b/g,
    /\bTKT-W\d{2}-D\d{2}\b/g,
    /\b[A-Z]{2,6}(?:-[A-Z]{2,6})?-\d{2,3}\b(?!\.\d)/g
  ];
  // Chuỗi kỹ thuật trông giống contract ID nhưng không phải
  const REF_DENY = /^(SHA|RFC|ISO|UTF|HTTP|TCP|UDP|AES|RSA|CRC|OAUTH)-/;

  function enhanceCrossLinks(container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement.closest('a, pre, .mermaid, .ref-link')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      let content = node.nodeValue;
      let replaced = false;
      REF_PATTERNS.forEach((pattern) => {
        pattern.lastIndex = 0;
        if (pattern.test(content)) {
          pattern.lastIndex = 0;
          content = content.replace(pattern, (match) => {
            if (REF_DENY.test(match)) return match;
            replaced = true;
            return '\u0001' + match + '\u0002';
          });
        }
      });
      if (!replaced) return;
      const span = document.createElement('span');
      span.innerHTML = escapeHtml(content)
        .replace(/\u0001/g, '<span class="ref-link" title="Nhảy tới định nghĩa">')
        .replace(/\u0002/g, '</span>');
      node.parentNode.replaceChild(span, node);
    });

    container.querySelectorAll('.ref-link').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToDefinition(el.textContent.trim());
      });
    });
  }

  function jumpToDefinition(refId) {
    const defRe = new RegExp('`' + escapeRegExp(refId) + '`\\s*[:：]');
    const active = state.activePath ? docsByPath.get(state.activePath) : null;

    if (active && defRe.test(active.content)) {
      highlightTerm(DOM.docContent, refId);
      return;
    }
    let target = docs.find((d) => defRe.test(d.content));
    if (!target) {
      target = docs.find((d) => d.path !== state.activePath && d.content.includes(refId));
    }
    if (target) {
      state.pendingHighlight = refId;
      navigateTo(target.path);
    } else {
      openSearch(refId);
    }
  }

  function highlightTerm(container, term) {
    container.querySelectorAll('mark[data-hl]').forEach((m) => {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    container.normalize();

    const re = new RegExp(escapeRegExp(term), 'gi');
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement.closest('.mermaid')) return NodeFilter.FILTER_REJECT;
        re.lastIndex = 0;
        return re.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    let first = null;
    let count = 0;
    nodes.forEach((node) => {
      if (count >= 60) return;
      const frag = document.createDocumentFragment();
      let last = 0;
      re.lastIndex = 0;
      const text = node.nodeValue;
      let m;
      while ((m = re.exec(text)) !== null && count < 60) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const mark = document.createElement('mark');
        mark.setAttribute('data-hl', '1');
        mark.textContent = m[0];
        if (!first) { first = mark; mark.classList.add('flash'); }
        frag.appendChild(mark);
        last = m.index + m[0].length;
        count++;
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });

    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => first.classList.remove('flash'), 2500);
    }
  }

  /* ================= Sidebar ================= */

  function buildTreeModel() {
    const groups = [];
    const groupMap = new Map();
    docs.forEach((doc) => {
      if (state.filter) {
        const q = state.filter;
        if (!doc.filename.toLowerCase().includes(q) &&
            !doc.title.toLowerCase().includes(q) &&
            !doc.path.toLowerCase().includes(q)) return;
      }
      let g = groupMap.get(doc.group);
      if (!g) {
        g = { name: doc.group, subs: [], subMap: new Map(), count: 0 };
        groupMap.set(doc.group, g);
        groups.push(g);
      }
      let s = g.subMap.get(doc.sub);
      if (!s) {
        s = { name: doc.sub, files: [] };
        g.subMap.set(doc.sub, s);
        g.subs.push(s);
      }
      s.files.push(doc);
      g.count++;
    });
    return groups;
  }

  function renderSidebar() {
    const groups = buildTreeModel();
    if (!groups.length) {
      DOM.sidebarTree.innerHTML = '<div class="tree-empty">Không có tài liệu khớp bộ lọc.</div>';
      return;
    }
    let html = '';
    groups.forEach((g) => {
      const collapsed = !state.filter && state.collapsed.has(g.name);
      html += `<div class="tree-group ${collapsed ? 'collapsed' : ''}" data-group="${escapeHtml(g.name)}">
        <button class="tree-group-header">
          <span>${GROUP_ICONS[g.name] || '📁'} ${escapeHtml(g.name)}<span class="tree-count">${g.count}</span></span>
          <span class="chev">▼</span>
        </button>
        <div class="tree-group-body">`;
      g.subs.forEach((s) => {
        if (s.name && s.name !== 'Root' && g.subs.length > 1) {
          html += `<div class="tree-sub-label">${escapeHtml(s.name)}</div>`;
        }
        s.files.forEach((doc) => {
          const active = doc.path === state.activePath;
          html += `<a class="tree-file ${active ? 'active' : ''}" href="#file=${encodeURIComponent(doc.path)}" data-path="${escapeHtml(doc.path)}" title="${escapeHtml(doc.path)}">
            <span>${getFileIcon(doc)}</span><span class="fname">${escapeHtml(doc.filename)}</span>
          </a>`;
        });
      });
      html += '</div></div>';
    });
    DOM.sidebarTree.innerHTML = html;

    DOM.sidebarTree.querySelectorAll('.tree-group-header').forEach((btn) => {
      btn.addEventListener('click', () => {
        const groupEl = btn.closest('.tree-group');
        const name = groupEl.getAttribute('data-group');
        if (state.collapsed.has(name)) state.collapsed.delete(name);
        else state.collapsed.add(name);
        localStorage.setItem('dv_collapsed', JSON.stringify([...state.collapsed]));
        groupEl.classList.toggle('collapsed');
      });
    });
  }

  function updateSidebarActive() {
    DOM.sidebarTree.querySelectorAll('.tree-file').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-path') === state.activePath);
    });
    const activeEl = DOM.sidebarTree.querySelector('.tree-file.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  /* ================= Home dashboard ================= */

  function renderHome() {
    const groups = [];
    const groupMap = new Map();
    docs.forEach((doc) => {
      let g = groupMap.get(doc.group);
      if (!g) { g = { name: doc.group, count: 0, subs: new Map() }; groupMap.set(doc.group, g); groups.push(g); }
      g.count++;
      g.subs.set(doc.sub, (g.subs.get(doc.sub) || { count: 0, first: doc }));
      const s = g.subs.get(doc.sub);
      s.count++;
    });

    const latest = docs.reduce((max, d) => (d.mtime > max ? d.mtime : max), '');
    DOM.statsRow.innerHTML = `
      <div class="stat-card"><div class="stat-value">${docs.length}</div><div class="stat-label">Tài liệu</div></div>
      ${groups.map((g) => `<div class="stat-card"><div class="stat-value">${g.count}</div><div class="stat-label">${GROUP_ICONS[g.name] || ''} ${escapeHtml(g.name)}</div></div>`).join('')}
      <div class="stat-card"><div class="stat-value">${latest}</div><div class="stat-label">Sửa đổi gần nhất</div></div>
    `;

    DOM.readingOrderList.innerHTML = READING_ORDER.map((item) => {
      const exists = docsByPath.has(item.path);
      return `<li><a href="#file=${encodeURIComponent(item.path)}" ${exists ? '' : 'style="opacity:.5"'}>${escapeHtml(item.label)}</a></li>`;
    }).join('');

    const recent = [...docs].sort((a, b) => b.mtime.localeCompare(a.mtime)).slice(0, 8);
    DOM.recentList.innerHTML = recent.map((d) => `
      <li><a href="#file=${encodeURIComponent(d.path)}">
        <span>${getFileIcon(d)} ${escapeHtml(d.filename)}</span>
        <span class="recent-date">${d.mtime}</span>
      </a></li>`).join('');

    DOM.groupCards.innerHTML = groups.map((g) => `
      <div class="group-card">
        <div class="group-card-head">
          <h2>${GROUP_ICONS[g.name] || '📁'} ${escapeHtml(g.name)}</h2>
          <span class="tree-count">${g.count} tài liệu</span>
        </div>
        ${[...g.subs.entries()].map(([subName, s]) => `
          <div class="group-sub-row" data-first="${escapeHtml(s.first.path)}">
            <span>${escapeHtml(subName === 'Root' ? 'File gốc' : subName)}</span>
            <span class="tree-count">${s.count}</span>
          </div>`).join('')}
      </div>`).join('');

    DOM.groupCards.querySelectorAll('.group-sub-row').forEach((row) => {
      row.addEventListener('click', () => navigateTo(row.getAttribute('data-first')));
    });
  }

  /* ================= Reader ================= */

  function showView(view) {
    state.view = view;
    DOM.viewHome.hidden = view !== 'home';
    DOM.viewReader.hidden = view !== 'reader';
    DOM.viewHome.style.display = view === 'home' ? '' : 'none';
    DOM.viewReader.style.display = view === 'reader' ? '' : 'none';
  }

  function loadDocument(path) {
    const doc = docsByPath.get(path);
    if (!doc) { showView('home'); return; }

    state.activePath = path;
    state.rawMode = false;
    showView('reader');
    updateSidebarActive();

    const parts = doc.path.split('/');
    DOM.breadcrumb.innerHTML = parts.map((p, i) =>
      i === parts.length - 1 ? `<b>${escapeHtml(p)}</b>` : escapeHtml(p)
    ).join(' <span style="opacity:.4">/</span> ');

    DOM.docTitle.textContent = doc.title;
    DOM.docMeta.innerHTML = `
      <span class="meta-chip accent">${GROUP_ICONS[doc.group] || ''} ${escapeHtml(doc.group)}</span>
      ${doc.sub && doc.sub !== 'Root' ? `<span class="meta-chip">${escapeHtml(doc.sub)}</span>` : ''}
      <span class="meta-chip">${doc.ext.substring(1).toUpperCase()}</span>
      <span class="meta-chip">${doc.words.toLocaleString('vi')} từ</span>
      <span class="meta-chip">Sửa: ${doc.mtime}</span>
    `;

    DOM.docRaw.textContent = doc.content;
    DOM.docRaw.hidden = true;
    DOM.docContent.hidden = false;
    DOM.btnRawToggle.classList.remove('on');

    if (doc.ext === '.md') {
      DOM.docContent.innerHTML = parseMarkdown(doc.content);
      renderMermaid(DOM.docContent);
      enhanceCrossLinks(DOM.docContent);
      bindInternalLinks(DOM.docContent);
      DOM.readerToc.style.display = '';
      buildToc();
    } else {
      DOM.docContent.innerHTML = `<pre><code>${escapeHtml(doc.content)}</code></pre>`;
      DOM.readerToc.style.display = 'none';
      DOM.tocList.innerHTML = '';
    }

    renderPrevNext(doc);
    DOM.viewReader.closest('.main-pane').scrollTop = 0;

    if (state.pendingHighlight) {
      const term = state.pendingHighlight;
      state.pendingHighlight = null;
      setTimeout(() => highlightTerm(DOM.docContent, term), 60);
    }
    if (state.pendingAnchor) {
      const anchor = state.pendingAnchor;
      state.pendingAnchor = null;
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }

  function bindInternalLinks(container) {
    container.querySelectorAll('a[data-doc]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const anchor = a.getAttribute('data-anchor');
        if (anchor) state.pendingAnchor = anchor;
        navigateTo(a.getAttribute('data-doc'));
      });
    });
    // Anchor nội trang: scroll tại chỗ, không đổi hash (tránh bị đá về home)
    container.querySelectorAll('a[href^="#"]:not([data-doc])').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const el = document.getElementById(a.getAttribute('href').substring(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function buildToc() {
    const headings = DOM.docContent.querySelectorAll('h1, h2, h3, h4');
    let html = '';
    headings.forEach((h) => {
      const level = parseInt(h.tagName.substring(1), 10);
      html += `<li><a href="#${h.id}" class="depth-${level}" title="${escapeHtml(h.textContent)}">${escapeHtml(h.textContent)}</a></li>`;
    });
    DOM.tocList.innerHTML = html || '<li style="color:var(--text-dim);font-size:12px;padding:4px 12px;">Không có heading</li>';
    DOM.tocList.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const el = document.getElementById(a.getAttribute('href').substring(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function renderPrevNext(doc) {
    const idx = docs.indexOf(doc);
    const prev = docs[idx - 1];
    const next = docs[idx + 1];
    DOM.btnPrev.hidden = !prev;
    DOM.btnNext.hidden = !next;
    if (prev) {
      DOM.btnPrev.innerHTML = `<small>← Trước</small><span class="pn-name">${escapeHtml(prev.filename)}</span>`;
      DOM.btnPrev.onclick = () => navigateTo(prev.path);
    }
    if (next) {
      DOM.btnNext.innerHTML = `<small>Sau →</small><span class="pn-name">${escapeHtml(next.filename)}</span>`;
      DOM.btnNext.onclick = () => navigateTo(next.path);
    }
  }

  async function renderMermaid(container) {
    if (!window.mermaid) return;
    const nodes = container.querySelectorAll('.mermaid');
    for (const node of nodes) {
      const raw = node.getAttribute('data-mermaid') || node.textContent.trim();
      if (!raw) continue;
      try {
        const id = 'mm-' + Math.random().toString(36).substring(2, 9);
        const { svg } = await window.mermaid.render(id, raw);
        node.innerHTML = svg;
        attachMermaidToolbar(node);
      } catch (err) {
        node.innerHTML = `<div class="mermaid-error"><strong>Mermaid 10.9.6 render failed</strong><br>${escapeHtml(err?.message || String(err))}</div><pre><code>${escapeHtml(raw)}</code></pre>`;
      }
    }
  }

  function attachMermaidToolbar(node) {
    if (node.parentElement?.classList.contains('mermaid-card')) return;
    const card = document.createElement('div');
    card.className = 'mermaid-card';
    const toolbar = document.createElement('div');
    toolbar.className = 'mermaid-toolbar';
    toolbar.innerHTML = '<span>Mermaid 10.9.6</span><button type="button" class="mermaid-expand" title="Phóng to sơ đồ">⛶ Phóng to</button>';
    node.parentNode.insertBefore(card, node);
    card.appendChild(toolbar);
    card.appendChild(node);
    toolbar.querySelector('.mermaid-expand').addEventListener('click', () => openMermaidZoom(node));
  }

  function openMermaidZoom(node) {
    const sourceSvg = node.querySelector('svg');
    if (!sourceSvg) return;
    const modal = document.createElement('div');
    modal.className = 'mermaid-zoom-modal';
    modal.innerHTML = `
      <div class="mermaid-zoom-header">
        <strong>Sơ đồ Mermaid</strong>
        <div class="mermaid-zoom-actions">
          <button type="button" data-zoom="out" title="Thu nhỏ">−</button>
          <span class="mermaid-zoom-value">100%</span>
          <button type="button" data-zoom="in" title="Phóng to">+</button>
          <button type="button" data-zoom="reset" title="Kích thước ban đầu">Đặt lại</button>
          <button type="button" data-zoom="close" title="Đóng">✕</button>
        </div>
      </div>
      <div class="mermaid-zoom-viewport"><div class="mermaid-zoom-canvas"></div></div>`;
    const canvas = modal.querySelector('.mermaid-zoom-canvas');
    const zoomSvg = sourceSvg.cloneNode(true);
    canvas.appendChild(zoomSvg);
    const viewBox = (zoomSvg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    const baseWidth = Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : 1000;
    let scale = 1;
    const updateScale = () => {
      const scaledWidth = Math.max(320, Math.round(baseWidth * scale));
      zoomSvg.style.width = `${scaledWidth}px`;
      zoomSvg.style.maxWidth = 'none';
      zoomSvg.style.height = 'auto';
      canvas.style.width = `${scaledWidth}px`;
      modal.querySelector('.mermaid-zoom-value').textContent = `${Math.round(scale * 100)}%`;
    };
    const close = () => {
      document.removeEventListener('keydown', onKeydown);
      modal.remove();
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') close();
      if (event.key === '+' || event.key === '=') { scale = Math.min(3, scale + 0.2); updateScale(); }
      if (event.key === '-') { scale = Math.max(0.4, scale - 0.2); updateScale(); }
    };
    modal.addEventListener('click', (event) => {
      const action = event.target.closest('[data-zoom]')?.getAttribute('data-zoom');
      if (action === 'in') scale = Math.min(3, scale + 0.2);
      if (action === 'out') scale = Math.max(0.4, scale - 0.2);
      if (action === 'reset') scale = 1;
      if (action === 'close' || event.target === modal) return close();
      if (action) updateScale();
    });
    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(modal);
    updateScale();
  }

  /* ================= Navigation / routing ================= */

  function navigateTo(path) {
    const newHash = '#file=' + encodeURIComponent(path);
    if (window.location.hash === newHash) loadDocument(path);
    else window.location.hash = newHash;
  }

  function goHome() {
    if (window.location.hash === '#home' || window.location.hash === '') {
      showView('home');
      state.activePath = null;
      updateSidebarActive();
    } else {
      window.location.hash = '#home';
    }
  }

  function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (!hash || hash === 'home') {
      showView('home');
      state.activePath = null;
      updateSidebarActive();
      return;
    }
    const params = new URLSearchParams(hash);
    const file = params.get('file');
    if (file) {
      if (docsByPath.has(file)) loadDocument(file);
      else showView('home');
      return;
    }
    // Hash không phải file= (anchor nội trang, back/forward): scroll nếu có, giữ nguyên view
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ================= Search ================= */

  function openSearch(prefill) {
    DOM.searchModal.classList.add('active');
    DOM.searchInput.value = prefill || '';
    DOM.searchInput.focus();
    renderSearchResults(DOM.searchInput.value);
  }
  function closeSearch() {
    DOM.searchModal.classList.remove('active');
  }

  function renderSearchResults(query) {
    const q = query.trim();
    state.searchSelected = 0;
    if (q.length < 2) {
      DOM.searchResults.innerHTML = '<div class="search-hint">Gõ từ khóa, contract ID (BUS-009, API-BKG-004), ticket (TKT-W04-D01)...</div>';
      return;
    }
    const ql = q.toLowerCase();
    const matches = [];
    docs.forEach((doc) => {
      const inName = doc.filename.toLowerCase().includes(ql);
      const inTitle = doc.title.toLowerCase().includes(ql);
      const idx = doc.content.toLowerCase().indexOf(ql);
      if (!inName && !inTitle && idx === -1) return;

      let snippet = '';
      if (idx !== -1) {
        const start = Math.max(0, idx - 45);
        const end = Math.min(doc.content.length, idx + q.length + 110);
        snippet = (start > 0 ? '…' : '') + doc.content.substring(start, end).replace(/\s+/g, ' ') + '…';
      }
      matches.push({ doc, snippet, score: inName ? 0 : inTitle ? 1 : 2 });
    });
    matches.sort((a, b) => a.score - b.score);

    if (!matches.length) {
      DOM.searchResults.innerHTML = `<div class="search-hint">Không tìm thấy "${escapeHtml(q)}" trong ${docs.length} tài liệu.</div>`;
      return;
    }

    const hlRe = new RegExp(escapeRegExp(q), 'gi');
    DOM.searchResults.innerHTML = matches.slice(0, 20).map((m, i) => `
      <div class="search-result-item ${i === 0 ? 'selected' : ''}" data-path="${escapeHtml(m.doc.path)}">
        <div class="sr-title">${getFileIcon(m.doc)} ${escapeHtml(m.doc.title)}</div>
        <div class="sr-path">${escapeHtml(m.doc.path)}</div>
        ${m.snippet ? `<div class="sr-snippet">${escapeHtml(m.snippet).replace(hlRe, (x) => `<mark>${x}</mark>`)}</div>` : ''}
      </div>`).join('');

    DOM.searchResults.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        closeSearch();
        state.pendingHighlight = q;
        navigateTo(item.getAttribute('data-path'));
      });
    });
  }

  function moveSearchSelection(delta) {
    const items = [...DOM.searchResults.querySelectorAll('.search-result-item')];
    if (!items.length) return;
    state.searchSelected = Math.min(Math.max(state.searchSelected + delta, 0), items.length - 1);
    items.forEach((el, i) => el.classList.toggle('selected', i === state.searchSelected));
    items[state.searchSelected].scrollIntoView({ block: 'nearest' });
  }

  /* ================= Theme ================= */

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dv_theme', theme);
    DOM.btnTheme.textContent = theme === 'dark' ? '🌙' : '☀️';
    if (window.mermaid) {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'strict',
        themeVariables: {
          background: '#0b1020',
          primaryColor: '#161d3a',
          primaryTextColor: '#e6eaf6',
          primaryBorderColor: '#64748b',
          lineColor: '#94a3b8',
          secondaryColor: '#111731',
          tertiaryColor: '#1d2547',
          actorBkg: '#161d3a',
          actorBorder: '#64748b',
          actorTextColor: '#e6eaf6',
          actorLineColor: '#64748b',
          signalColor: '#e6eaf6',
          signalTextColor: '#e6eaf6',
          labelBoxBkgColor: '#111731',
          labelBoxBorderColor: '#64748b',
          labelTextColor: '#e6eaf6',
          noteBkgColor: '#1d2547',
          noteBorderColor: '#64748b',
          noteTextColor: '#e6eaf6',
          activationBkgColor: '#1d2547',
          activationBorderColor: '#64748b'
        },
        themeCSS: '.rect { fill: #111731 !important; stroke: #64748b !important; opacity: 1 !important; }'
      });
    }
  }

  /* ================= Init ================= */

  function init() {
    applyTheme(state.theme);
    DOM.docCountBadge.textContent = `${docs.length} tài liệu • build ${DATA.generatedAt}`;

    renderSidebar();
    renderHome();

    DOM.btnBrand.addEventListener('click', goHome);
    DOM.btnHome.addEventListener('click', goHome);
    DOM.btnTheme.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      if (state.activePath) loadDocument(state.activePath); // render lại mermaid theo theme
    });
    DOM.btnSearch.addEventListener('click', () => openSearch());

    DOM.searchModal.addEventListener('click', (e) => {
      if (e.target === DOM.searchModal) closeSearch();
    });
    DOM.searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));
    DOM.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSearchSelection(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSearchSelection(-1); }
      if (e.key === 'Enter') {
        const sel = DOM.searchResults.querySelector('.search-result-item.selected') ||
                    DOM.searchResults.querySelector('.search-result-item');
        if (sel) sel.click();
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    });

    DOM.sidebarFilterInput.addEventListener('input', (e) => {
      state.filter = e.target.value.toLowerCase().trim();
      renderSidebar();
    });

    DOM.btnRawToggle.addEventListener('click', () => {
      state.rawMode = !state.rawMode;
      DOM.docRaw.hidden = !state.rawMode;
      DOM.docContent.hidden = state.rawMode;
      DOM.btnRawToggle.classList.toggle('on', state.rawMode);
    });

    DOM.btnCopyPath.addEventListener('click', () => {
      if (!state.activePath) return;
      const text = state.activePath;
      const done = () => {
        DOM.btnCopyPath.textContent = '✅ Đã copy';
        setTimeout(() => { DOM.btnCopyPath.textContent = '📋 Copy path'; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {});
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); ta.remove();
        done();
      }
    });

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
  }

  // Hook debug: window.__dv.parseMarkdown('...') để thử parser trên console
  window.__dv = { parseMarkdown, inlineMarkdown };

  document.addEventListener('DOMContentLoaded', init);
})();
