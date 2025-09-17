# react-i18n-audit

A CLI to audit i18n keys in React/Next.js projects. It finds missing keys, unused keys, and extra keys across your locales, can generate an HTML report, and can automatically fix issues.

- **report**: generate an HTML report
- **check**: run a check that fails (non‑zero exit code) if there are issues — perfect for CI
- **fix**: remove unused/extra keys and add placeholders for missing ones

Supported patterns out of the box: `t('key')`, `i18n.t('key')`, `useTranslations('NS')('key')`, `intl.formatMessage({ id: 'key' })`, and factories like `createTranslator({ namespace: 'NS', ... })` / `getStaticTranslator({ namespace: 'NS', ... })`. You can customize hook, function, and factory names.

## Installation

```bash
npm i -D react-i18n-audit
# or
yarn add -D react-i18n-audit
# or
pnpm add -D react-i18n-audit
```

Run via `npx`:
```bash
npx react-i18n-audit --help
```

Node 18+ is required.

## Quick start

Create `i18n-audit.config.json` in the project root:

```json
{
  "sourceGlobs": ["src/**/*.{ts,tsx,js,jsx}"],
  "localeFileGlobs": [
    "public/locales/{locale}.json",
    "public/locales/{locale}/**/*.json"
  ],
  "placeholderText": "[MISSING]",
  "translationHookNames": ["useTranslations", "useFmtTranslations"],
  "translationFunctionNames": ["t"],
  "translationFactoryNames": ["createTranslator", "getStaticTranslator"],
  "excludeKeyPatterns": ["\\.polyglot-description$"]
}
```

- **sourceGlobs**: where to scan code for used translation keys
- **localeFileGlobs**: where to load locale JSON files; use `{locale}` as a placeholder for the language
- **placeholderText**: text to insert for missing keys when running `fix`
- **translationHookNames**: hook names that return a namespaced translator (e.g. `useTranslations('NS')`)
- **translationFunctionNames**: translation function names (e.g. `t`, `tMeta`)
- **excludeKeyPatterns**: array of RegExp strings; matching keys are excluded from analysis

## Commands

### report
Generate an HTML report of i18n issues.

```bash
react-i18n-audit report [options]
```

Options:
- `-c, --config <path>`: path to JSON config (by default the tool looks for `i18n-audit.config.json`)
- `--out <path>`: path to output HTML file (default: `i18n-audit-report.html`)

Example:
```bash
react-i18n-audit report --config i18n-audit.config.json --out artifacts/i18n-report.html
```
Prints the path to the HTML and a summary (`missing`, `unused`, `extra`). If issues are found, sets `process.exitCode = 1` (handy for CI while still producing artifacts).

### check
Scan the project and fail when issues are found.

```bash
react-i18n-audit check [options]
```

Options:
- `-c, --config <path>`: path to JSON config
- `--silent`: suppress console output; exit code behavior is unchanged

Examples:
```bash
react-i18n-audit check --config i18n-audit.config.json
react-i18n-audit check --silent
```
Exit codes: `0` — ok, `1` — problems found (missing, unused, or extra keys).

### fix
Automatically modify locale files in place: remove unused/extra keys and add placeholders for missing ones.

```bash
react-i18n-audit fix [options]
```

Options:
- `-c, --config <path>`: path to JSON config
- `--remove-only`: only remove unused/extra keys, do not add missing ones

Behavior:
- For adding missing keys, `excludeKeyPatterns` are respected (matching keys are not created)
- For deletions (unused/extra), `excludeKeyPatterns` are ignored — cleanup happens regardless
- For each locale, all JSON files matching `localeFileGlobs` are updated in place
- Missing keys are added to a "target" file for the locale — preferably a `.../common.json`, otherwise the first matched file; if none exist, a reasonable path is created based on the first glob

Examples:
```bash
react-i18n-audit fix
react-i18n-audit fix --remove-only
react-i18n-audit fix -c i18n-audit.config.json
```

## How it works

1. The scanner walks `sourceGlobs` and extracts used keys via AST (@babel/parser + traverse) with a regex fallback.
2. Locales are loaded from all files found by `localeFileGlobs`. Objects are flattened to dot-notation keys.
3. The report is built:
   - **missing**: key is used in code but absent in a specific locale
   - **unused**: key exists in a locale but is not used in code (locale-specific)
   - **extra**: key exists in at least one locale but is not used anywhere
4. `report` renders HTML (default `i18n-audit-report.html`).
5. `check` prints a summary and sets the exit code.
6. `fix` deletes unused/extra keys and adds placeholders for missing ones.

## Configuration

File: `i18n-audit.config.json` (JSON). You can pass a custom path via `--config`.

Defaults:

```json
{
  "sourceGlobs": ["src/**/*.{ts,tsx,js,jsx}"],
  "localeFileGlobs": [],
  "placeholderText": "[MISSING]",
  "translationHookNames": ["useTranslations", "useFmtTranslations"],
  "translationFunctionNames": ["t"],
  "translationFactoryNames": ["createTranslator", "getStaticTranslator"],
  "excludeKeyPatterns": ["\\.polyglot-description$"]
}
```

Notes:
- `localeFileGlobs` is required. If omitted, the tool throws with a helpful example.
- RegExp values must be strings in JSON (escape backslashes accordingly).

Example `localeFileGlobs`:
```json
[
  "public/locales/{locale}.json",
  "public/locales/{locale}/**/*.json",
  "apps/web/public/i18n/{locale}/**/*.json"
]
```

## CI integration

- `check` returns `1` if issues are found. Useful as a quality gate.
- `report` also sets exit code `1` when issues exist and produces an HTML artifact for easy inspection.

GitHub Actions example (snippet):
```yaml
- name: Audit i18n
  run: |
    npm ci
    npx react-i18n-audit report --out i18n-report.html || true
    npx react-i18n-audit check
  continue-on-error: false
```

## Supported code patterns

- **i18next**: `t('key')`, `i18n.t('key')`
- **next-intl**: `useTranslations('NS')('key')` and `const t = useTranslations('NS'); t('key')`
- **FormatJS**: `intl.formatMessage({ id: 'key' })`

You can extend/override these via `translationHookNames`, `translationFunctionNames`, and `translationFactoryNames` in the config.

## Limitations and notes

- The parser runs with `typescript` + `jsx`. If parsing fails for a file, a simplified regex fallback is used.
- `excludeKeyPatterns` are applied when loading locales (keys are filtered immediately). For deletions in `fix`, locales are reloaded without exclusions to ensure full cleanup.
- Keys are treated as flat (`a.b.c`). Nested JSON objects are automatically flattened/unflattened when reading/writing.

## License

MIT
