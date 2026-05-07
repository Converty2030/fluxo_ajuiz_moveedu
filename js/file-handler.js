/* =============================================================
   FILE HANDLER
   Trata o upload do arquivo Excel e dispara o processamento.
   ============================================================= */

const FileHandler = (function () {
  'use strict';

  /**
   * Lê um File (Excel) e devolve uma promise com o workbook XLSX.
   */
  function readWorkbook(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('Nenhum arquivo selecionado.'));
        return;
      }

      const validExt = /\.(xlsx|xls|xlsm)$/i.test(file.name);
      if (!validExt) {
        reject(new Error('Formato inválido. Use um arquivo .xls, .xlsx ou .xlsm.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true,    // tenta parser nativo de datas
            cellNF: false,
            cellText: false
          });
          resolve(workbook);
        } catch (err) {
          reject(new Error('Não foi possível ler o arquivo: ' + err.message));
        }
      };

      reader.onerror = function () {
        reject(new Error('Falha na leitura do arquivo.'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  return {
    readWorkbook
  };
})();
