// ============================================================
//  ADS SCRIPT — Preenche aba AdSpend no Google Sheets
//  Cole este código em: Google Ads → Ferramentas → Scripts
//
//  ⚠️  Substitua COLE_SEU_SPREADSHEET_ID_AQUI pelo ID real
//  da sua planilha antes de usar.
//  ID está na URL: /spreadsheets/d/SEU_ID/edit
// ============================================================

var SPREADSHEET_ID = 'COLE_SEU_SPREADSHEET_ID_AQUI';
var SHEET_NAME     = 'AdSpend';
var DAYS_BACK      = 35; // 35 dias garante cobertura total para o snapshot mensal
var TIMEZONE       = 'America/Sao_Paulo'; // Ajuste para o fuso da sua conta Google Ads

function main() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    Logger.log('Aba AdSpend não encontrada. Crie a aba primeiro.');
    return;
  }

  // Limpa dados antigos (mantém cabeçalho na linha 1)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }

  // Calcula período
  var today     = new Date();
  var startDate = new Date(today);
  startDate.setDate(today.getDate() - DAYS_BACK);

  var dateFrom = Utilities.formatDate(startDate, TIMEZONE, 'yyyyMMdd');
  var dateTo   = Utilities.formatDate(today,     TIMEZONE, 'yyyyMMdd');

  Logger.log('Período: ' + dateFrom + ' até ' + dateTo);

  // Query GAQL
  var query = [
    'SELECT',
    '  segments.date,',
    '  campaign.id,',
    '  campaign.name,',
    '  ad_group.id,',
    '  ad_group.name,',
    '  metrics.clicks,',
    '  metrics.impressions,',
    '  metrics.cost_micros',
    'FROM ad_group',
    'WHERE segments.date BETWEEN \'' + dateFrom + '\' AND \'' + dateTo + '\'',
    'AND metrics.cost_micros > 0',
    'ORDER BY segments.date DESC, metrics.cost_micros DESC'
  ].join(' ');

  var report = AdsApp.report(query);
  var rows   = report.rows();
  var data   = [];

  while (rows.hasNext()) {
    var row = rows.next();

    // cost_micros → USD (÷ 1.000.000)
    var costUSD = parseFloat(row['metrics.cost_micros']) / 1000000;

    // Data: YYYYMMDD → YYYY-MM-DD (texto)
    var rawDate       = String(row['segments.date']).trim();
    var formattedDate = rawDate.length === 8 && rawDate.indexOf('-') === -1
      ? rawDate.substring(0,4) + '-' + rawDate.substring(4,6) + '-' + rawDate.substring(6,8)
      : rawDate;

    data.push([
      formattedDate,
      row['campaign.id'],
      row['campaign.name'],
      row['ad_group.id'],
      row['ad_group.name'],
      parseInt(row['metrics.clicks']),
      parseInt(row['metrics.impressions']),
      costUSD
    ]);
  }

  Logger.log('Linhas encontradas: ' + data.length);

  if (data.length > 0) {
    var range = sheet.getRange(2, 1, data.length, 8);
    range.setValues(data);
    // Força coluna A como texto para evitar conversão para número serial
    sheet.getRange(2, 1, data.length, 1).setNumberFormat('@');
    Logger.log('AdSpend atualizado: ' + data.length + ' linhas gravadas.');
  } else {
    Logger.log('Nenhum dado encontrado para o período.');
  }
}
