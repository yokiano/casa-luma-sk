#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const ignoredPathFragments = ['/src/lib/notion-sdk/'];

function run(command, args) {
	return spawnSync(command, args, {
		encoding: 'utf8',
		maxBuffer: 1024 * 1024 * 50,
		shell: false
	});
}

const sync = run('pnpm', ['exec', 'svelte-kit', 'sync']);
if (sync.stdout) process.stdout.write(sync.stdout);
if (sync.stderr) process.stderr.write(sync.stderr);
if (sync.status !== 0) process.exit(sync.status ?? 1);

const check = run('pnpm', ['exec', 'svelte-check', '--tsconfig', './tsconfig.json']);
const output = `${check.stdout ?? ''}${check.stderr ?? ''}`;
const lines = output.split(/\r?\n/);
const kept = [];
let ignoredErrors = 0;
let ignoredWarnings = 0;
let keptErrors = 0;
let keptWarnings = 0;

for (let index = 0; index < lines.length; ) {
	const line = lines[index];
	const isDiagnosticPath = /^\//.test(line) && /:\d+:\d+$/.test(line);

	if (!isDiagnosticPath) {
		if (!/^={20,}$/.test(line) && !/^svelte-check found /.test(line) && !/^\s*ELIFECYCLE/.test(line)) {
			kept.push(line);
		}
		index += 1;
		continue;
	}

	const block = [line];
	index += 1;
	while (index < lines.length && !(/^\//.test(lines[index]) && /:\d+:\d+$/.test(lines[index])) && !/^={20,}$/.test(lines[index])) {
		block.push(lines[index]);
		index += 1;
	}

	const ignored = ignoredPathFragments.some((fragment) => line.includes(fragment));
	const isError = block.some((blockLine) => blockLine.startsWith('Error:'));
	const isWarning = block.some((blockLine) => blockLine.startsWith('Warn:'));

	if (ignored) {
		if (isError) ignoredErrors += 1;
		if (isWarning) ignoredWarnings += 1;
	} else {
		if (isError) keptErrors += 1;
		if (isWarning) keptWarnings += 1;
		kept.push(...block);
	}
}

while (kept.length && kept[kept.length - 1] === '') kept.pop();
if (kept.length) process.stdout.write(`${kept.join('\n')}\n\n`);

process.stdout.write('====================================\n');
process.stdout.write(
	`svelte-check found ${keptErrors} error${keptErrors === 1 ? '' : 's'} and ${keptWarnings} warning${keptWarnings === 1 ? '' : 's'} after ignoring ${ignoredErrors} generated Notion SDK error${ignoredErrors === 1 ? '' : 's'} and ${ignoredWarnings} generated Notion SDK warning${ignoredWarnings === 1 ? '' : 's'}\n`
);

process.exit(keptErrors > 0 ? 1 : 0);
