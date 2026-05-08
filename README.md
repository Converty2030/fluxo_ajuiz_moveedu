# Fluxo de Ajuizamento Moveedu

Painel corporativo interativo para acompanhamento do **fluxo de ajuizamento de devedores** da operação **Moveedu** — desenvolvido pela **Converty Recuperadora de Ativos**.

O painel exibe, em tempo real, em qual etapa cada devedor se encontra, valores envolvidos, datas relevantes e a evolução dos ajuizamentos ao longo do tempo. A base de dados é atualizada simplesmente fazendo o upload de um arquivo Excel — **sem necessidade de alterar código**.

---

## Demonstração

- **Tela de login** corporativa com proteção por senha (3 tentativas + bloqueio).
- **Dashboard** com KPIs, gráficos modernos (Chart.js) e tabela consolidada por marca.
- **Kanban** com 8 colunas representando as etapas do fluxo.
- **Filtro** multi-seleção por **MARCA**.
- **Upload** de planilha `.xls` / `.xlsx` direto pela interface.
- 100% estático — pronto para **GitHub Pages**.

---

## Estrutura do Projeto

```
Moveedu Fluxo Ajuizamentos/
├── index.html                ← Página principal
├── README.md                 ← Este arquivo
├── .nojekyll                 ← Garante que o GitHub Pages publique a pasta como está
├── .gitignore
│
├── assets/
│   └── images/
│       └── logo-placeholder.svg   ← Substituir pela logo oficial (ver abaixo)
│
├── css/
│   ├── main.css              ← Estilos base, sidebar, topbar
│   ├── components.css        ← KPIs, gráficos, kanban, modais, filtro
│   ├── login.css             ← Tela de autenticação
│   └── responsive.css        ← Adaptações tablet / mobile
│
├── js/
│   ├── auth.js               ← Tela de login + controle de tentativas
│   ├── app.js                ← Orquestração geral (navegação, eventos)
│   ├── data-processor.js     ← Leitura e normalização da planilha
│   ├── file-handler.js       ← Upload de Excel
│   ├── filters.js            ← Filtro multi-seleção por marca
│   ├── dashboard.js          ← KPIs e gráficos (Chart.js)
│   └── kanban.js             ← Visualização Kanban + modal de detalhes
│
└── data/
    └── README.md             ← Instruções e contrato de dados da planilha
```

> **Manutenção:** cada arquivo tem uma responsabilidade única, facilitando a manutenção. Para mudar cores, edite `css/main.css` (variáveis `--blue-*`). Para mudar gráficos, edite `js/dashboard.js`. Para mudar o fluxo de etapas, edite o array `STAGES` em `js/data-processor.js`.

---

## Acesso (Login)

Antes de exibir o painel, o sistema solicita uma senha:

| Item | Valor |
|------|-------|
| **Senha** | `converty_moveedu` |
| **Tentativas permitidas** | 3 |
| **Comportamento após 3 falhas** | Bloqueio até a sessão ser recarregada (Ctrl+F5 ou nova aba) |
| **Persistência** | A autenticação vale **enquanto a aba estiver aberta** (sessionStorage) |

A sidebar possui um botão **"Sair"** no rodapé para encerrar a sessão e voltar à tela de login.

### Alterando a senha

A senha é definida em `js/auth.js`, no objeto `CONFIG`:

```js
const CONFIG = {
  PASSWORD: 'converty_moveedu',  // ← altere aqui
  MAX_ATTEMPTS: 3,
  ...
};
```

> **Aviso de segurança:** como o painel é estático (front-end puro), a senha fica visível no código-fonte do navegador. Esta camada de autenticação é uma **barreira de uso**, não uma proteção criptográfica. Para dados realmente sensíveis, considere hospedar o painel em ambiente protegido (intranet, VPN, ou GitHub Pages privado em conta Enterprise).

---

## Como executar localmente

Como o projeto é 100% estático, basta abrir o `index.html` em um navegador moderno. Recomenda-se, porém, servi-lo com um pequeno servidor local para evitar restrições de `file://`:

### Opção 1 — Python
```bash
cd "Moveedu Fluxo Ajuizamentos"
python -m http.server 8080
# Acesse http://localhost:8080
```

### Opção 2 — Node (http-server)
```bash
npx http-server "Moveedu Fluxo Ajuizamentos" -p 8080
```

### Opção 3 — VS Code
Use a extensão **Live Server** e clique em **"Go Live"** no canto inferior direito.

---

## Publicação no GitHub Pages

1. **Crie um repositório** no GitHub (público ou privado com Pages habilitado).
2. **Faça o push** desta pasta para o branch `main` (ou `master`):
   ```bash
   git init
   git add .
   git commit -m "Painel Fluxo de Ajuizamento Moveedu"
   git branch -M main
   git remote add origin https://github.com/<seu-usuario>/<seu-repo>.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings → Pages**.
4. Em **Source**, selecione `Deploy from a branch`.
5. Em **Branch**, escolha `main` e a pasta `/ (root)`.
6. Salve. Em alguns minutos o painel estará disponível em:
   ```
   https://<seu-usuario>.github.io/<seu-repo>/
   ```

> O arquivo `.nojekyll` evita que o GitHub Pages tente processar o site com Jekyll, garantindo que todos os arquivos (incluindo os JS) sejam servidos corretamente.

---

## Atualização da Base de Dados

A base é um **arquivo Excel** (`.xls` ou `.xlsx`). Apenas a aba **`AJUIZADOS`** é considerada.

### Carregamento automático (recomendado)

O painel tenta carregar automaticamente o arquivo **`data/painel.xlsx`** do repositório toda vez que é aberto.

**Para atualizar a base de forma centralizada:**

1. Renomeie sua planilha mais recente para **`painel.xlsx`**.
2. Substitua o arquivo `data/painel.xlsx` no repositório:
   ```bash
   git add data/painel.xlsx
   git commit -m "data: atualiza base $(date +%Y-%m-%d)"
   git push
   ```
   Ou via GitHub web: navegue até `data/painel.xlsx`, clique no lápis (✏️) → "Upload files" → arraste a nova versão.
3. Aguarde ~1 minuto para o GitHub Pages republicar.
4. Acesse o painel e faça **Ctrl + F5** se necessário (limpar cache).

> ⚠️ **Privacidade:** se o repositório for público, qualquer pessoa com a URL `https://<usuario>.github.io/<repo>/data/painel.xlsx` poderá baixar a planilha. Veja `data/README.md` para opções de mitigação.

### Upload manual (alternativo)

Se preferir testar dados localmente sem fazer commit, ou se o `data/painel.xlsx` não existe ainda:

1. Acesse o painel.
2. No canto superior direito, clique em **Atualizar Base**.
3. Selecione uma planilha `.xlsx` ou `.xls`.
4. Os dados serão exibidos **apenas durante a sessão atual** (não ficam salvos).

### Estrutura da planilha (aba `AJUIZADOS`)

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

**Booleanos aceitos:** `TRUE`/`FALSE`, `1`/`0`, `SIM`/`NÃO`, `X` (marcado), em qualquer caixa.

**Datas aceitas:** formato Excel nativo, `dd/mm/aaaa`, `dd-mm-aaaa`, `aaaa-mm-dd`.

**Etapa atual** = última coluna entre G e N marcada como verdadeira.

**Protocolada** = `TRUE` se a coluna `Q` (flag) **OU** a coluna `N` (etapa) estiver marcada.

---

## Substituindo a logo

A logo padrão é um placeholder em `assets/images/logo-placeholder.svg`.

Para usar a **logo oficial da Converty**:

1. Salve a imagem em `assets/images/` (ex.: `logo-converty.jpg` ou `logo-converty.png`).
2. Edite o arquivo `index.html` e troque, na linha:
   ```html
   <img src="assets/images/logo-placeholder.svg" alt="Logo Moveedu" class="sidebar-logo" id="sidebarLogo" />
   ```
   pelo caminho da nova logo:
   ```html
   <img src="assets/images/logo-converty.jpg" alt="Logo Converty" class="sidebar-logo" id="sidebarLogo" />
   ```
3. Se a logo for colorida e a sidebar for escura, remova o filtro CSS adicionando esta linha no fim do `css/main.css`:
   ```css
   .sidebar-logo { filter: none; }
   ```

---

## Tecnologias Utilizadas

| Tecnologia                                                                                  | Função                                  |
|---------------------------------------------------------------------------------------------|------------------------------------------|
| HTML5 / CSS3 / JavaScript (ES2017+)                                                         | Frontend nativo, sem build               |
| [SheetJS](https://sheetjs.com/) (xlsx)                                                      | Leitura de planilhas `.xls` / `.xlsx`    |
| [Chart.js](https://www.chartjs.org/) 4.4                                                    | Gráficos modernos e interativos          |
| [Bootstrap Icons](https://icons.getbootstrap.com/) 1.11                                     | Ícones                                   |
| [Inter](https://fonts.google.com/specimen/Inter)                                            | Tipografia                               |

Todas as bibliotecas são carregadas via **CDN** — não há `npm install`, build ou backend.

---

## Compatibilidade

| Navegador       | Versão mínima |
|-----------------|---------------|
| Chrome / Edge   | 90+           |
| Firefox         | 90+           |
| Safari          | 14+           |
| iOS / Android   | Modernos       |

---

## Suporte

Em caso de dúvidas ou sugestões de melhoria, fale com a equipe do **departamento jurídico da Converty**.

---

© Converty Recuperadora de Ativos · Painel Moveedu
