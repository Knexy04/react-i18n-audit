import type { AuditConfig } from '../types.js';
import { loadConfig } from '../config.js';
import { scanUsedKeys } from '../scanner.js';
import { loadLocales } from '../locales.js';
import { generateReport } from '../report.js';
import fs from 'fs-extra';
import { unflattenObject } from '../utils/unflatten.js';
import { flattenObject } from '../utils/flatten.js';
import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { DEFAULT_PLACEHOLDER } from '../constants.js';

export async function runFix(_opts: Partial<AuditConfig> & { config?: string; removeOnly?: boolean }): Promise<void> {
	const userConfig = await loadConfig(_opts.config);
	const config: AuditConfig = { ...userConfig, ..._opts };
	const [scan, locales] = await Promise.all([scanUsedKeys(config), loadLocales(config)]);
    // Base report respects excludeKeyPatterns (for adding placeholders only)
    const rep = generateReport(locales, scan, userConfig);

    // For deletions (unused/extra), ignore excludeKeyPatterns entirely
    const localesNoExclude = await loadLocales({ ...userConfig, excludeKeyPatterns: [] });
    const repNoExclude = generateReport(localesNoExclude, scan, userConfig);

	const placeholder = userConfig.placeholderText ?? DEFAULT_PLACEHOLDER;

    const missing = _opts.removeOnly ? [] : rep.items.filter((i) => i.type === 'missing');
    const unused = repNoExclude.items.filter((i) => i.type === 'unused');
    const extra = repNoExclude.items.filter((i) => i.type === 'extra');

	// Group unused keys by locale for targeted removal
	const unusedByLocale = new Map<string, Set<string>>();
	for (const u of unused) {
		if (!u.locale) continue;
		const set = unusedByLocale.get(u.locale) ?? new Set<string>();
		set.add(u.key);
		unusedByLocale.set(u.locale, set);
	}
	const extraKeys = new Set<string>(extra.map((e) => e.key));

	const baseGlobs = config.localeFileGlobs && config.localeFileGlobs.length > 0 ? config.localeFileGlobs : undefined;

	// Modify files in place per locale
	for (const locale of Object.keys(locales)) {
		const addList = missing.filter((m) => m.locale === locale).map((m) => m.key);

		// Find all JSON files for the locale, including flat layout localesDir/<locale>.json
		const files = await fg((baseGlobs ?? []).map((g) => g.replace('{locale}', locale)), { dot: false });
		const fileToFlat: Record<string, Record<string, unknown>> = {};
		for (const file of files) {
			try {
				const raw = await readFile(file, 'utf8');
				const json = JSON.parse(raw) as Record<string, unknown>;
				const flat = flattenObject(json);
				// remove unused and extra keys present in this file
				const flatOut: Record<string, unknown> = {};
				const localeUnused = unusedByLocale.get(locale) ?? new Set<string>();
				for (const [k, v] of Object.entries(flat)) {
					if (localeUnused.has(k)) continue;
					if (extraKeys.has(k)) continue;
					flatOut[k] = v;
				}
				fileToFlat[file] = flatOut;
			} catch {
				// ignore parse errors
			}
		}

		// pick target file for missing insertions
		let targetFile = files.find((f) => /\/common\.json$/i.test(f)) || files[0];
		if (!targetFile) {
			// If no existing files by globs, fallback to a sensible default in first glob's dir
			const first = baseGlobs?.[0]?.replace('{locale}', locale) ?? `${locale}/common.json`;
			targetFile = first;
			fileToFlat[targetFile] = {};
		}
		const targetFlat = fileToFlat[targetFile] ?? (fileToFlat[targetFile] = {});
		for (const key of addList) if (!(key in targetFlat)) targetFlat[key] = placeholder;

		// Write all files back
		for (const [file, flat] of Object.entries(fileToFlat)) {
			const obj = unflattenObject(flat);
			await fs.ensureDir(file.substring(0, file.lastIndexOf('/')));
			await fs.writeJson(file, obj, { spaces: 2 });
		}
	}

	console.log('[fix] updated locale files in place');
}


