# Pasta `data/`

Esta pasta armazena a **base de dados oficial** do painel.

## Como funciona o carregamento automático

Quando o painel é aberto, ele tenta automaticamente carregar o arquivo:

```
data/painel.xlsx
```

- Se o arquivo **existir** no repositório → o painel carrega tudo automaticamente, sem
  pedir upload ao usuário.
- Se o arquivo **não existir** ainda → o painel exibe a mensagem inicial e o usuário
  pode fazer upload manual pelo botão "Atualizar Base".

## Como atualizar a base (manutenção)

1. Gere/exporte sua planilha mais recente.
2. Renomeie o arquivo para exatamente: **`painel.xlsx`** (em minúsculas).
3. Substitua o arquivo `data/painel.xlsx` no repositório (commit e push).
4. Aguarde 1-2 minutos para o GitHub Pages republicar.
5. Acesse o painel e faça **Ctrl + F5** para forçar recarregamento.

> **Cache-busting:** o painel já adiciona `?v=<timestamp>` na URL para evitar cache
> agressivo do navegador. Mesmo assim, em alguns casos pode ser necessário
> Ctrl+F5 após uma atualização.

## ⚠️ Aviso de privacidade

Como o painel é hospedado no GitHub Pages **público**, o arquivo `data/painel.xlsx`
fica acessível publicamente em uma URL como:

```
https://<seu-usuario>.github.io/<seu-repo>/data/painel.xlsx
```

**Qualquer pessoa que descobrir essa URL pode baixar a planilha**, com todos os
CNPJ/CPF, valores e nomes dos devedores.

### Como mitigar:
- **Repositório privado** com GitHub Pages habilitado (requer plano pago/Enterprise).
- **Anonimizar dados sensíveis** (mascarar CPF: `***.***.123-**`, ou substituir
  nomes por iniciais) antes de subir o arquivo.
- **Hospedar em ambiente protegido** (intranet, VPN, servidor próprio) em vez do
  GitHub Pages.

## Estrutura esperada da planilha

A planilha (.xlsx ou .xls) deve conter uma aba chamada **`AJUIZADOS`** com os
seguintes campos (cabeçalhos na primeira linha):

| Coluna | Campo                       | Tipo     |
|--------|-----------------------------|----------|
| A      | MARCA                       | Texto    |
| B      | CNPJ_CPF                    | Texto    |
| C      | NOME                        | Texto    |
| D      | VALOR_SISTEMA               | Decimal  |
| E      | VALOR_CAUSA                 | Decimal  |
| F      | (livre)                     | —        |
| G      | AGUARDA PARECER MARCA       | Booleano |
| H      | AGUARDA PARECER JURÍDICO    | Booleano |
| I      | AGUARDA PARECER FINANCEIRO  | Booleano |
| J      | PARECER DESFAVORÁVEL        | Booleano |
| K      | PARECER OK                  | Booleano |
| L      | AGUARDA PROCURAÇÃO          | Booleano |
| M      | PRODUÇÃO                    | Booleano |
| N      | PROTOCOLADA                 | Booleano |
| O      | DATA DE DISTRIBUIÇÃO        | Data     |
| P      | NÚMERO DO PROCESSO          | Texto    |
| Q      | PROTOCOLADA (flag final)    | Booleano |

> **Importante:** Apenas a aba `AJUIZADOS` será considerada. Outras abas serão
> ignoradas pelo sistema.

**Booleanos aceitos:** `TRUE`/`FALSE`, `1`/`0`, `SIM`/`NÃO`, `X` (em qualquer caixa).

**Datas aceitas:** formato Excel nativo, `dd/mm/aaaa`, `dd-mm-aaaa`, `aaaa-mm-dd`.
