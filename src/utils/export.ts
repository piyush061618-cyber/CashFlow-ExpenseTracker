import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Transaction, FinancialSummary, CategoryBreakdownItem } from '../types';
import { formatINR } from './currency';
import { formatDate } from './date';

/**
 * Exports transactions as CSV and triggers native Android share dialog
 */
export async function exportTransactionsToCSV(transactions: Transaction[]): Promise<string> {
  const headers = [
    'Transaction ID',
    'Type',
    'Date',
    'Amount (INR)',
    'Amount (Paise)',
    'Category',
    'Wallet',
    'Payment Method',
    'Description',
  ];

  const rows = transactions.map((t) => [
    `"${t.id}"`,
    `"${t.type.toUpperCase()}"`,
    `"${t.date}"`,
    `"${(t.amount_paise / 100).toFixed(2)}"`,
    t.amount_paise,
    `"${(t.category_name || '').replace(/"/g, '""')}"`,
    `"${(t.wallet_name || '').replace(/"/g, '""')}"`,
    `"${(t.payment_method || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const fileName = `CashFlow_Export_${Date.now()}.csv`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export CashFlow Transactions',
      UTI: 'public.comma-separated-values-text',
    });
  }

  return filePath;
}

/**
 * Generates an executive financial PDF report and triggers Android share
 */
export async function exportFinancialReportToPDF(options: {
  reportTitle: string;
  periodLabel: string;
  summary: FinancialSummary;
  categories: CategoryBreakdownItem[];
  transactions: Transaction[];
}): Promise<string> {
  const { reportTitle, periodLabel, summary, categories, transactions } = options;

  const categoryRowsHtml = categories
    .map(
      (c) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">
        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${c.category_color}; margin-right:8px;"></span>
        <strong>${c.category_name}</strong>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align:right;">${formatINR(c.total_paise)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align:right;">${c.percentage.toFixed(1)}%</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align:right;">${c.count} txns</td>
    </tr>
  `
    )
    .join('');

  const transactionRowsHtml = transactions
    .slice(0, 50)
    .map(
      (t) => `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #F1F5F9; font-size:12px;">${formatDate(t.date)}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #F1F5F9; font-size:12px;"><strong>${t.category_name || t.type}</strong><br><span style="color:#64748B;">${t.description || '-'}</span></td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #F1F5F9; font-size:12px;">${t.wallet_name || 'Wallet'}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #F1F5F9; font-size:12px; text-align:right; font-weight:bold; color: ${t.type === 'income' ? '#10B981' : '#EF4444'};">
        ${t.type === 'income' ? '+' : '-'}${formatINR(t.amount_paise)}
      </td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${reportTitle}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 24px;
            background: #FFFFFF;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #1E1B4B;
            margin: 0;
          }
          .subtitle {
            font-size: 13px;
            color: #64748B;
            margin-top: 4px;
          }
          .kpi-container {
            display: flex;
            gap: 12px;
            margin-bottom: 28px;
          }
          .kpi-card {
            flex: 1;
            padding: 16px;
            border-radius: 8px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
          }
          .kpi-label {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
            color: #64748B;
            margin-bottom: 6px;
          }
          .kpi-value {
            font-size: 18px;
            font-weight: bold;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-top: 24px;
            margin-bottom: 12px;
            color: #1E293B;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background-color: #F1F5F9;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #CBD5E1;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #94A3B8;
            border-top: 1px solid #E2E8F0;
            padding-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">CashFlow Financial Statement</h1>
            <div class="subtitle">${reportTitle} | Period: ${periodLabel}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; color:#64748B;">Generated On</div>
            <div style="font-weight:bold; font-size:13px;">${formatDate(new Date().toISOString())}</div>
          </div>
        </div>

        <div class="kpi-container">
          <div class="kpi-card">
            <div class="kpi-label">Total Income</div>
            <div class="kpi-value" style="color:#10B981;">${formatINR(summary.monthly_income_paise)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Expenses</div>
            <div class="kpi-value" style="color:#EF4444;">${formatINR(summary.monthly_expense_paise)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Net Savings</div>
            <div class="kpi-value" style="color:${summary.monthly_savings_paise >= 0 ? '#10B981' : '#EF4444'};">
              ${formatINR(summary.monthly_savings_paise)}
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Net Worth</div>
            <div class="kpi-value" style="color:#4F46E5;">${formatINR(summary.total_balance_paise)}</div>
          </div>
        </div>

        <div class="section-title">Expense Category Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align:right;">Amount (INR)</th>
              <th style="text-align:right;">Share (%)</th>
              <th style="text-align:right;">Count</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRowsHtml || '<tr><td colspan="4" style="text-align:center; padding:16px;">No expenses in this period</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Transactions Log</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description / Category</th>
              <th>Wallet</th>
              <th style="text-align:right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRowsHtml || '<tr><td colspan="4" style="text-align:center; padding:16px;">No transactions recorded</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by CashFlow Android Application. Offline-verified financial records.
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'CashFlow Financial Report',
      UTI: 'com.adobe.pdf',
    });
  }

  return uri;
}
