/* =============================================================
   KANBAN — 8 etapas do fluxo de ajuizamento
   ============================================================= */

const Kanban = (function () {
  'use strict';

  let _currentRows = [];
  let _searchTerm = '';

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNum = new Intl.NumberFormat('pt-BR');
  const fmtDate = (d) => d ? d.toLocaleDateString('pt-BR') : '—';

  function init() {
    const search = document.getElementById('kanbanSearch');
    if (search) {
      search.addEventListener('input', (e) => {
        _searchTerm = (e.target.value || '').toLowerCase().trim();
        if (_currentRows.length) render(_currentRows);
      });
    }

    // Modal
    const overlay = document.getElementById('modalOverlay');
    const close = document.getElementById('modalClose');
    if (close) close.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function render(rows) {
    _currentRows = rows;

    const groups = DataProcessor.groupByStage(rows);
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    // Stats topo
    const totalNoFluxo = groups.reduce((s, g) => s + g.total, 0);
    const naoClassificados = rows.length - totalNoFluxo;
    document.getElementById('kanbanStats').innerHTML = `
      <span><strong>${fmtNum.format(totalNoFluxo)}</strong> processos no fluxo
      ${naoClassificados > 0 ? `<span style="color: var(--gray-500); margin-left: 12px;">
        (${fmtNum.format(naoClassificados)} sem etapa marcada)
      </span>` : ''}
      </span>
    `;

    // Constrói as colunas
    board.innerHTML = groups.map((g, i) => {
      const filtered = filterCards(g.items);
      return `
        <div class="kanban-column" data-stage="${i}">
          <div class="kanban-column-header">
            <span class="kanban-column-title">${escapeHtml(g.label)}</span>
            <span class="kanban-column-count">${fmtNum.format(filtered.length)}</span>
          </div>
          <div class="kanban-column-total">
            ${fmtBRL.format(filtered.reduce((s, x) => s + x.valor_causa, 0))}
          </div>
          <div class="kanban-cards">
            ${filtered.length === 0
              ? '<div class="kanban-card-empty">Sem registros nesta etapa.</div>'
              : filtered.map(renderCard).join('')
            }
          </div>
        </div>
      `;
    }).join('');

    // Click nos cards para abrir modal
    board.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => {
        const ri = parseInt(card.getAttribute('data-rowindex'), 10);
        const item = _currentRows.find(r => r.rowIndex === ri);
        if (item) openModal(item);
      });
    });
  }

  function filterCards(items) {
    if (!_searchTerm) return items;
    return items.filter(r => {
      const hay = `${r.nome} ${r.cnpj_cpf} ${r.numero_processo} ${r.marca}`.toLowerCase();
      return hay.includes(_searchTerm);
    });
  }

  function renderCard(r) {
    return `
      <div class="kanban-card" data-rowindex="${r.rowIndex}" tabindex="0">
        <div class="kanban-card-name" title="${escapeAttr(r.nome)}">${escapeHtml(r.nome)}</div>
        <div class="kanban-card-doc">${escapeHtml(r.cnpj_cpf || '—')}</div>
        <div class="kanban-card-footer">
          <span class="kanban-card-marca" title="${escapeAttr(r.marca)}">${escapeHtml(r.marca)}</span>
          <span class="kanban-card-value">${fmtBRL.format(r.valor_causa)}</span>
        </div>
      </div>
    `;
  }

  /* ---------- MODAL ---------- */
  function openModal(item) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = item.nome || 'Detalhes do Processo';

    const stageLabel = item.currentStage >= 0
      ? DataProcessor.STAGES[item.currentStage].label
      : 'Sem etapa marcada';

    const protoTag = item.protocolada
      ? '<span class="value tag success">Sim</span>'
      : '<span class="value tag warning">Não</span>';

    body.innerHTML = `
      <div class="modal-row">
        <span class="label">Marca</span>
        <span class="value">${escapeHtml(item.marca)}</span>
      </div>
      <div class="modal-row">
        <span class="label">CNPJ / CPF</span>
        <span class="value">${escapeHtml(item.cnpj_cpf || '—')}</span>
      </div>
      <div class="modal-row">
        <span class="label">Nome</span>
        <span class="value">${escapeHtml(item.nome)}</span>
      </div>
      <div class="modal-row">
        <span class="label">Etapa Atual</span>
        <span class="value tag">${escapeHtml(stageLabel)}</span>
      </div>
      <div class="modal-row">
        <span class="label">Valor Sistema</span>
        <span class="value">${fmtBRL.format(item.valor_sistema)}</span>
      </div>
      <div class="modal-row">
        <span class="label">Valor da Causa</span>
        <span class="value">${fmtBRL.format(item.valor_causa)}</span>
      </div>
      <div class="modal-row">
        <span class="label">Data de Distribuição</span>
        <span class="value">${fmtDate(item.data_distribuicao)}</span>
      </div>
      <div class="modal-row">
        <span class="label">Nº do Processo</span>
        <span class="value">${escapeHtml(item.numero_processo || '—')}</span>
      </div>
      <div class="modal-row">
        <span class="label">Protocolada</span>
        ${protoTag}
      </div>
    `;

    overlay.hidden = false;
  }

  function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.hidden = true;
  }

  /* ---------- HELPERS ---------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  return {
    init,
    render,
    closeModal
  };
})();
