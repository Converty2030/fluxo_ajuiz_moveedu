/* =============================================================
   DASHBOARD — KPIs, gráficos e tabela
   ============================================================= */

const Dashboard = (function () {
  'use strict';

  // Paleta de cores para os gráficos
  const COLORS = {
    blue:   '#2563eb',
    blueL:  '#60a5fa',
    blueXL: '#dbeafe',
    teal:   '#14b8a6',
    green:  '#10b981',
    amber:  '#f59e0b',
    red:    '#ef4444',
    purple: '#8b5cf6',
    indigo: '#6366f1',
    rose:   '#f43f5e',
    cyan:   '#06b6d4',
    slate:  '#64748b'
  };

  const STAGE_PALETTE = [
    '#94a3b8', '#6366f1', '#8b5cf6', '#ef4444',
    '#10b981', '#f59e0b', '#06b6d4', '#1d4ed8'
  ];

  // Charts ativos (instâncias Chart.js)
  const charts = {
    evolucao: null,
    etapas: null,
    marcas: null,
    valorEtapas: null
  };

  let _evolMode = 'month'; // 'month' | 'week'
  let _currentRows = [];

  /* ---------- FORMATTERS ---------- */
  const fmtBRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2
  });

  const fmtBRLCompact = (v) => {
    if (Math.abs(v) >= 1e6) return 'R$ ' + (v / 1e6).toFixed(2).replace('.', ',') + ' mi';
    if (Math.abs(v) >= 1e3) return 'R$ ' + (v / 1e3).toFixed(1).replace('.', ',') + ' mil';
    return fmtBRL.format(v);
  };

  const fmtNum = new Intl.NumberFormat('pt-BR');
  const fmtPct = (v) => v.toFixed(1).replace('.', ',') + '%';

  /* ---------- INIT ---------- */
  function init() {
    // Toggle de modo de evolução
    document.querySelectorAll('[data-evol]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-evol]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _evolMode = btn.getAttribute('data-evol');
        if (_currentRows.length) renderEvolucao(_currentRows);
      });
    });

    // Defaults globais do Chart.js
    if (typeof Chart !== 'undefined') {
      Chart.defaults.font.family = "Inter, -apple-system, 'Segoe UI', sans-serif";
      Chart.defaults.font.size = 12;
      Chart.defaults.color = '#475569';
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.padding = 14;
      Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
      Chart.defaults.plugins.tooltip.titleColor = '#fff';
      Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
      Chart.defaults.plugins.tooltip.padding = 12;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
      Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 13 };
      Chart.defaults.plugins.tooltip.bodyFont = { size: 12.5 };
    }
  }

  /* ---------- RENDER PRINCIPAL ---------- */
  function render(rows) {
    _currentRows = rows;
    renderKPIs(rows);
    renderEvolucao(rows);
    renderEtapas(rows);
    renderMarcas(rows);
    renderValorEtapas(rows);
    renderTabelaMarcas(rows);
  }

  /* ---------- KPIs ---------- */
  function renderKPIs(rows) {
    const k = DataProcessor.computeKPIs(rows);
    setText('kpiTotalProcessos', fmtNum.format(k.total));
    setText('kpiTotalProcessosMeta', `${rows.length === _currentRows.length ? 'Registros na base' : 'Filtrado'}`);
    setText('kpiValorTotal', fmtBRL.format(k.valorTotal));
    setText('kpiDevedores', fmtNum.format(k.devedores));
    setText('kpiProtocoladas', fmtNum.format(k.protocoladas));
    const pctP = k.total > 0 ? (k.protocoladas / k.total) * 100 : 0;
    setText('kpiProtocoladasMeta', `${fmtPct(pctP)} do total`);
    setText('kpiPendentes', fmtNum.format(k.pendentes));
    setText('kpiPendentesMeta', `${fmtPct(100 - pctP)} aguardando`);
    setText('kpiTicket', fmtBRL.format(k.ticket));
  }

  /* ---------- EVOLUÇÃO ---------- */
  function renderEvolucao(rows) {
    const series = _evolMode === 'week'
      ? DataProcessor.timeSeriesByWeek(rows)
      : DataProcessor.timeSeriesByMonth(rows);

    const labels = series.map(s => formatPeriod(s.period, _evolMode));
    const counts = series.map(s => s.count);
    const valores = series.map(s => s.valor);

    if (charts.evolucao) charts.evolucao.destroy();

    const ctx = document.getElementById('chartEvolucao').getContext('2d');

    // Gradient para área
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');

    charts.evolucao = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Sem dados'],
        datasets: [
          {
            label: 'Processos',
            data: counts.length ? counts : [0],
            borderColor: COLORS.blue,
            backgroundColor: gradient,
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#fff',
            pointBorderColor: COLORS.blue,
            pointBorderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Valor (R$)',
            data: valores.length ? valores : [0],
            borderColor: COLORS.teal,
            borderDash: [6, 4],
            borderWidth: 2,
            tension: 0.35,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: COLORS.teal,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.yAxisID === 'y1') {
                  return `Valor: ${fmtBRL.format(ctx.parsed.y)}`;
                }
                return `Processos: ${fmtNum.format(ctx.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, autoSkipPadding: 16 }
          },
          y: {
            position: 'left',
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { precision: 0 }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            grid: { display: false },
            ticks: {
              callback: (v) => fmtBRLCompact(v)
            }
          }
        }
      }
    });
  }

  /* ---------- QUANTIDADE POR ETAPA ---------- */
  function renderEtapas(rows) {
    const groups = DataProcessor.groupByStage(rows);
    const labels = groups.map(g => g.short);
    const data = groups.map(g => g.total);

    if (charts.etapas) charts.etapas.destroy();
    const ctx = document.getElementById('chartEtapas').getContext('2d');

    charts.etapas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Devedores',
          data,
          backgroundColor: STAGE_PALETTE,
          borderRadius: 6,
          maxBarThickness: 38
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${fmtNum.format(ctx.parsed.x)} devedor(es)`
            }
          }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  /* ---------- DISTRIBUIÇÃO POR MARCA ---------- */
  function renderMarcas(rows) {
    const summary = DataProcessor.summaryByMarca(rows);
    // Limita a 8 marcas + "Outros"
    let labels = summary.map(s => s.marca);
    let data   = summary.map(s => s.processos);

    if (labels.length > 8) {
      const top = summary.slice(0, 7);
      const outros = summary.slice(7).reduce((s, x) => s + x.processos, 0);
      labels = top.map(s => s.marca).concat(['Outros']);
      data = top.map(s => s.processos).concat([outros]);
    }

    const palette = ['#1e40af','#2563eb','#3b82f6','#06b6d4','#14b8a6','#10b981','#8b5cf6','#94a3b8'];

    if (charts.marcas) charts.marcas.destroy();
    const ctx = document.getElementById('chartMarcas').getContext('2d');

    charts.marcas = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: palette,
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 12, padding: 12, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((s, x) => s + x, 0);
                const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${fmtNum.format(ctx.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /* ---------- VALOR FINANCEIRO POR ETAPA ---------- */
  function renderValorEtapas(rows) {
    const groups = DataProcessor.groupByStage(rows);
    const labels = groups.map(g => g.short);
    const data = groups.map(g => g.valorTotal);

    if (charts.valorEtapas) charts.valorEtapas.destroy();
    const ctx = document.getElementById('chartValorEtapas').getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, '#1d4ed8');
    gradient.addColorStop(1, '#60a5fa');

    charts.valorEtapas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Valor da Causa',
          data,
          backgroundColor: gradient,
          borderRadius: 8,
          maxBarThickness: 56
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => fmtBRL.format(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, autoSkip: false, font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (v) => fmtBRLCompact(v)
            }
          }
        }
      }
    });
  }

  /* ---------- TABELA POR MARCA ---------- */
  function renderTabelaMarcas(rows) {
    const summary = DataProcessor.summaryByMarca(rows);
    const tbody = document.querySelector('#tableMarcas tbody');

    if (summary.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 28px; color: var(--gray-500);">
        Nenhum dado para exibir.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = summary.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.marca)}</strong></td>
        <td class="num">${fmtNum.format(s.processos)}</td>
        <td class="num">${fmtNum.format(s.devedores)}</td>
        <td class="num">${fmtBRL.format(s.valorTotal)}</td>
        <td class="num">${fmtNum.format(s.protocoladas)}</td>
        <td class="num">${fmtNum.format(s.pendentes)}</td>
        <td class="num">
          <div class="pct-bar">
            <div class="pct-bar-track">
              <div class="pct-bar-fill" style="width: ${Math.min(100, s.pctConclusao).toFixed(1)}%"></div>
            </div>
            <span>${fmtPct(s.pctConclusao)}</span>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /* ---------- HELPERS ---------- */
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatPeriod(p, mode) {
    if (mode === 'week') {
      // 2026-S03 -> "Sem 03/26"
      const [year, week] = p.split('-S');
      return `Sem ${week}/${year.slice(-2)}`;
    }
    // 2026-03 -> "Mar/26"
    const [year, month] = p.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${meses[parseInt(month, 10) - 1]}/${year.slice(-2)}`;
  }

  function destroy() {
    Object.keys(charts).forEach(k => {
      if (charts[k]) { charts[k].destroy(); charts[k] = null; }
    });
  }

  return {
    init,
    render,
    destroy
  };
})();
