import type { AuditConfig } from '../types.js';
import { loadConfig } from '../config.js';
import { scanUsedKeys } from '../scanner.js';
import { loadLocales } from '../locales.js';
import { generateReport } from '../report.js';

export async function runCheck(_opts: Partial<AuditConfig> & { config?: string; silent?: boolean }): Promise<void> {
	const userConfig = await loadConfig(_opts.config);
	const config: AuditConfig = { ...userConfig, ..._opts };
	const [scan, locales] = await Promise.all([scanUsedKeys(config), loadLocales(config)]);
	const rep = generateReport(locales, scan, userConfig);

	const missing = rep.items.filter((i) => i.type === 'missing').length;
	const unused = rep.items.filter((i) => i.type === 'unused').length;
	const extra = rep.items.filter((i) => i.type === 'extra').length;

	const shouldFail = (missing + unused + extra) > 0;

	if (!_opts.silent) {
		if (shouldFail) {
			console.error(`[check] FAILED missing=${missing} unused=${unused} extra=${extra}`);
		} else {
			console.log('[check] OK');
		}
	}

	process.exitCode = shouldFail ? 1 : 0;
}


