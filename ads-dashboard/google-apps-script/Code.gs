// ============================================================
//  ADS DASHBOARD — Google Apps Script Web App
//  Extensões → Apps Script → apague tudo → cole → salve
//
//  ⚠️  Substitua COLE_SEU_SPREADSHEET_ID_AQUI pelo ID real
//  da sua planilha antes de usar.
//  ID está na URL: /spreadsheets/d/SEU_ID/edit
// ============================================================

var SS_ID = 'COLE_SEU_SPREADSHEET_ID_AQUI';

function doGet() {
  var tmpl = HtmlService.createTemplateFromFile('index');
  return tmpl.evaluate()
    .setTitle('Ads Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Dados principais ──────────────────────────────────────
function getData() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var adSpend = [];
  var salesLog = [];

  try {
    var s1 = ss.getSheetByName('AdSpend');
    if (s1) {
      var d1 = s1.getDataRange().getValues();
      for (var i = 1; i < d1.length; i++) {
        var row = d1[i];
        if (!row[0] || row[0] === '') continue;
        adSpend.push({
          date:        String(row[0]).trim().substring(0, 10),
          campaign_id: String(row[1]).trim(),
          campaign:    String(row[2]).trim(),
          adgroup_id:  String(row[3]).trim(),
          adgroup:     String(row[4]).trim(),
          clicks:      parseFloat(row[5]) || 0,
          impressions: parseFloat(row[6]) || 0,
          cost:        parseFloat(row[7]) || 0
        });
      }
    }
  } catch(e) { Logger.log('Erro AdSpend: ' + e); }

  try {
    var s2 = ss.getSheetByName('SalesLog');
    if (s2) {
      var d2 = s2.getDataRange().getValues();
      for (var j = 1; j < d2.length; j++) {
        var r = d2[j];
        if (!r[0] || r[0] === '') continue;
        var rawDate = String(r[0]).trim();
        var dateOnly = rawDate.length >= 10 ? rawDate.substring(0, 10) : rawDate;
        salesLog.push({
          date:        dateOnly,
          network:     String(r[1]).trim(),
          order_id:    String(r[2]).trim(),
          product:     String(r[3]).trim(),
          amount:      parseFloat(r[4]) || 0,
          currency:    String(r[5]).trim(),
          status:      String(r[6]).trim(),
          click_id:    String(r[7]).trim(),
          gclid:       String(r[8]).trim(),
          campaign_id: String(r[9]).trim(),
          adgroup_id:  String(r[10]).trim(),
          keyword:     String(r[11]).trim()
        });
      }
    }
  } catch(e) { Logger.log('Erro SalesLog: ' + e); }

  return JSON.stringify({ adSpend: adSpend, salesLog: salesLog });
}

// ── Cotação USD/BRL ───────────────────────────────────────
function getCotacao() {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('Dashboard');
    var cotacao = sheet.getRange('N2').getValue();
    return parseFloat(cotacao) || 1;
  } catch(e) { return 1; }
}

// ── Lê snapshots mensais ──────────────────────────────────
function getSnapshots() {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('MonthlySnapshot');
    if (!sheet) return JSON.stringify([]);
    var data = sheet.getDataRange().getValues();
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      if (!r[0]) continue;
      rows.push({
        month:       String(r[0]).trim(),
        spend:       parseFloat(r[1]) || 0,
        revenue_usd: parseFloat(r[2]) || 0,
        revenue_brl: parseFloat(r[3]) || 0,
        sales:       parseInt(r[4])   || 0,
        clicks:      parseInt(r[5])   || 0,
        cotacao:     parseFloat(r[6]) || 1
      });
    }
    return JSON.stringify(rows);
  } catch(e) {
    Logger.log('Erro getSnapshots: ' + e);
    return JSON.stringify([]);
  }
}

// ── Grava snapshot do mês anterior (roda todo dia 1º) ─────
function saveMonthlySnapshot() {
  var ss = SpreadsheetApp.openById(SS_ID);

  var snapSheet = ss.getSheetByName('MonthlySnapshot');
  if (!snapSheet) {
    snapSheet = ss.insertSheet('MonthlySnapshot');
    snapSheet.appendRow(['month','spend_brl','revenue_usd','revenue_brl','sales','clicks','cotacao_on_save']);
  }

  var now = new Date();
  var firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var lastOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0);
  var monthKey = Utilities.formatDate(firstOfLastMonth, 'America/Sao_Paulo', 'yyyy-MM');
  var dateFrom = Utilities.formatDate(firstOfLastMonth, 'America/Sao_Paulo', 'yyyy-MM-dd');
  var dateTo   = Utilities.formatDate(lastOfLastMonth,  'America/Sao_Paulo', 'yyyy-MM-dd');

  var existing = snapSheet.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][0]).trim() === monthKey) {
      Logger.log('Snapshot ' + monthKey + ' já existe.');
      return;
    }
  }

  var spendTotal = 0, clicksTotal = 0;
  var adSpendSheet = ss.getSheetByName('AdSpend');
  if (adSpendSheet) {
    var adData = adSpendSheet.getDataRange().getValues();
    for (var a = 1; a < adData.length; a++) {
      var adDate = String(adData[a][0]).trim().substring(0, 10);
      if (adDate >= dateFrom && adDate <= dateTo) {
        spendTotal  += parseFloat(adData[a][7]) || 0;
        clicksTotal += parseInt(adData[a][5])   || 0;
      }
    }
  }

  var revenueUSD = 0, salesTotal = 0;
  var salesSheet = ss.getSheetByName('SalesLog');
  if (salesSheet) {
    var slData = salesSheet.getDataRange().getValues();
    for (var s = 1; s < slData.length; s++) {
      var slDate = String(slData[s][0]).trim();
      if (slDate.length >= 10) slDate = slDate.substring(0, 10);
      if (slDate >= dateFrom && slDate <= dateTo) {
        revenueUSD += parseFloat(slData[s][4]) || 0;
        salesTotal++;
      }
    }
  }

  var cotacao = 1;
  try {
    cotacao = parseFloat(ss.getSheetByName('Dashboard').getRange('N2').getValue()) || 1;
  } catch(e) {}

  snapSheet.appendRow([
    monthKey,
    spendTotal,
    revenueUSD,
    revenueUSD * cotacao,
    salesTotal,
    clicksTotal,
    cotacao
  ]);

  Logger.log('Snapshot salvo: ' + monthKey + ' | Gasto R$' + spendTotal.toFixed(2) + ' | Receita R$' + (revenueUSD * cotacao).toFixed(2));
}

// ── Crie o agendamento UMA única vez ──────────────────────
// Apps Script → selecione criarAgendamento → Executar ▶
// NÃO execute de novo depois (cria duplicata)
function criarAgendamento() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'saveMonthlySnapshot') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('saveMonthlySnapshot')
    .timeBased()
    .onMonthDay(1)
    .atHour(6)
    .create();
  Logger.log('Agendamento criado: todo dia 1 às 06:00');
}
