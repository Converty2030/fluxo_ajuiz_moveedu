/* =============================================================
   FILTROS — Multi-seleção por Marca
   ============================================================= */

const Filters = (function () {
  'use strict';

  const state = {
    allMarcas: [],
    selected: new Set(), // marcas selecionadas
    searchTerm: ''
  };

  let onChangeCb = null;

  // Elementos do DOM
  const els = {
    btn: null,
    badge: null,
    dropdown: null,
    options: null,
    search: null,
    selectAll: null,
    clear: null
  };

  function init(onChange) {
    onChangeCb = onChange;

    els.btn       = document.getElementById('filterBtn');
    els.badge     = document.getElementById('filterBadge');
    els.dropdown  = document.getElementById('filterDropdown');
    els.options   = document.getElementById('filterOptions');
    els.search    = document.getElementById('filterSearch');
    els.selectAll = document.getElementById('filterSelectAll');
    els.clear     = document.getElementById('filterClear');

    els.btn.addEventListener('click', toggleDropdown);

    document.addEventListener('click', (e) => {
      if (!els.dropdown.contains(e.target) && !els.btn.contains(e.target)) {
        closeDropdown();
      }
    });

    els.search.addEventListener('input', (e) => {
      state.searchTerm = e.target.value.toLowerCase().trim();
      renderOptions();
    });

    els.selectAll.addEventListener('click', () => {
      state.selected = new Set(state.allMarcas.map(m => m.marca));
      renderOptions();
      updateBadge();
      notifyChange();
    });

    els.clear.addEventListener('click', () => {
      state.selected.clear();
      renderOptions();
      updateBadge();
      notifyChange();
    });
  }

  function setMarcas(list) {
    state.allMarcas = list || [];
    // Mantém apenas seleções ainda válidas
    const validSet = new Set(state.allMarcas.map(m => m.marca));
    state.selected = new Set([...state.selected].filter(m => validSet.has(m)));
    renderOptions();
    updateBadge();
  }

  function getSelected() {
    return state.selected;
  }

  function toggleDropdown() {
    const isOpen = els.dropdown.classList.contains('show');
    if (isOpen) closeDropdown();
    else openDropdown();
  }

  function openDropdown() {
    els.dropdown.classList.add('show');
    els.btn.setAttribute('aria-expanded', 'true');
    els.search.focus();
  }

  function closeDropdown() {
    els.dropdown.classList.remove('show');
    els.btn.setAttribute('aria-expanded', 'false');
  }

  function renderOptions() {
    if (!els.options) return;
    if (!state.allMarcas || state.allMarcas.length === 0) {
      els.options.innerHTML = '<p class="filter-empty">Carregue uma base para listar as marcas.</p>';
      return;
    }

    const filtered = state.allMarcas.filter(m =>
      !state.searchTerm || m.marca.toLowerCase().includes(state.searchTerm)
    );

    if (filtered.length === 0) {
      els.options.innerHTML = '<p class="filter-empty">Nenhuma marca encontrada.</p>';
      return;
    }

    els.options.innerHTML = filtered.map(m => {
      const id = 'fopt-' + m.marca.replace(/\W+/g, '_');
      const checked = state.selected.has(m.marca) ? 'checked' : '';
      return `
        <label class="filter-option" for="${id}">
          <input type="checkbox" id="${id}" data-marca="${escapeAttr(m.marca)}" ${checked} />
          <span>${escapeHtml(m.marca)}</span>
          <span class="count">${m.count}</span>
        </label>
      `;
    }).join('');

    // Listeners
    els.options.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        const marca = input.getAttribute('data-marca');
        if (input.checked) state.selected.add(marca);
        else state.selected.delete(marca);
        updateBadge();
        notifyChange();
      });
    });
  }

  function updateBadge() {
    const n = state.selected.size;
    if (n > 0) {
      els.badge.hidden = false;
      els.badge.textContent = n;
    } else {
      els.badge.hidden = true;
    }
  }

  function notifyChange() {
    if (typeof onChangeCb === 'function') onChangeCb(state.selected);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  return {
    init,
    setMarcas,
    getSelected
  };
})();
