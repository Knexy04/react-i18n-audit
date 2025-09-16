export const DEFAULT_SOURCE_GLOBS = ['src/**/*.{ts,tsx,js,jsx}'];
export const DEFAULT_LOCALE_EXTENSIONS = ['json'];
export const DEFAULT_PLACEHOLDER = '[MISSING]';
export const DEFAULT_REPORT_HTML = 'i18n-audit-report.html';

export const REPORT_TYPES = {
	Missing: 'missing',
	Unused: 'unused',
	Extra: 'extra',
} as const;


