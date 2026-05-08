/* =============================================================
   APP — Orquestração geral (navegação, upload, eventos)
   ============================================================= */

(function () {
  'use strict';

  const App = {
    raw: null,           // resultado do DataProcessor.process(): { rows, warnings, meta }
    currentView: 'dashboard'
  };

  /* ---------- TOAST ---------- */
  const Toast = {
    container: null,
    init() { this.container = document.getElementById('toastContainer'); },
    show(opts) {
      const { title, message, type = 'info', duration = 4500 } = opts;
      const icons = {
        success: 'bi-check-circle-fill',
        error:   'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info:    'bi-info-circle-fill'
      };
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.innerHTML = `
        <i class="bi ${icons[type] || icons.info} toast-icon"></i>
        <div class="toast-content">
          ${title ? `<strong>${escapeHtml(title)}</strong>` : ''}
          ${escapeHtml(message)}
        </div>
      `;
      this.container.appendChild(el);
      setTimeout(() => {
        el.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => el.remove(), 200);
      }, duration);
    }
  };

  /* ---------- NAVEGAÇÃO ---------- */
  function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        switchView(view);
        // Fecha sidebar mobile
        if (window.innerWidth <= 768) {
          document.body.classList.remove('sidebar-open');
          document.getElementById('sidebar').classList.remove('show');
        }
      });
    });
  }

  function switchView(view) {
    App.currentView = view;
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.getAttribute('data-view') === view);
    });

    const empty = document.getElementById('emptyState');
    const dash  = document.getElementById('viewDashboard');
    const kan   = document.getElementById('viewKanban');
    const title = document.getElementById('pageTitle');

    if (!App.raw) {
      empty.hidden = false;
      dash.hidden  = true;
      kan.hidden   = true;
      title.textContent = view === 'kanban' ? 'Fluxo' : 'Dashboard';
      return;
    }

    empty.hidden = true;
    if (view === 'kanban') {
      dash.hidden = true;
      kan.hidden  = false;
      title.textContent = 'Fluxo Kanban';
      Kanban.render(getFilteredRows());
    } else {
      dash.hidden = false;
      kan.hidden  = true;
      title.textContent = 'Dashboard';
      Dashboard.render(getFilteredRows());
    }
  }

  /* ---------- SIDEBAR ---------- */
  function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.getElementById('sidebarToggle');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        try { localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed') ? '1' : '0'); } catch(_){}
      });
    }

    try {
      if (localStorage.getItem('sidebarCollapsed') === '1' && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
      }
    } catch(_){}

    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        document.body.classList.toggle('sidebar-open');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        document.body.classList.remove('sidebar-open');
      });
    }
  }

  /* ---------- UPLOAD ---------- */
  function setupUpload() {
    const input = document.getElementById('fileInput');
    if (!input) return;

    input.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        showBanner(`<i class="bi bi-arrow-clockwise"></i> Processando "${escapeHtml(file.name)}"...`);
        const wb = await FileHandler.readWorkbook(file);
        const result = DataProcessor.process(wb);
        App.raw = result;

        Filters.setMarcas(DataProcessor.listMarcas(result.rows));

        switchView(App.currentView);
        renderActiveView();

        Toast.show({
          type: 'success',
          title: 'Base atualizada',
          message: `${result.rows.length} registro(s) processado(s) da aba "${result.meta.sheetName}".`
        });

        showBanner(`<i class="bi bi-check2-circle"></i> Base "${escapeHtml(file.name)}" • ${result.rows.length} registro(s) • Atualizada em ${result.meta.loadedAt.toLocaleString('pt-BR')}`);

        if (result.warnings.length) {
          result.warnings.forEach(w => {
            Toast.show({ type: 'warning', title: 'Atenção', message: w });
          });
        }
      } catch (err) {
        console.error(err);
        Toast.show({
          type: 'error',
          title: 'Erro ao processar',
          message: err.message || 'Falha ao ler o arquivo.'
        });
        showBanner(`<i class="bi bi-x-circle"></i> ${escapeHtml(err.message || 'Erro ao processar arquivo')}`);
      } finally {
        input.value = '';
      }
    });
  }

  /* ---------- BANNER STATUS ---------- */
  function showBanner(html) {
    const banner = document.getElementById('statusBanner');
    const text = document.getElementById('statusBannerText');
    if (banner && text) {
      text.innerHTML = html;
      banner.hidden = false;
    }
  }

  function setupBannerClose() {
    const close = document.getElementById('statusBannerClose');
    const banner = document.getElementById('statusBanner');
    if (close && banner) {
      close.addEventListener('click', () => banner.hidden = true);
    }
  }

  /* ---------- FILTRO ---------- */
  function getFilteredRows() {
    if (!App.raw) return [];
    const sel = Filters.getSelected();
    return DataProcessor.filterByMarca(App.raw.rows, sel);
  }

  function renderActiveView() {
    if (!App.raw) return;
    const rows = getFilteredRows();
    if (App.currentView === 'kanban') {
      Kanban.render(rows);
    } else {
      Dashboard.render(rows);
    }
  }

  /* ---------- ESCAPE ---------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ---------- CARREGAMENTO AUTOMÁTICO (GitHub) ---------- */
  // Caminho da base versionada no repositório.
  // Para atualizar os dados: substitua este arquivo no GitHub via commit.
  const REPO_BASE_PATH = 'data/painel.xlsx';

  /**
   * Tenta carregar a planilha hospedada no repositório.
   * @returns {Promise<boolean>} true se carregou com sucesso, false caso contrário
   */
  async function tryLoadRepoBase() {
    try {
      showBanner('<i class="bi bi-arrow-clockwise"></i> Carregando base do repositório...');
      // cache-bust pelo timestamp do dia (atualiza ao menos a cada hora)
      const bust = Math.floor(Date.now() / 3600000);
      const response = await fetch(`${REPO_BASE_PATH}?v=${bust}`, { cache: 'no-cache' });
      if (!response.ok) {
        // 404 = arquivo não existe ainda (esperado em primeiro deploy)
        if (response.status === 404) return false;
        throw new Error(`HTTP ${response.status} ao baixar a base.`);
      }

      const buffer = await response.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), {
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      const result = DataProcessor.process(wb);
      App.raw = result;

      Filters.setMarcas(DataProcessor.listMarcas(result.rows));
      switchView(App.currentView);
      renderActiveView();

      // Tenta obter Last-Modified do servidor (GitHub Pages costuma enviar)
      const lastMod = response.headers.get('last-modified');
      const dateInfo = lastMod
        ? new Date(lastMod).toLocaleString('pt-BR')
        : new Date().toLocaleString('pt-BR');

      showBanner(
        `<i class="bi bi-cloud-check"></i> Base carregada do repositório • ` +
        `${result.rows.length} registro(s) • atualizada em ${dateInfo}`
      );

      Toast.show({
        type: 'success',
        title: 'Base atualizada do GitHub',
        message: `${result.rows.length} registro(s) carregado(s) automaticamente.`
      });

      if (result.warnings.length) {
        result.warnings.forEach(w => {
          Toast.show({ type: 'warning', title: 'Atenção', message: w });
        });
      }
      return true;
    } catch (err) {
      console.warn('[Auto-load]', err);
      return false;
    }
  }

  /* ---------- BOOT DO PAINEL ---------- */
  // Chamado APÓS autenticação bem-sucedida (ou se já autenticado nesta sessão)
  async function bootPanel() {
    Toast.init();
    setupNavigation();
    setupSidebar();
    setupUpload();
    setupBannerClose();

    Dashboard.init();
    Kanban.init();
    Filters.init(() => renderActiveView());

    // 1. Tenta carregar a base do repositório (data/painel.xlsx)
    const loaded = await tryLoadRepoBase();

    // 2. Se não encontrou ou falhou, mostra empty state com instrução de upload
    if (!loaded) {
      showBanner(
        '<i class="bi bi-info-circle"></i> Nenhuma base encontrada no repositório. ' +
        'Clique em <strong>Atualizar Base</strong> para fazer upload manual ou ' +
        'adicione <code>data/painel.xlsx</code> no GitHub.'
      );
    }
  }

  /* ---------- INIT ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof Auth !== 'undefined') {
      // Autenticação obrigatória — só inicializa o painel após login
      Auth.init(bootPanel);
    } else {
      // Fallback (caso auth.js não esteja carregado)
      document.body.classList.remove('locked');
      bootPanel();
    }
  });

  // Expõe no window para debugging (opcional)
  window.App = App;
})();
