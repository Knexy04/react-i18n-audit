import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { parse } from '@babel/parser';
import * as babelTraverse from '@babel/traverse';
import type { AuditConfig, ScanResult } from './types.js';

// Very basic regex patterns for popular APIs
const patterns = [
	// i18next: t('key') / i18n.t('key')
	/(?<![\w$])(i18n\.)?t\(\s*['"]([^'"\)]+)['"]/g,
	// next-intl: useTranslations('ns')('key') - we'll at least capture ('key')
	/\(\s*['"]([^'"\)]+)['"]\s*\)\s*\(/g,
	// formatjs: defineMessages({ key: { id: 'key' }}) / intl.formatMessage({ id: 'key' })
	/\bid\s*:\s*['"]([^'"\}]+)['"]/g,
];

export async function scanUsedKeys(config: AuditConfig): Promise<ScanResult> {
	const files = await fg(config.sourceGlobs, { dot: false });
	const used = new Set<string>();
	const hits: Record<string, number> = {};
	const keyRefs: Record<string, Array<{ file: string; line: number }>> = {};
	// Compatibility: @babel/traverse default export vs namespace across CJS/ESM
	const traverse = (babelTraverse as unknown as { default?: (n: any, o: any) => void }).default ?? (babelTraverse as unknown as (n: any, o: any) => void);
	for (const file of files) {
		try {
			const src = await readFile(file, 'utf8');
			// Try AST-based extraction first
			try {
				const ast = parse(src, {
					sourceType: 'unambiguous',
					plugins: ['typescript', 'jsx'],
				});
				traverse(ast, {
					CallExpression(path: any) {
						// t('key') or i18n.t('key')
						const callee: any = path.node.callee as any;
						const args = path.node.arguments as any[];
						const firstArg = args[0];
						const isT = (callee.type === 'Identifier' && callee.name === 't') ||
							(callee.type === 'MemberExpression' && (callee.property as any).name === 't');
						if (isT && firstArg && firstArg.type === 'StringLiteral') {
							const key = firstArg.value;
							used.add(key);
							hits[file] = (hits[file] ?? 0) + 1;
							const loc = (firstArg.loc?.start?.line ?? path.node.loc?.start?.line ?? 1) as number;
							(keyRefs[key] ??= []).push({ file, line: loc });
						}

						// intl.formatMessage({ id: 'key' })
						const isFormatMessage =
							callee.type === 'MemberExpression' && (callee.property as any).name === 'formatMessage';
						if (isFormatMessage && firstArg && firstArg.type === 'ObjectExpression') {
							const idProp = firstArg.properties.find((p: any) => p.key?.name === 'id');
							if (idProp && idProp.value?.type === 'StringLiteral') {
								const key = idProp.value.value;
								used.add(key);
								hits[file] = (hits[file] ?? 0) + 1;
								const loc = (idProp.value.loc?.start?.line ?? path.node.loc?.start?.line ?? 1) as number;
								(keyRefs[key] ??= []).push({ file, line: loc });
							}
						}
					},
					ObjectExpression(path: any) {
						// defineMessages({ key: { id: 'key' }}) pattern fallback not implemented fully
					},
				});
			} catch {
				// Fallback to regex patterns if AST parse fails
				for (const re of patterns) {
					re.lastIndex = 0;
					let m: RegExpExecArray | null;
					while ((m = re.exec(src))) {
						const key = (m[2] ?? m[1]) as string | undefined;
						if (key) {
							used.add(key);
							hits[file] = (hits[file] ?? 0) + 1;
							const line = src.slice(0, m.index).split(/\r?\n/).length;
							(keyRefs[key] ??= []).push({ file, line });
						}
					}
				}
			}
		} catch {
			// ignore
		}
	}
	return { usedKeys: used, frameworkHits: hits, keyRefs };
}


