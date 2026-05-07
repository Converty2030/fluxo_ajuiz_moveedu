# Pasta `data/`

Esta pasta destina-se ao **armazenamento opcional** de uma base Excel padrão.

## Como o sistema lê os dados

O sistema NÃO carrega arquivos automaticamente desta pasta — todos os carregamentos
de dados ocorrem **diretamente pelo botão de upload** disponível no canto superior
direito do painel.

Mantenha aqui uma cópia versionada da base mais recente apenas como histórico ou
referência para a equipe.

## Estrutura esperada da planilha

A planilha (.xls ou .xlsx) deve conter uma aba chamada **`AJUIZADOS`** com os
seguintes campos (cabeçalhos na primeira linha):

| Coluna | Campo              | Tipo       |
|--------|--------------------|------------|
| A      | MARCA              | Texto      |
| B      | CNPJ_CPF           | Texto      |
| C      | NOME               | Texto      |
| D      | VALOR_SISTEMA      | Decimal    |
| E      | VALOR_CAUSA        | Decimal    |
| F      | (livre)            | —          |
| G      | AGUARDA PARECER MARCA       | Booleano (TRUE/FALSE, SIM/NÃO, 1/0) |
| H      | AGUARDA PARECER JURÍDICO    | Booleano |
| I      | AGUARDA PARECER FINANCEIRO  | Booleano |
| J      | PARECER DESFAVORÁVEL        | Booleano |
| K      | PARECER OK                  | Booleano |
| L      | AGUARDA PROCURAÇÃO          | Booleano |
| M      | PRODUÇÃO                    | Booleano |
| N      | PROTOCOLADA                 | Booleano |
| O      | DATA_DISTRIBUICAO           | Data     |
| P      | NUMERO_PROCESSO             | Texto    |
| Q      | PROTOCOLADA (flag final)    | Booleano |

> **Importante:** Apenas a aba `AJUIZADOS` será considerada. Outras abas serão
> ignoradas pelo sistema.

## Atualização da base

Para atualizar os dados exibidos no painel:

1. Abra o painel publicado (GitHub Pages ou local).
2. Clique em **"Atualizar Base"** no canto superior direito.
3. Selecione o arquivo `.xls` ou `.xlsx` atualizado.
4. O painel processará e atualizará todos os indicadores e o Kanban.
