#!/usr/bin/env node
import { Command } from 'commander';
import { runReport } from './commands/report.js';
import { runCheck } from './commands/check.js';
import { runFix } from './commands/fix.js';

const program = new Command();

program
	.name('react-i18n-audit')
	.description('Audit i18n keys in React/Next projects')
	.version('0.0.1');

program
	.command('report')
	.description('Generate HTML report for missing/extra/unused keys')
	.option('-c, --config <path>', 'Path to config file')
	.option('--out <path>', 'Output HTML file (default: i18n-audit-report.html)')
	.action(async (opts) => {
		await runReport(opts);
	});

program
	.command('check')
	.description('Scan and return non-zero exit code if issues found')
	.option('-c, --config <path>', 'Path to config file')
	.option('--silent', 'No console output, exit code only', false)
	.action(async (opts) => {
		await runCheck(opts);
	});

program
	.command('fix')
	.description('Remove unused keys and insert placeholders for missing')
	.option('-c, --config <path>', 'Path to config file')
	.option('--remove-only', 'Only remove unused keys, do not add placeholders', false)
	.action(async (opts) => {
		await runFix(opts);
	});

program.parseAsync(process.argv).catch((err) => {
	console.error(err);
	process.exit(1);
});


