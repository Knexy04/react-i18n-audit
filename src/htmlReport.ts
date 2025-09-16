import type { ReportResult } from './types.js';

export function renderHtmlReport(report: ReportResult): string {
	const rows = report.items
		.map((i) => {
			const refs = i.refs?.map((r) => `${r.file}:${r.line}`).join('<br/>') ?? '';
			const locale = i.locale ?? '';
			return `<tr><td>${escapeHtml(i.type)}</td><td>${escapeHtml(i.key)}</td><td>${escapeHtml(locale)}</td><td>${refs}</td></tr>`;
		})
		.join('\n');
	return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>react-i18n-audit report</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, Arial, sans-serif; padding: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 14px; vertical-align: top; }
    th { background: #f9fafb; text-align: left; }
    tr:nth-child(even) { background: #fafafa; }
    .legend { margin-bottom: 12px; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <h1>react-i18n-audit</h1>
  <div class="legend">Total items: ${report.items.length}</div>
  <table>
    <thead>
      <tr><th>Type</th><th>Key</th><th>Locale</th><th>Refs</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
	return s
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}


