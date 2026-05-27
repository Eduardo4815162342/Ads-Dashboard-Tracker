# 📊 Ads Performance Dashboard

Dashboard de performance para afiliados que integra gastos do **Google Ads** com vendas de plataformas de afiliado (BuyGoods, ClickBank, MaxWeb) em tempo real.

Construído 100% com ferramentas gratuitas: Google Sheets + Google Apps Script + Make.com.

---

## 🗺️ Visão geral do sistema

```
Postback (BuyGoods / ClickBank / MaxWeb)
        ↓
      Make.com
        ├── Preenche GoogleAdsUpload  (conversão offline para o Google Ads)
        └── Preenche SalesLog         (registro interno de vendas)

Google Ads Script (roda diariamente)
        └── Preenche AdSpend          (gastos por campanha/adgroup/dia)

Google Apps Script Web App
        └── Lê AdSpend + SalesLog → exibe Dashboard no navegador

Todo dia 1º às 06:00 (automático)
        └── Salva resumo do mês anterior em MonthlySnapshot
```

---

## 🗂️ Estrutura da planilha

| Aba | Quem preenche | Descrição |
|---|---|---|
| `GoogleAdsUpload` | Make.com | Conversões offline para importar no Google Ads |
| `SalesLog` | Make.com | Registro completo de todas as vendas |
| `AdSpend` | Google Ads Script | Gastos por campanha, adgroup e dia (últimos 30 dias) |
| `Dashboard` | Fórmulas | Cruzamento de vendas x gastos com ROAS, ROI, CPA |
| `MonthlySnapshot` | Apps Script (automático) | Resumo consolidado mês a mês |

### Colunas — GoogleAdsUpload
| Google Click ID | Conversion Name | Conversion Time | Conversion Value | Conversion Currency |

### Colunas — SalesLog
| created_at | network | order_id | product | amount | currency | status | click_id | gclid | campaign_id | adgroup_id | keyword | date_only |

> `date_only` é uma coluna auxiliar com fórmula `=ARRAYFORMULA(IF(A2:A="","",LEFT(A2:A,10)))` para facilitar cruzamentos.

### Colunas — AdSpend
| date | campaign_id | campaign_name | adgroup_id | adgroup_name | clicks | impressions | cost |

### Colunas — MonthlySnapshot
| month | spend_brl | revenue_usd | revenue_brl | sales | clicks | cotacao_on_save |

### Cotação USD/BRL — Dashboard
Célula `N1` = rótulo `USD/BRL`  
Célula `N2` = fórmula `=GOOGLEFINANCE("CURRENCY:USDBRL")` — atualiza automaticamente.

---

## ⚙️ Arquivos do projeto

```
├── Code.gs          # Backend do Apps Script (Web App + snapshot mensal)
├── index.html       # Frontend do dashboard (HTML/CSS/JS)
├── ads-script.gs    # Script do Google Ads (preenche a aba AdSpend)
└── README.md        # Este arquivo
```

---

## 🚀 Como instalar

### 1. Planilha Google Sheets

1. Crie uma planilha no Google Sheets
2. Crie as abas: `GoogleAdsUpload`, `SalesLog`, `AdSpend`, `Dashboard`
3. Adicione os cabeçalhos em cada aba conforme a estrutura acima
4. Na aba `Dashboard`, célula `N1` escreva `USD/BRL` e em `N2` cole `=GOOGLEFINANCE("CURRENCY:USDBRL")`
5. Copie o ID da planilha na URL: `https://docs.google.com/spreadsheets/d/**SEU_ID**/edit`

### 2. Google Ads Script (preenche AdSpend diariamente)

1. Acesse [ads.google.com](https://ads.google.com) → Ferramentas → Scripts → **+**
2. Cole o conteúdo de `ads-script.gs`
3. Substitua `COLE_SEU_SPREADSHEET_ID_AQUI` pelo ID da sua planilha
4. Clique em **Autorizar** e depois em **Visualizar** para testar
5. Configure agenda: **diário às 01:00**

### 3. Web App (dashboard no navegador)

1. Na sua planilha, acesse **Extensões → Apps Script**
2. Apague o conteúdo padrão do `Code.gs` e cole o conteúdo de `Code.gs` deste repositório
3. Substitua `COLE_SEU_SPREADSHEET_ID_AQUI` pelo ID da sua planilha
4. Clique em **+** ao lado de Arquivos → HTML → nomeie como `index`
5. Cole o conteúdo de `index.html`
6. Salve (Ctrl+S)
7. Clique em **Implantar → Nova implantação → App da Web**
   - Executar como: **Eu mesmo**
   - Quem tem acesso: **Qualquer pessoa com conta Google** (ou Qualquer pessoa)
8. Copie a URL gerada — é o seu dashboard

### 4. Agendamento do snapshot mensal (só uma vez)

1. No Apps Script, selecione a função `criarAgendamento` no dropdown
2. Clique em **Executar ▶**
3. Confirme nos Registros: `Agendamento criado: todo dia 1 às 06:00`

Todo dia 1º às 06:00 o sistema salva automaticamente o resumo do mês anterior — sem precisar abrir nada.

### 5. Make.com

No seu cenário existente, após o módulo que preenche `GoogleAdsUpload`, adicione:

- **Módulo:** Google Sheets → Add a Row
- **Sheet:** `SalesLog`
- **Mapeamento:**

| Campo | Valor do postback |
|---|---|
| created_at | `{{now}}` ou timestamp do postback |
| network | BuyGoods / ClickBank / MaxWeb |
| order_id | `{{orderid}}` |
| product | `{{product}}` |
| amount | `{{amount}}` |
| currency | `{{cy}}` |
| status | `{{status}}` |
| click_id | `{{subid1}}` |
| gclid | `{{subid2}}` |
| campaign_id | `{{subid3}}` |
| adgroup_id | `{{subid4}}` |
| keyword | `{{subid5}}` |

---

## 🔗 Parâmetros de URL para o Google Ads

Adicione nos sufixos de URL da sua conta (Configurações da conta → Rastreamento):

```
subid2={gclid}&subid3={campaignid}&subid4={adgroupid}&subid5={keyword}
```

---

## 💡 Funcionalidades do dashboard

- **Cards de métricas:** Gasto, Receita, Lucro, ROAS, Vendas, CPA, Cliques
- **Gráficos:** Gasto vs Receita por campanha, Lucro por campanha, Gasto diário
- **Tabela:** Detalhamento por campanha com ROAS, ROI, CPA e status
- **Filtros:** Período (hoje/ontem/7d/14d/30d/tudo/personalizado), Campanha (busca), Produto (busca), Status (lucro/prejuízo/sem vendas)
- **Histórico mensal:** Pop-up com gráfico e tabela mês a mês (acumulado infinito)
- **Cotação automática:** USD/BRL via GOOGLEFINANCE, atualiza sozinha
- **Moedas:** Gasto em R$ (já vem em BRL do Google Ads), Receita convertida USD→BRL

---

## 💰 Lógica de moedas

| Dado | Moeda original | Exibição |
|---|---|---|
| Gasto (Google Ads) | BRL | R$ direto |
| Receita (vendas afiliado) | USD | USD × cotação = R$ |
| Lucro | — | Receita R$ − Gasto R$ |
| ROAS | — | Receita R$ ÷ Gasto R$ |

---

## 🔒 Segurança

- Substitua `COLE_SEU_SPREADSHEET_ID_AQUI` pelo ID real **antes de usar** (não commitar o ID real)
- O Apps Script autentica automaticamente pela sua conta Google — nenhuma chave de API fica exposta no código
- Recomenda-se manter a planilha com acesso restrito (não público)

---

## 🛠️ Stack

- **Google Sheets** — armazenamento de dados
- **Google Ads Scripts** — coleta de gastos via GAQL
- **Google Apps Script** — backend da Web App + agendamentos
- **Make.com** — automação de postbacks
- **Chart.js** — gráficos no frontend
- **GOOGLEFINANCE** — cotação USD/BRL em tempo real

---

## 📅 Roadmap / próximos passos

- [ ] Enhanced Conversions (recuperar vendas perdidas por iOS/Safari)
- [ ] Rastreamento server-side para reduzir dependência do gclid
- [ ] Alertas via Telegram quando ROAS cair abaixo de threshold
- [ ] Comparativo mês a mês no dashboard principal
