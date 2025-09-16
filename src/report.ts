import type { LocaleMap, ReportResult, ScanResult } from './types.js';
import type { NormalizedConfig } from './config.js';

export function generateReport(locales: LocaleMap, scan: ScanResult, _config?: NormalizedConfig): ReportResult {
	const items: ReportResult['items'] = [];
	const allLocales = Object.keys(locales);
	const usedKeys = scan.usedKeys;
	const unionLocaleKeys = new Set<string>();

	for (const locale of allLocales) {
		for (const key of Object.keys(locales[locale] ?? {})) unionLocaleKeys.add(key);
	}

	// Missing: keys used in code but absent in a specific locale
	for (const locale of allLocales) {
		const localeKeys = new Set(Object.keys(locales[locale] ?? {}));
		for (const key of usedKeys) {
			if (!localeKeys.has(key)) items.push({ type: 'missing', key, locale, refs: scan.keyRefs?.[key] });
		}
	}

	// Unused per locale: present in locale but never used in code
	for (const locale of allLocales) {
		const localeKeys = Object.keys(locales[locale] ?? {});
		for (const key of localeKeys) {
			if (!usedKeys.has(key)) items.push({ type: 'unused', key, locale });
		}
	}

	// Extra (global): keys present in at least one locale but not used anywhere
	for (const key of unionLocaleKeys) {
		if (!usedKeys.has(key)) items.push({ type: 'extra', key });
	}

	return { items };
}


