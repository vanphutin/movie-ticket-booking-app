/**
 * AI Control Plane - Movie Ticket Booking Contracts Explorer
 * Core Application Engine v2 (Workbench)
 */

(function () {
  'use strict';

  // State Management
  const state = {
    documents: window.AI_CONTRACTS_DATA || [],
    activeDocId: 'README.md',
    activeTab: 'reader',
    theme: localStorage.getItem('ai_contracts_theme') || 'dark',
    sidebarFilter: '',
    searchQuery: '',
    roadmapWeekFilter: 'ALL',
    roadmapStatusFilter: 'ALL',
    currentDrillIndex: 0
  };

  const drillQuestions = [
    {
      topic: 'Microservices & Outbox Pattern (Week 9)',
      question: 'Tại sao không nên gọi trực tiếp API gửi email trong cùng 1 DB transaction tạo đơn hàng? Khái niệm Transactional Outbox giải quyết vấn đề này thế nào?',
      answer: '1) Network I/O trong DB Transaction làm giữ connection lock lâu gây cạn connection pool.\n2) Nếu API ngoài timeout/lỗi, DB transaction bị dính rủi ro partial failure bất đồng bộ.\n3) Transactional Outbox ghi tin nhắn vào bảng `outbox` trong cùng DB transaction, sau đó Worker mới xử lý gửi bất đồng bộ an toàn.'
    },
    {
      topic: 'Clean Architecture & Encapsulation (Week 2-4)',
      question: 'Tại sao Domain Entity không nên import NestJS Service hay ORM Repository? Nguyên lý Inversion of Control (IoC) giải quyết vấn đề này thế nào?',
      answer: '1) Domain Layer chứa Business Rules thuần túy, không phụ thuộc Framework hay Database (High Cohesion, Low Coupling).\n2) Dependency Inversion Principle (DIP): Domain định nghĩa Interface/Port, Infrastructure triển khai Adapter.\n3) Dễ viết Unit Test bằng In-Memory fake repository mà không cần boot DB thật.'
    },
    {
      topic: 'Auth & Bearer Token Security (Week 5)',
      question: 'Khác biệt giữa Authentication JWT Token và Trusted Service Identity trong kiến trúc Microservices là gì?',
      answer: '1) JWT Token mang thông tin End-User (Customer/Admin) dùng cho Gateway auth.\n2) Trusted Service Identity (mTLS hoặc Service Secret Header) dùng cho liên dịch vụ nội bộ (Internal Service-to-Service), áp dụng deny-by-default cho endpoint nội bộ.'
    },
    {
      topic: 'Idempotency & Concurrent Holds (Week 7-8)',
      question: 'Xử lý race condition khi 2 khách hàng cùng giữ (hold) 1 ghế xem phim cùng 1 thời điểm thế nào?',
      answer: '1) Dùng Database Optimistic Locking (version column) hoặc Pessimistic Locking (`SELECT FOR UPDATE`).\n2) Sử dụng Redis Distributed Lock (`SET NX EX`) theo `seat_id` với TTL ngắn.\n3) Đảm bảo Idempotency Key cho API Payment để tránh trừ tiền 2 lần.'
    }
  ];

  const apiEndpoints = [
    {
      method: 'POST',
      path: '/api/v1/auth/login',
      title: 'Customer/Admin Login',
      service: 'Identity Service',
      reqBody: '{\n  "email": "user@example.com",\n  "password": "SecurePassword123!"\n}',
      resBody: '{\n  "accessToken": "eyJhbGciOiJKV1Qi...",\n  "tokenType": "Bearer",\n  "expiresIn": 86400\n}'
    },
    {
      method: 'GET',
      path: '/api/v1/movies',
      title: 'Catalog Movies List',
      service: 'Catalog Service',
      reqBody: 'Params: page=1&limit=20&status=SHOWING',
      resBody: '{\n  "data": [\n    {\n      "id": "mov_01",\n      "title": "Avenger",\n      "durationMinutes": 150\n    }\n  ],\n  "pagination": { "page": 1, "limit": 20, "total": 1 }\n}'
    },
    {
      method: 'POST',
      path: '/api/v1/bookings/hold',
      title: 'Hold Seats API',
      service: 'Booking Service',
      reqBody: '{\n  "showId": "show_99",\n  "seatIds": ["A1", "A2"],\n  "holdDurationSeconds": 600\n}',
      resBody: '{\n  "holdId": "hold_555",\n  "status": "HELD",\n  "expiresAt": "2026-07-23T16:00:00Z"\n}'
    }
  ];

  // DOM Elements
  const DOM = {
    themeToggleBtn: document.getElementById('btn-theme-toggle'),
    searchTriggerBtn: document.getElementById('btn-search-trigger'),
    searchModal: document.getElementById('search-modal'),
    searchModalInput: document.getElementById('search-modal-input'),
    searchModalResults: document.getElementById('search-modal-results'),
    patchModal: document.getElementById('patch-modal'),
    btnOpenPatchModal: document.getElementById('btn-open-patch-modal'),
    btnClosePatchModal: document.getElementById('btn-close-patch-modal'),
    btnCopyPatch: document.getElementById('btn-copy-patch'),
    sidebarTreeContainer: document.getElementById('sidebar-tree-container'),
    sidebarSearchInput: document.getElementById('sidebar-search-input'),
    markdownRenderOutput: document.getElementById('markdown-render-output'),
    rawSourceOutput: document.getElementById('raw-source-output'),
    docPathLabel: document.getElementById('doc-path-label'),
    docTitleLabel: document.getElementById('doc-title-label'),
    tocListContainer: document.getElementById('toc-list-container'),
    ticketsGridContainer: document.getElementById('tickets-grid-container'),
    roadmapFilterWeek: document.getElementById('roadmap-filter-week'),
    roadmapFilterStatus: document.getElementById('roadmap-filter-status'),
    stateCardsContainer: document.getElementById('state-cards-container'),
    fileCountBadge: document.getElementById('file-count-badge'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    // Mentor Elements
    btnGenerateFeedback: document.getElementById('btn-generate-feedback'),
    feedbackOutputArea: document.getElementById('feedback-output-area'),
    mentorMarkdownResult: document.getElementById('mentor-markdown-result'),
    mentorWeekSelect: document.getElementById('mentor-week-select'),
    mentorScoreInput: document.getElementById('mentor-score-input'),
    mentorStrengthsInput: document.getElementById('mentor-strengths-input'),
    mentorImprovementInput: document.getElementById('mentor-improvement-input'),
    // Drill Elements
    drillTopicLabel: document.getElementById('drill-topic-label'),
    drillQuestionText: document.getElementById('drill-question-text'),
    drillAnswerBox: document.getElementById('drill-answer-box'),
    btnToggleAnswer: document.getElementById('btn-toggle-answer'),
    btnNextDrill: document.getElementById('btn-next-drill'),
    // API Elements
    apiEndpointList: document.getElementById('api-endpoint-list'),
    apiInspectorPane: document.getElementById('api-inspector-pane')
  };

  // Initialize App
  function init() {
    applyTheme(state.theme);
    setupEventListeners();
    renderSidebar();
    
    // Check initial URL Hash or default to README.md
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    // Initial render of components
    renderStateInspector();
    renderRoadmapExplorer();
    renderApiConsole();
    renderDrillQuestion();

    if (window.mermaid) {
      window.mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    }
    
    if (DOM.fileCountBadge) {
      DOM.fileCountBadge.textContent = `${state.documents.length} Documents Loaded`;
    }
  }

  // Theme Toggle
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ai_contracts_theme', theme);
    if (DOM.themeToggleBtn) {
      DOM.themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  }

  // Event Listeners
  function setupEventListeners() {
    if (DOM.themeToggleBtn) {
      DOM.themeToggleBtn.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    if (DOM.searchTriggerBtn) DOM.searchTriggerBtn.addEventListener('click', openSearchModal);
    if (DOM.searchModal) {
      DOM.searchModal.addEventListener('click', (e) => {
        if (e.target === DOM.searchModal) closeSearchModal();
      });
    }
    if (DOM.searchModalInput) {
      DOM.searchModalInput.addEventListener('input', (e) => renderSearchResults(e.target.value));
    }

    if (DOM.btnOpenPatchModal) DOM.btnOpenPatchModal.addEventListener('click', openPatchModal);
    if (DOM.btnClosePatchModal) DOM.btnClosePatchModal.addEventListener('click', closePatchModal);
    if (DOM.btnCopyPatch) {
      DOM.btnCopyPatch.addEventListener('click', () => {
        const text = document.getElementById('json-patch-preview').textContent;
        navigator.clipboard.writeText(text).then(() => {
          alert('JSON Patch copied to clipboard!');
        });
      });
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearchModal();
      }
      if (e.key === 'Escape') {
        closeSearchModal();
        closePatchModal();
      }
    });

    if (DOM.sidebarSearchInput) {
      DOM.sidebarSearchInput.addEventListener('input', (e) => {
        state.sidebarFilter = e.target.value.toLowerCase();
        renderSidebar();
      });
    }

    // Tab Switching
    DOM.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // Roadmap Filters
    if (DOM.roadmapFilterWeek) {
      DOM.roadmapFilterWeek.addEventListener('change', (e) => {
        state.roadmapWeekFilter = e.target.value;
        renderRoadmapExplorer();
      });
    }

    if (DOM.roadmapFilterStatus) {
      DOM.roadmapFilterStatus.addEventListener('change', (e) => {
        state.roadmapStatusFilter = e.target.value;
        renderRoadmapExplorer();
      });
    }

    // Mentor Feedback Generator
    if (DOM.btnGenerateFeedback) {
      DOM.btnGenerateFeedback.addEventListener('click', generateMentorFeedback);
    }

    // Drill Handlers
    if (DOM.btnToggleAnswer) {
      DOM.btnToggleAnswer.addEventListener('click', () => {
        const isHidden = DOM.drillAnswerBox.style.display === 'none';
        DOM.drillAnswerBox.style.display = isHidden ? 'block' : 'none';
        DOM.btnToggleAnswer.textContent = isHidden ? '🙈 Hide Key Points' : '👁️ View Expected Key Points & Tradeoffs';
      });
    }

    if (DOM.btnNextDrill) {
      DOM.btnNextDrill.addEventListener('click', () => {
        state.currentDrillIndex = (state.currentDrillIndex + 1) % drillQuestions.length;
        renderDrillQuestion();
      });
    }
  }

  // Switch Tab View
  function switchTab(tabName) {
    state.activeTab = tabName;
    DOM.tabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    DOM.tabPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });
  }

  // Handle URL Hash Routing (#file=contracts/api-contracts.md&tab=reader)
  function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (!hash) {
      loadDocument('README.md');
      return;
    }

    const params = new URLSearchParams(hash);
    const fileId = params.get('file');
    const tab = params.get('tab');

    if (fileId) loadDocument(fileId);
    if (tab) switchTab(tab);
  }

  // Load and Render Active Document
  function loadDocument(docId) {
    const doc = state.documents.find((d) => d.id === docId || d.path === docId);
    if (!doc) return;

    state.activeDocId = doc.id;
    updateActiveSidebarItem(doc.id);

    if (DOM.docPathLabel) DOM.docPathLabel.textContent = `AI-contracts/${doc.path}`;
    if (DOM.docTitleLabel) DOM.docTitleLabel.textContent = doc.title;

    if (DOM.rawSourceOutput) DOM.rawSourceOutput.textContent = doc.content;

    if (DOM.markdownRenderOutput) {
      const renderedHtml = parseMarkdown(doc.content);
      DOM.markdownRenderOutput.innerHTML = renderedHtml;

      renderMermaidDiagrams(DOM.markdownRenderOutput);
      enhanceCrossLinks(DOM.markdownRenderOutput);
      buildTableOfContents(DOM.markdownRenderOutput);
    }
  }

  async function renderMermaidDiagrams(containerEl) {
    if (!window.mermaid || !containerEl) return;
    const mermaidNodes = containerEl.querySelectorAll('.mermaid');
    
    for (let i = 0; i < mermaidNodes.length; i++) {
      const node = mermaidNodes[i];
      let rawCode = node.getAttribute('data-mermaid');
      if (!rawCode) rawCode = node.textContent.trim();
      if (!rawCode) continue;

      try {
        const uniqueId = 'mermaid-svg-' + Math.random().toString(36).substring(2, 9);
        const { svg } = await window.mermaid.render(uniqueId, rawCode);
        node.innerHTML = svg;
      } catch (err) {
        console.warn('Mermaid render error:', err);
        node.innerHTML = `<pre class="yaml-viewer"><code>${escapeHtml(rawCode)}</code></pre>`;
      }
    }
  }

  // Render Sidebar Tree Categories & Items
  function renderSidebar() {
    if (!DOM.sidebarTreeContainer) return;

    const categories = {};
    state.documents.forEach((doc) => {
      if (state.sidebarFilter) {
        const matchesName = doc.filename.toLowerCase().includes(state.sidebarFilter);
        const matchesTitle = doc.title.toLowerCase().includes(state.sidebarFilter);
        const matchesPath = doc.path.toLowerCase().includes(state.sidebarFilter);
        if (!matchesName && !matchesTitle && !matchesPath) return;
      }

      if (!categories[doc.category]) categories[doc.category] = [];
      categories[doc.category].push(doc);
    });

    let html = '';
    const categoryOrder = [
      'Root Policies',
      'Contracts',
      'State (YAML)',
      'Roadmap & Tickets',
      'Architecture Decisions (ADR)',
      'Contract Change Requests (CCR)',
      'Audits',
      'Templates'
    ];

    categoryOrder.forEach((catName) => {
      const docs = categories[catName];
      if (!docs || docs.length === 0) return;

      html += `
        <div class="category-group">
          <div class="category-header">
            <span>${catName}</span>
            <span class="category-count">${docs.length}</span>
          </div>
          <ul class="doc-list">
            ${docs
              .map((doc) => {
                const isActive = doc.id === state.activeDocId;
                const icon = getFileIcon(doc.filename);
                return `
                <li>
                  <a href="#file=${encodeURIComponent(doc.id)}" class="doc-item ${isActive ? 'active' : ''}" data-doc-id="${doc.id}">
                    <span class="doc-icon">${icon}</span>
                    <span title="${doc.filename}">${doc.filename}</span>
                  </a>
                </li>
              `;
              })
              .join('')}
          </ul>
        </div>
      `;
    });

    DOM.sidebarTreeContainer.innerHTML = html;

    DOM.sidebarTreeContainer.querySelectorAll('.doc-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-doc-id');
        loadDocument(id);
        if (state.activeTab !== 'reader') switchTab('reader');
      });
    });
  }

  function updateActiveSidebarItem(docId) {
    if (!DOM.sidebarTreeContainer) return;
    DOM.sidebarTreeContainer.querySelectorAll('.doc-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-doc-id') === docId);
    });
  }

  function getFileIcon(filename) {
    if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return '⚡';
    if (filename.startsWith('ADR')) return '🏛️';
    if (filename.startsWith('CCR')) return '🔄';
    if (filename.startsWith('TKT')) return '🎟️';
    if (filename.includes('contract')) return '📜';
    if (filename.includes('policy')) return '🛡️';
    return '📄';
  }

  // GFM Markdown Parser with Callout Alerts
  function parseMarkdown(mdText) {
    if (!mdText) return '';
    let lines = mdText.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer = [];
    let inTable = false;
    let tableBuffer = [];
    let inList = false;
    let listBuffer = [];

    function flushList() {
      if (inList) {
        html += `<ul>${listBuffer.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`;
        inList = false;
        listBuffer = [];
      }
    }

    function flushTable() {
      if (inTable && tableBuffer.length >= 2) {
        const headers = tableBuffer[0].split('|').slice(1, -1).map((h) => h.trim());
        const rows = tableBuffer.slice(2).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));

        html += `<table><thead><tr>${headers.map((h) => `<th>${inlineMarkdown(h)}</th>`).join('')}</tr></thead><tbody>`;
        rows.forEach((row) => {
          html += `<tr>${row.map((c) => `<td>${inlineMarkdown(c)}</td>`).join('')}</tr>`;
        });
        html += `</tbody></table>`;
      }
      inTable = false;
      tableBuffer = [];
    }

    lines.forEach((line) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          if (codeLanguage === 'mermaid') {
            const raw = codeBuffer.join('\n').trim();
            html += `<div class="mermaid" data-mermaid="${escapeHtml(raw)}"></div>`;
          } else {
            html += `<pre><code class="language-${codeLanguage}">${escapeHtml(codeBuffer.join('\n'))}</code></pre>`;
          }
          inCodeBlock = false;
          codeBuffer = [];
        } else {
          flushList();
          flushTable();
          inCodeBlock = true;
          codeLanguage = line.trim().substring(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList();
        inTable = true;
        tableBuffer.push(line.trim());
        return;
      } else if (inTable) {
        flushTable();
      }

      if (line.startsWith('#')) {
        flushList();
        flushTable();
        const level = line.match(/^#+/)[0].length;
        const titleText = line.substring(level).trim();
        const anchorId = titleText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        html += `<h${level} id="${anchorId}">${inlineMarkdown(titleText)}</h${level}>`;
        return;
      }

      if (line.trim().startsWith('>')) {
        flushList();
        flushTable();
        let content = line.trim().substring(1).trim();
        let calloutType = 'note';
        
        if (content.startsWith('[!NOTE]')) { calloutType = 'note'; content = content.replace('[!NOTE]', '').trim(); }
        else if (content.startsWith('[!TIP]')) { calloutType = 'tip'; content = content.replace('[!TIP]', '').trim(); }
        else if (content.startsWith('[!IMPORTANT]')) { calloutType = 'important'; content = content.replace('[!IMPORTANT]', '').trim(); }
        else if (content.startsWith('[!WARNING]')) { calloutType = 'warning'; content = content.replace('[!WARNING]', '').trim(); }
        else if (content.startsWith('[!CAUTION]')) { calloutType = 'caution'; content = content.replace('[!CAUTION]', '').trim(); }

        html += `
          <div class="callout callout-${calloutType}">
            <div class="callout-title">📌 ${calloutType.toUpperCase()}</div>
            <div>${inlineMarkdown(content)}</div>
          </div>
        `;
        return;
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        inList = true;
        listBuffer.push(line.trim().substring(2));
        return;
      } else if (inList) {
        flushList();
      }

      if (line.trim() === '---' || line.trim() === '***') {
        flushList();
        flushTable();
        html += '<hr style="border: none; border-top: 1px solid var(--border-color); margin: 2em 0;">';
        return;
      }

      if (line.trim().length > 0) {
        html += `<p>${inlineMarkdown(line)}</p>`;
      }
    });

    flushList();
    flushTable();

    return html;
  }

  function inlineMarkdown(text) {
    if (!text) return '';
    let out = escapeHtml(text);
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
    out = out.replace(/`(.*?)`/g, '<code>$1</code>');
    out = out.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="markdown-link" target="_blank">$1</a>');
    return out;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function enhanceCrossLinks(containerEl) {
    if (!containerEl) return;
    const textNodes = [];

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'A' && node.tagName !== 'CODE' && node.tagName !== 'PRE' && !node.classList.contains('mermaid') && !node.closest('.mermaid')) {
        node.childNodes.forEach(walk);
      }
    }
    walk(containerEl);

    const patterns = [
      /\b(TKT-W\d{2}-D\d{2})\b/g,
      /\b(CAP-[A-Z]+-\d{2})\b/g,
      /\b(BUS-\d{3}|ARCH-\d{3}|SEC-\d{3}|QUAL-\d{3})\b/g,
      /\b(FG-\d{3})\b/g,
      /\b(CCR-\d{3})\b/g,
      /\b(ADR-\d{3})\b/g
    ];

    textNodes.forEach((node) => {
      let content = node.nodeValue;
      let replaced = false;

      patterns.forEach((pattern) => {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match) => {
            replaced = true;
            return `<span class="ref-link" data-ref="${match}">${match}</span>`;
          });
        }
      });

      if (replaced) {
        const wrapper = document.createElement('span');
        wrapper.innerHTML = content;
        node.parentNode.replaceChild(wrapper, node);
      }
    });

    containerEl.querySelectorAll('.ref-link').forEach((link) => {
      link.addEventListener('click', () => handleRefLinkClick(link.getAttribute('data-ref')));
    });
  }

  function handleRefLinkClick(refId) {
    if (refId.startsWith('TKT-')) {
      switchTab('roadmap');
      highlightTicketCard(refId);
    } else if (refId.startsWith('ADR-')) {
      loadDocument('decisions/ADR-001-microservice-clean-architecture.md');
      switchTab('reader');
    } else if (refId.startsWith('CCR-')) {
      loadDocument('changes/CCR-001-control-plane-and-architecture-rebaseline.md');
      switchTab('reader');
    } else {
      openSearchModal();
      if (DOM.searchModalInput) {
        DOM.searchModalInput.value = refId;
        renderSearchResults(refId);
      }
    }
  }

  function buildTableOfContents(renderedContainer) {
    if (!DOM.tocListContainer || !renderedContainer) return;
    const headings = renderedContainer.querySelectorAll('h1, h2, h3');
    let html = '';

    headings.forEach((h) => {
      const level = parseInt(h.tagName.substring(1), 10);
      const title = h.textContent;
      const anchorId = h.id || title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      h.id = anchorId;

      html += `
        <li class="toc-item">
          <a href="#${anchorId}" class="toc-link depth-${level}">${title}</a>
        </li>
      `;
    });

    DOM.tocListContainer.innerHTML = html || '<li class="toc-item"><span style="color: var(--text-dim); font-size: 12px;">No headings</span></li>';

    DOM.tocListContainer.querySelectorAll('.toc-link').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = a.getAttribute('href').substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // Render Roadmap & Tickets Explorer
  function renderRoadmapExplorer() {
    if (!DOM.ticketsGridContainer) return;

    const roadmapDoc = state.documents.find((d) => d.filename === 'weeks-4-10.md');
    if (!roadmapDoc) return;

    const tickets = parseRoadmapTickets(roadmapDoc.content);
    let filtered = tickets;

    if (state.roadmapWeekFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.id.includes(state.roadmapWeekFilter));
    }
    if (state.roadmapStatusFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.status === state.roadmapStatusFilter);
    }

    let html = '';
    filtered.forEach((t) => {
      const statusClass = `status-${t.status.toLowerCase().replace(/_/g, '-')}`;
      html += `
        <div class="ticket-card" id="card-${t.id}">
          <div class="ticket-top">
            <span class="ticket-id-badge">${t.id}</span>
            <span class="ticket-status-badge ${statusClass}">${t.status}</span>
          </div>
          <div class="ticket-title">${t.title}</div>
          <div class="ticket-meta">
            <div><strong>Phase:</strong> ${t.phase} | <strong>Milestone:</strong> ${t.milestone}</div>
            <div><strong>Prerequisite:</strong> ${t.prerequisite || 'None'}</div>
          </div>
          <div class="ticket-capabilities">
            ${t.capabilities.map((c) => `<span class="cap-tag">${c}</span>`).join('')}
          </div>
        </div>
      `;
    });

    DOM.ticketsGridContainer.innerHTML = html || '<div style="color: var(--text-muted); grid-column: 1/-1;">No tickets matched filter criteria.</div>';
  }

  function parseRoadmapTickets(roadmapMd) {
    const tickets = [];
    const lines = roadmapMd.split('\n');
    let currentTicket = null;

    lines.forEach((line) => {
      if (line.match(/### Ticket (TKT-W\d{2}-D\d{2})/)) {
        if (currentTicket) tickets.push(currentTicket);
        const ticketId = line.match(/TKT-W\d{2}-D\d{2}/)[0];
        const title = line.split(':').slice(1).join(':').trim() || ticketId;
        currentTicket = {
          id: ticketId,
          title: title,
          phase: 'P0 (Control Plane)',
          milestone: 'M0 (Baseline)',
          prerequisite: 'FG-001',
          capabilities: ['CAP-CON-01'],
          status: ticketId === 'TKT-W04-D01' ? 'NOT_STARTED' : 'NOT_STARTED'
        };
      } else if (currentTicket) {
        if (line.includes('Phase:')) currentTicket.phase = line.split('Phase:')[1].trim();
        if (line.includes('Capabilities:')) {
          const caps = line.split('Capabilities:')[1].match(/CAP-[A-Z]+-\d{2}/g);
          if (caps) currentTicket.capabilities = caps;
        }
      }
    });

    if (currentTicket) tickets.push(currentTicket);
    return tickets;
  }

  function highlightTicketCard(ticketId) {
    setTimeout(() => {
      const card = document.getElementById(`card-${ticketId}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.borderColor = 'var(--accent-primary)';
        card.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.5)';
        setTimeout(() => {
          card.style.borderColor = '';
          card.style.boxShadow = '';
        }, 3000);
      }
    }, 100);
  }

  // Render State Inspector
  function renderStateInspector() {
    if (!DOM.stateCardsContainer) return;
    const stateDocs = state.documents.filter((d) => d.category === 'State (YAML)');
    let html = '';

    stateDocs.forEach((doc) => {
      html += `
        <div class="state-card">
          <div class="state-card-header">
            <div class="state-card-title">
              <span>⚡</span>
              <span>${doc.filename}</span>
            </div>
            <span style="font-size: 11px; color: var(--text-dim);">${doc.path}</span>
          </div>
          <pre class="yaml-viewer">${escapeHtml(doc.content)}</pre>
        </div>
      `;
    });

    DOM.stateCardsContainer.innerHTML = html;
  }

  // Render API Console
  function renderApiConsole() {
    if (!DOM.apiEndpointList || !DOM.apiInspectorPane) return;

    DOM.apiEndpointList.innerHTML = apiEndpoints
      .map(
        (ep, idx) => `
      <div class="api-endpoint-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
        <span class="method-badge method-${ep.method.toLowerCase()}">${ep.method}</span>
        <span>${ep.path}</span>
      </div>
    `
      )
      .join('');

    renderApiDetails(0);

    DOM.apiEndpointList.querySelectorAll('.api-endpoint-item').forEach((item) => {
      item.addEventListener('click', () => {
        DOM.apiEndpointList.querySelectorAll('.api-endpoint-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        renderApiDetails(idx);
      });
    });
  }

  function renderApiDetails(idx) {
    const ep = apiEndpoints[idx];
    if (!ep) return;

    DOM.apiInspectorPane.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <span class="method-badge method-${ep.method.toLowerCase()}" style="font-size: 12px;">${ep.method}</span>
          <span style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; margin-left: 8px;">${ep.path}</span>
        </div>
        <span class="cap-tag">${ep.service}</span>
      </div>
      
      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">Request Payload / Headers:</div>
        <pre class="yaml-viewer">${escapeHtml(ep.reqBody)}</pre>
      </div>

      <div>
        <div style="font-size: 12px; font-weight: 700; color: var(--accent-emerald); margin-bottom: 4px;">Expected Response Contract:</div>
        <pre class="yaml-viewer">${escapeHtml(ep.resBody)}</pre>
      </div>
    `;
  }

  // Mentor Feedback Generator
  function generateMentorFeedback() {
    const week = DOM.mentorWeekSelect.value;
    const score = DOM.mentorScoreInput.value;
    const strengths = DOM.mentorStrengthsInput.value || '- Thực hiện đầy đủ yêu cầu bài tập.\n- Mã nguồn sạch sẽ, tuân thủ Clean Architecture.';
    const improvements = DOM.mentorImprovementInput.value || '- Bổ sung thêm unit test coverage cho edge cases.';

    const md = `### Mentor Review (Week ${week})

**Score:** ${score}/10

**Strengths**
${strengths}

**Needs Improvement**
${improvements}

**Next Actions**
- Tiếp tục thực hiện ticket tiếp theo trong roadmap.
- Đảm bảo kiểm traDoR/DoD checklist trước khi gửi PR.

**Interview Drill**
- Question: Trình bày vai trò của Transactional Outbox pattern trong Microservices.
- Evaluation: Trả lời chính xác ý chính.`;

    if (DOM.mentorMarkdownResult) DOM.mentorMarkdownResult.textContent = md;
    if (DOM.feedbackOutputArea) DOM.feedbackOutputArea.style.display = 'block';
  }

  // Drill Simulator
  function renderDrillQuestion() {
    const q = drillQuestions[state.currentDrillIndex];
    if (!q) return;

    if (DOM.drillTopicLabel) DOM.drillTopicLabel.textContent = `Topic: ${q.topic}`;
    if (DOM.drillQuestionText) DOM.drillQuestionText.textContent = q.question;
    if (DOM.drillAnswerBox) {
      DOM.drillAnswerBox.innerHTML = `<strong>Expected Points:</strong><br>${escapeHtml(q.answer).replace(/\n/g, '<br>')}`;
      DOM.drillAnswerBox.style.display = 'none';
    }
    if (DOM.btnToggleAnswer) DOM.btnToggleAnswer.textContent = '👁️ View Expected Key Points & Tradeoffs';
  }

  // Search & Patch Modal
  function openSearchModal() {
    if (DOM.searchModal) {
      DOM.searchModal.classList.add('active');
      if (DOM.searchModalInput) {
        DOM.searchModalInput.value = '';
        DOM.searchModalInput.focus();
      }
      renderSearchResults('');
    }
  }

  function closeSearchModal() {
    if (DOM.searchModal) DOM.searchModal.classList.remove('active');
  }

  function openPatchModal() {
    if (DOM.patchModal) DOM.patchModal.classList.add('active');
  }

  function closePatchModal() {
    if (DOM.patchModal) DOM.patchModal.classList.remove('active');
  }

  function renderSearchResults(query) {
    if (!DOM.searchModalResults) return;
    const q = query.toLowerCase().trim();

    if (!q) {
      DOM.searchModalResults.innerHTML = `
        <div style="color: var(--text-dim); text-align: center; padding: 20px; font-size: 13px;">
          Type any keyword, contract ID (e.g. BUS-001), ticket (TKT-W04-D01) or policy...
        </div>
      `;
      return;
    }

    const matches = [];
    state.documents.forEach((doc) => {
      const idxTitle = doc.title.toLowerCase().indexOf(q);
      const idxFilename = doc.filename.toLowerCase().indexOf(q);
      const idxContent = doc.content.toLowerCase().indexOf(q);

      if (idxTitle !== -1 || idxFilename !== -1 || idxContent !== -1) {
        let snippet = '';
        if (idxContent !== -1) {
          const start = Math.max(0, idxContent - 40);
          const end = Math.min(doc.content.length, idxContent + 100);
          snippet = '...' + doc.content.substring(start, end).replace(/\n/g, ' ') + '...';
        } else {
          snippet = doc.path;
        }

        matches.push({ doc, snippet });
      }
    });

    if (matches.length === 0) {
      DOM.searchModalResults.innerHTML = `
        <div style="color: var(--text-muted); text-align: center; padding: 20px;">
          No matching documents found for "${escapeHtml(q)}"
        </div>
      `;
      return;
    }

    DOM.searchModalResults.innerHTML = matches
      .slice(0, 15)
      .map(
        (m) => `
        <div class="search-result-item" data-doc-id="${m.doc.id}">
          <div class="search-result-title">${m.doc.filename} — <span style="font-weight: 400; color: var(--text-muted);">${m.doc.category}</span></div>
          <div class="search-result-snippet">${escapeHtml(m.snippet)}</div>
        </div>
      `
      )
      .join('');

    DOM.searchModalResults.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-doc-id');
        closeSearchModal();
        loadDocument(id);
        switchTab('reader');
      });
    });
  }

  // Boot Application
  document.addEventListener('DOMContentLoaded', init);
})();
