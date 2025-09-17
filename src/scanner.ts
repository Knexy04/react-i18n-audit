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
	// Track identifiers bound to next-intl (or wrappers) namespaces: const t = useTranslations('NS')
	// identifierNamespace['t'] = 'NS'
	const identifierNamespace: Record<string, string> = {};
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
					VariableDeclarator(path: any) {
						// const t = useTranslations('Namespace') | useFmtTranslations('Namespace')
						const id = path.node.id;
						const init = path.node.init;
						if (!id || !init) return;
						if (id.type !== 'Identifier') return;
						if (init.type !== 'CallExpression') return;
						const callee = init.callee as any;
						const calleeName = callee?.type === 'Identifier' ? callee.name : (callee?.type === 'MemberExpression' ? callee.property?.name : undefined);
						const hookNames = new Set(config.translationHookNames ?? []);
						if (hookNames.has(calleeName)) {
							const firstArg = (init.arguments as any[])[0];
							if (firstArg && firstArg.type === 'StringLiteral' && firstArg.value) {
								identifierNamespace[id.name] = firstArg.value as string;
							}
						}
					},
					CallExpression(path: any) {
						// t('key') or i18n.t('key') or any identifier bound via configured hooks (e.g. tMeta('key'))
						const callee: any = path.node.callee as any;
						const args = path.node.arguments as any[];
						const firstArg = args[0];
						const allowedFns = new Set(config.translationFunctionNames ?? ['t']);
						const isIdentifierCall = (callee.type === 'Identifier' && (allowedFns.has(callee.name) || identifierNamespace[callee.name]));
						const isMemberCall = (callee.type === 'MemberExpression' && allowedFns.has((callee.property as any).name));
						if ((isIdentifierCall || isMemberCall) && firstArg && firstArg.type === 'StringLiteral') {
							const rawKey = firstArg.value as string;
							// If identifier is namespaced, prefix with namespace
							let fullKey = rawKey;
							if (callee.type === 'Identifier' && identifierNamespace[callee.name]) {
								fullKey = `${identifierNamespace[callee.name]}.${rawKey}`;
							} else if (callee.type === 'MemberExpression' && callee.object?.type === 'Identifier' && identifierNamespace[callee.object.name]) {
								fullKey = `${identifierNamespace[callee.object.name]}.${rawKey}`;
							}
							used.add(fullKey);
							hits[file] = (hits[file] ?? 0) + 1;
							const loc = (firstArg.loc?.start?.line ?? path.node.loc?.start?.line ?? 1) as number;
							(keyRefs[fullKey] ??= []).push({ file, line: loc });
						}

						// Inline pattern: useTranslations('NS')('key') or useFmtTranslations('NS')('key')
						if (callee.type === 'CallExpression' && firstArg && firstArg.type === 'StringLiteral') {
							const inner = callee as any;
							const innerCallee = inner.callee as any;
							const innerName = innerCallee?.type === 'Identifier' ? innerCallee.name : (innerCallee?.type === 'MemberExpression' ? innerCallee.property?.name : undefined);
							const hookNames = new Set(config.translationHookNames ?? []);
							if (hookNames.has(innerName)) {
								const nsArg = (inner.arguments as any[])[0];
								if (nsArg && nsArg.type === 'StringLiteral') {
									const rawKey = firstArg.value as string;
									const fullKey = `${nsArg.value}.${rawKey}`;
									used.add(fullKey);
									hits[file] = (hits[file] ?? 0) + 1;
									const loc = (firstArg.loc?.start?.line ?? path.node.loc?.start?.line ?? 1) as number;
									(keyRefs[fullKey] ??= []).push({ file, line: loc });
								}
							}
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


