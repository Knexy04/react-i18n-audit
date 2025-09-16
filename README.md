# react-i18n-audit

CLI для аудита переводов в React/Next:
- Генерирует HTML-отчёт (missing/unused/extra) с ссылками на места использования
- Pre-commit проверка с корректным exit code
- Автопочинка: удаляет неиспользуемые и добавляет плейсхолдеры для отсутствующих ключей

## Установка

```bash
npm i -D react-i18n-audit
```

## Конфиг (i18n-audit.config.json)
Минимальный JSON-конфиг:
```json
{
  "sourceGlobs": ["src/**/*.{ts,tsx,js,jsx}"],
  "localeFileGlobs": [
    "public/locales/{locale}.json",
    "public/locales/{locale}/**/*.json"
  ],
  "placeholderText": "[MISSING]"
}
```
- `{locale}` — плейсхолдер для имен языков (en, ru и т.д.).

## Команды

- HTML-отчёт:
```bash
npx react-i18n-audit report -c i18n-audit.config.json --out i18n-audit-report.html
```

- Pre-commit проверка (exit 1 при любых проблемах):
```bash
npx react-i18n-audit check -c i18n-audit.config.json --silent
```

- Исправление переводов на месте:
```bash
# удалить лишние и добавить плейсхолдеры для отсутствующих
npx react-i18n-audit fix -c i18n-audit.config.json

# только удалить лишние ключи
npx react-i18n-audit fix -c i18n-audit.config.json --remove-only
```