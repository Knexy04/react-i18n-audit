export type Locale = string;

export interface AuditConfig {
	// Glob patterns to include source files
	sourceGlobs: string[];
	// Optional file globs for locales; supports placeholder {locale}
	localeFileGlobs?: string[];
	// Optional audit behavior controls
	// (kept minimal per CLI)
	placeholderText?: string; // text inserted for missing keys when fixing
	// Names of translation hooks providing a namespace, e.g. useTranslations, useFmtTranslations
	translationHookNames?: string[];
	// Names of translation functions to call, e.g. t, tMeta, tFooter
	translationFunctionNames?: string[];
	// Names of factory functions returning a translator via object arg with { namespace }
	// e.g. createTranslator, getStaticTranslator
	translationFactoryNames?: string[];
	// Regex patterns (as strings) to exclude flattened locale keys from analysis
	excludeKeyPatterns?: string[];
}

export interface ScanResult {
	usedKeys: Set<string>;
	frameworkHits: Record<string, number>;
	keyRefs?: Record<string, Array<{ file: string; line: number }>>;
}

export interface LocaleMap {
	[locale: Locale]: Record<string, unknown>;
}

export interface ReportItem {
	type: 'missing' | 'extra' | 'unused' | 'mismatch';
	key: string;
	locale?: Locale;
	details?: string;
	refs?: Array<{ file: string; line: number }>;
}

export interface ReportResult {
	items: ReportItem[];
}


