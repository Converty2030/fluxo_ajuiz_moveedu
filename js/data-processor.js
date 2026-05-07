/* =============================================================
   DATA PROCESSOR
   Lê e normaliza dados da aba "AJUIZADOS" da planilha Excel.
   ============================================================= */

const DataProcessor = (function () {
  'use strict';

  // Definição das 8 etapas do fluxo (colunas G a N)
  // index aqui = ordem na planilha (G=0, H=1, ... N=7)
  const STAGES = [
    { id: 'parecer_marca',     col: 'G', label: 'Aguarda Parecer Marca',     short: 'Parecer Marca'    },
    { id: 'parecer_juridico',  col: 'H', label: 'Aguarda Parecer Jurídico',  short: 'Parecer Jurídico' },
    { id: 'parecer_financeiro',col: 'I', label: 'Aguarda Parecer Financeiro',short: 'Parecer Financeiro'},
    { id: 'parecer_desfavoravel', col: 'J', label: 'Parecer Desfavorável',   short: 'Desfavorável'     },
    { id: 'parecer_ok',        col: 'K', label: 'Parecer OK',                short: 'Parecer OK'       },
    { id: 'aguarda_procuracao',col: 'L', label: 'Aguarda Procuração',        short: 'Procuração'       },
    { id: 'producao',          col: 'M', label: 'Produção',                  short: 'Produção'         },
    { id: 'protocolada',       col: 'N', label: 'Protocolada',               short: 'Protocolada'      }
  ];

  // Aliases para encontrar cabeçalhos com variações de nome
  const HEADER_ALIASES = {
    marca:             ['marca', 'cliente', 'unidade'],
    cnpj_cpf:          ['cnpj_cpf', 'cnpj/cpf', 'cnpj', 'cpf', 'documento', 'cnpjcpf', 'cpf_cnpj'],
    nome:              ['nome', 'nome_devedor', 'devedor', 'razao_social', 'razão_social', 'cliente_devedor'],
    valor_sistema:     ['valor_sistema', 'vlr_sistema', 'valor sistema', 'vl_sistema'],
    valor_causa:       ['valor_causa', 'vlr_causa', 'valor causa', 'vl_causa', 'valor_da_causa'],
    data_distribuicao: ['data_distribuicao', 'data_distribuição', 'data distribuição', 'data distribuicao', 'dt_distribuicao', 'distribuicao', 'distribuição'],
    numero_processo:   ['numero_processo', 'numero do processo', 'nº processo', 'no_processo', 'processo', 'n_processo'],
    protocolada_flag:  ['protocolada', 'protocolado', 'flag_protocolada']
  };

  /** Normaliza string para comparação (sem acentos, minúsculas, sem caracteres especiais) */
  function norm(str) {
    if (str == null) return '';
    return String(str)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /** Converte valor para booleano (true/false, 1/0, sim/não, x, etc.) */
  function toBool(value) {
    if (value === true || value === false) return value;
    if (value == null || value === '') return false;
    const s = String(value).trim().toLowerCase();
    if (['true', '1', 'sim', 's', 'yes', 'y', 'x', 'verdadeiro', 'ok'].includes(s)) return true;
    if (['false', '0', 'nao', 'não', 'n', 'no', 'falso', ''].includes(s)) return false;
    // Em última instância qualquer string não vazia que não seja "n" trata como verdadeira
    return false;
  }

  /** Converte para número (decimal) - aceita formatos brasileiros */
  function toNumber(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return value;
    let s = String(value).trim();
    if (!s) return 0;
    // Remove "R$", espaços
    s = s.replace(/[R$\s]/gi, '');
    // Detecta formato brasileiro (1.234,56) vs americano (1,234.56)
    const hasComma = s.includes(',');
    const hasDot   = s.includes('.');
    if (hasComma && hasDot) {
      // Se vírgula vem depois do ponto -> formato BR
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (hasComma) {
      // Apenas vírgula -> decimal BR
      s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  /** Converte para data — aceita Date, número serial Excel, e strings comuns */
  function toDate(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

    // Número serial do Excel
    if (typeof value === 'number') {
      // Excel: dias desde 1900-01-01 (com bug do ano bissexto de 1900)
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + value * 86400000);
      return isNaN(d.getTime()) ? null : d;
    }

    const s = String(value).trim();
    if (!s) return null;

    // Tenta dd/mm/yyyy ou dd-mm-yyyy
    const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (br) {
      let [, dd, mm, yyyy] = br;
      yyyy = yyyy.length === 2 ? '20' + yyyy : yyyy;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return isNaN(d.getTime()) ? null : d;
    }

    // Tenta ISO yyyy-mm-dd
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    // Última tentativa
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Identifica nome de coluna por aliases */
  function findHeader(headersNorm, aliases) {
    for (const a of aliases) {
      const an = norm(a);
      const idx = headersNorm.indexOf(an);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  /**
   * Processa o workbook (XLSX) e retorna a lista de devedores normalizada.
   * @param {Object} workbook - workbook retornado por XLSX.read()
   * @returns {{rows: Array, warnings: Array}}
   */
  function process(workbook) {
    const warnings = [];

    // Localiza aba "AJUIZADOS" (case-insensitive, sem acento)
    const sheetName = workbook.SheetNames.find(
      n => norm(n) === 'ajuizados'
    );

    if (!sheetName) {
      throw new Error(
        'Aba "AJUIZADOS" não encontrada. Abas disponíveis: ' +
        workbook.SheetNames.join(', ')
      );
    }

    const sheet = workbook.Sheets[sheetName];

    // Extrai como matriz para ter controle exato sobre colunas (G..N por posição)
    const aoa = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false
    });

    if (aoa.length < 2) {
      throw new Error('A aba "AJUIZADOS" não contém dados (apenas cabeçalho ou vazia).');
    }

    const headers = aoa[0].map(h => h == null ? '' : String(h));
    const headersNorm = headers.map(norm);

    // Mapeamento por header (aliases) com fallback para POSIÇÃO (A..Q)
    const idx = {
      marca:             findHeader(headersNorm, HEADER_ALIASES.marca),
      cnpj_cpf:          findHeader(headersNorm, HEADER_ALIASES.cnpj_cpf),
      nome:              findHeader(headersNorm, HEADER_ALIASES.nome),
      valor_sistema:     findHeader(headersNorm, HEADER_ALIASES.valor_sistema),
      valor_causa:       findHeader(headersNorm, HEADER_ALIASES.valor_causa),
      data_distribuicao: findHeader(headersNorm, HEADER_ALIASES.data_distribuicao),
      numero_processo:   findHeader(headersNorm, HEADER_ALIASES.numero_processo),
      protocolada_flag:  findHeader(headersNorm, HEADER_ALIASES.protocolada_flag)
    };

    // Posições padrão por letra de coluna (fallback)
    // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16
    const COL = { A:0, B:1, C:2, D:3, E:4, F:5, G:6, H:7, I:8, J:9, K:10, L:11, M:12, N:13, O:14, P:15, Q:16 };

    if (idx.marca === -1) idx.marca = COL.A;
    if (idx.cnpj_cpf === -1) idx.cnpj_cpf = COL.B;
    if (idx.nome === -1) idx.nome = COL.C;
    if (idx.valor_sistema === -1) idx.valor_sistema = COL.D;
    if (idx.valor_causa === -1) idx.valor_causa = COL.E;
    if (idx.data_distribuicao === -1) idx.data_distribuicao = COL.O;
    if (idx.numero_processo === -1) idx.numero_processo = COL.P;
    if (idx.protocolada_flag === -1) {
      // Q (índice 16) ou cai para N (13)
      idx.protocolada_flag = headers.length > COL.Q ? COL.Q : COL.N;
    }

    // Etapas: SEMPRE colunas G..N por posição (conforme especificação)
    const stageColIdx = STAGES.map((_, i) => COL.G + i); // 6..13

    const rows = [];
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row || row.every(c => c == null || c === '')) continue;

      // Etapas
      const stages = stageColIdx.map(ci => toBool(row[ci]));
      // "Etapa atual": a última (rightmost) marcada como true; se nenhuma, -1
      let currentStage = -1;
      for (let s = stages.length - 1; s >= 0; s--) {
        if (stages[s]) { currentStage = s; break; }
      }

      const valorSistema = toNumber(row[idx.valor_sistema]);
      const valorCausa   = toNumber(row[idx.valor_causa]);
      const dataDistr    = toDate(row[idx.data_distribuicao]);
      const protoFlag    = toBool(row[idx.protocolada_flag]);

      // "Protocolada": flag explícita OU coluna N marcada
      const isProtocolada = protoFlag || stages[7];

      rows.push({
        rowIndex: r,
        marca: row[idx.marca] != null ? String(row[idx.marca]).trim() : '(Sem marca)',
        cnpj_cpf: row[idx.cnpj_cpf] != null ? String(row[idx.cnpj_cpf]).trim() : '',
        nome: row[idx.nome] != null ? String(row[idx.nome]).trim() : '(Sem nome)',
        valor_sistema: valorSistema,
        valor_causa: valorCausa,
        data_distribuicao: dataDistr,
        numero_processo: row[idx.numero_processo] != null ? String(row[idx.numero_processo]).trim() : '',
        protocolada: isProtocolada,
        stages: stages,        // [bool, bool, ..., bool] tamanho 8
        currentStage: currentStage  // 0..7 ou -1
      });
    }

    if (rows.length === 0) {
      warnings.push('Nenhum registro válido encontrado na aba "AJUIZADOS".');
    }

    return {
      rows,
      warnings,
      meta: {
        sheetName,
        totalRows: rows.length,
        loadedAt: new Date(),
        headers,
        idx
      }
    };
  }

  /** Filtra linhas pelas marcas selecionadas (vazio = todas) */
  function filterByMarca(rows, marcasSet) {
    if (!marcasSet || marcasSet.size === 0) return rows;
    return rows.filter(r => marcasSet.has(r.marca));
  }

  /** Lista única de marcas com contagem */
  function listMarcas(rows) {
    const map = new Map();
    rows.forEach(r => {
      const m = r.marca || '(Sem marca)';
      map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([marca, count]) => ({ marca, count }))
      .sort((a, b) => a.marca.localeCompare(b.marca, 'pt-BR'));
  }

  /** Resumo agregado por marca */
  function summaryByMarca(rows) {
    const map = new Map();
    rows.forEach(r => {
      const key = r.marca;
      if (!map.has(key)) {
        map.set(key, {
          marca: key,
          processos: 0,
          devedoresSet: new Set(),
          valorTotal: 0,
          protocoladas: 0,
          pendentes: 0
        });
      }
      const a = map.get(key);
      a.processos++;
      if (r.cnpj_cpf) a.devedoresSet.add(r.cnpj_cpf);
      a.valorTotal += r.valor_causa;
      if (r.protocolada) a.protocoladas++; else a.pendentes++;
    });
    return Array.from(map.values()).map(o => ({
      marca: o.marca,
      processos: o.processos,
      devedores: o.devedoresSet.size,
      valorTotal: o.valorTotal,
      protocoladas: o.protocoladas,
      pendentes: o.pendentes,
      pctConclusao: o.processos > 0 ? (o.protocoladas / o.processos) * 100 : 0
    })).sort((a, b) => b.processos - a.processos);
  }

  /** Agrupa por etapa */
  function groupByStage(rows) {
    const groups = STAGES.map((s, i) => ({
      ...s,
      index: i,
      items: [],
      total: 0,
      valorTotal: 0
    }));
    rows.forEach(r => {
      if (r.currentStage >= 0 && r.currentStage < STAGES.length) {
        groups[r.currentStage].items.push(r);
        groups[r.currentStage].total++;
        groups[r.currentStage].valorTotal += r.valor_causa;
      }
    });
    return groups;
  }

  /** Série temporal por mês (YYYY-MM) */
  function timeSeriesByMonth(rows) {
    const map = new Map();
    rows.forEach(r => {
      if (!r.data_distribuicao) return;
      const d = r.data_distribuicao;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { period: key, count: 0, valor: 0 });
      const a = map.get(key);
      a.count++;
      a.valor += r.valor_causa;
    });
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  /** Série temporal por semana (YYYY-WW) */
  function timeSeriesByWeek(rows) {
    const map = new Map();
    rows.forEach(r => {
      if (!r.data_distribuicao) return;
      const d = r.data_distribuicao;
      const target = new Date(d.valueOf());
      const dayNr = (d.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = new Date(target.getFullYear(), 0, 4);
      const week = 1 + Math.round(
        ((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7
      );
      const key = `${target.getFullYear()}-S${String(week).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { period: key, count: 0, valor: 0 });
      const a = map.get(key);
      a.count++;
      a.valor += r.valor_causa;
    });
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  /** KPIs gerais */
  function computeKPIs(rows) {
    const total = rows.length;
    const valorTotal = rows.reduce((s, r) => s + r.valor_causa, 0);
    const devedores = new Set(rows.map(r => r.cnpj_cpf).filter(Boolean)).size;
    const protocoladas = rows.filter(r => r.protocolada).length;
    const pendentes = total - protocoladas;
    const ticket = total > 0 ? valorTotal / total : 0;

    return { total, valorTotal, devedores, protocoladas, pendentes, ticket };
  }

  // API pública
  return {
    STAGES,
    process,
    filterByMarca,
    listMarcas,
    summaryByMarca,
    groupByStage,
    timeSeriesByMonth,
    timeSeriesByWeek,
    computeKPIs,
    // Utilitários
    toNumber,
    toBool,
    toDate
  };
})();
