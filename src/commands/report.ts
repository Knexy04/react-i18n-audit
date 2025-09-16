import type { AuditConfig } from '../types.js';
import { scanUsedKeys } from '../scanner.js';
import { loadLocales } from '../locales.js';
import { generateReport } from '../report.js';
import { loadConfig } from '../config.js';
import { writeFile } from 'node:fs/promises';
import { renderHtmlReport } from '../htmlReport.js';
import { DEFAULT_REPORT_HTML } from '../constants.js';

export async function runReport(_opts: Partial<AuditConfig> & { config?: string; out?: string }): Promise<void> {
	const userConfig = await loadConfig(_opts.config);
	const config: AuditConfig = { ...userConfig, ..._opts };
	const [scan, locales] = await Promise.all([scanUsedKeys(config), loadLocales(config)]);
	const rep = generateReport(locales, scan, userConfig);
	const missing = rep.items.filter((i) => i.type === 'missing').length;
	const unused = rep.items.filter((i) => i.type === 'unused').length;
	const extra = rep.items.filter((i) => i.type === 'extra').length;
	const html = renderHtmlReport(rep);
	const outPath = _opts.out ?? DEFAULT_REPORT_HTML;
	await writeFile(outPath, html, 'utf8');
	console.log(`[report] HTML written to ${outPath} (missing=${missing} unused=${unused} extra=${extra})`);
	if ((missing + unused + extra) > 0) {
		process.exitCode = 1;
	}
}

		
