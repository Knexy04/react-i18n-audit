import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { DEFAULT_SOURCE_GLOBS, DEFAULT_PLACEHOLDER, DEFAULT_TRANSLATION_HOOKS, DEFAULT_TRANSLATION_FUNCTIONS, DEFAULT_TRANSLATION_FACTORIES } from './constants.js';
import type { AuditConfig } from './types.js';

const ConfigSchema = z.object({
	sourceGlobs: z.array(z.string()).default(DEFAULT_SOURCE_GLOBS),
	localeFileGlobs: z.array(z.string()).optional(),
	placeholderText: z.string().default(DEFAULT_PLACEHOLDER),
	translationHookNames: z.array(z.string()).default(DEFAULT_TRANSLATION_HOOKS),
	translationFunctionNames: z.array(z.string()).default(DEFAULT_TRANSLATION_FUNCTIONS),
	translationFactoryNames: z.array(z.string()).default(DEFAULT_TRANSLATION_FACTORIES),
	excludeKeyPatterns: z.array(z.string()).default(['\\.polyglot-description$']),
});

export type NormalizedConfig = z.infer<typeof ConfigSchema> & AuditConfig;

export async function loadConfig(path?: string): Promise<NormalizedConfig> {
	let resolved = path;
	if (!resolved) {
		const candidate = 'i18n-audit.config.json';
		if (existsSync(candidate)) resolved = candidate;
	}
	if (resolved && !resolved.endsWith('.json')) {
		throw new Error(`Config must be a JSON file (.json). Received: ${resolved}`);
	}
	let raw: unknown = {};
	if (resolved && existsSync(resolved)) {
		const text = await readFile(resolved, 'utf8');
		raw = JSON.parse(text);
	}
	const parsed = ConfigSchema.parse(raw);
	return parsed as NormalizedConfig;
}


