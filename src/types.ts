export type Locale = string;

export interface AuditConfig {
	// Glob patterns to include source files
	sourceGlobs: string[];
	// File extensions for locale files
	localeFileExtensions?: string[]; // default: ['json']
	// Optional file globs for locales; supports placeholder {locale}
	localeFileGlobs?: string[];
	// Optional audit behavior controls
	// (kept minimal per CLI)
	placeholderText?: string; // text inserted for missing keys when fixing
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


