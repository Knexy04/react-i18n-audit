import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { flattenObject } from './utils/flatten.js';
import type { AuditConfig, LocaleMap } from './types.js';
import { DEFAULT_LOCALE_EXTENSIONS } from './constants.js';

export async function loadLocales(config: AuditConfig): Promise<LocaleMap> {
	if (!config.localeFileGlobs || config.localeFileGlobs.length === 0) {
		throw new Error('localeFileGlobs is required. Example: ["public/locales/{locale}.json", "public/locales/{locale}/**/*.json"]');
	}
	const patterns = config.localeFileGlobs.map((g) => g.replaceAll('\\', '/'));
	const files = await fg(patterns.map((p) => p.replace('{locale}', '*')), { dot: false });
	const map: LocaleMap = {};

	for (const file of files) {
		const fileNorm = file.replaceAll('\\', '/');
		let locale: string | undefined;
		for (const pat of patterns) {
			if (!pat.includes('{locale}')) continue;
			const [pre, post] = pat.split('{locale}');
			const preNorm = pre;
			const postNorm = post ?? '';
			if (!fileNorm.startsWith(preNorm)) continue;
			const rest = fileNorm.slice(preNorm.length);
			if (postNorm.startsWith('/')) {
				// Expect locale as next path segment
				const seg = rest.split('/')[0] ?? '';
				if (seg) {
					locale = seg;
					break;
				}
			} else if (postNorm.startsWith('.')) {
				// Expect file like <locale>.json
				const idx = rest.indexOf(postNorm);
				if (idx > 0) {
					locale = rest.slice(0, idx);
					break;
				}
			} else {
				// Fallback: take until next '/'
				const seg = rest.split('/')[0] ?? '';
				if (seg) {
					locale = seg;
					break;
				}
			}
		}
		if (!locale) continue;
		try {
			const raw = await readFile(fileNorm, 'utf8');
			const json = JSON.parse(raw) as Record<string, unknown>;
			const flat = flattenObject(json);
			map[locale] = { ...(map[locale] ?? {}), ...flat };
		} catch {
			// ignore parse errors for now
		}
	}
	return map;
}


