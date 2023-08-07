import { resolve } from 'node:path';
import { promises as fsPromises, constants as fsConstants } from 'node:fs';

import {
	getInput,
	setFailed,
	startGroup,
	endGroup,
	debug,
} from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { exec } from '@actions/exec';

import { wait } from './wait';

const { access: accessFile, writeFile, readFile } = fsPromises;
const { F_OK } = fsConstants;

/**
 * Check if a given file exists and can be accessed.
 * @param {string} filename
 */
export async function fileExists(filename: string) {
	try {
		await accessFile(filename, F_OK);
		return true;
	} catch (e) {}
	return false;
}

async function run(): Promise<void> {
	const token = getInput('repo-token');
	const octokit = getOctokit(token);
	const { owner, repo, number: prNumber } = context.issue;

	const ms: string = getInput('milliseconds');
	debug(`Waiting ${ms} milliseconds ...`); // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true

	debug(new Date().toTimeString());
	await wait(parseInt(ms, 10));
	debug(new Date().toTimeString());

	const baseSha = context.payload.before || context.payload.pull_request?.sha;
	const baseRef = context.payload.ref || context.payload.pull_request?.ref;

	if (!baseSha || !baseRef) {
		throw new Error(`Missing base SHA or ref for event ${context.eventName}`);
	}

	const cwd = process.cwd();

	if (!(await fileExists(resolve(cwd, '.wp-env.json')))) {
		throw new Error(`No .wp-env.json file found`);
	}

	// TODO: Force-install Performance Lab plugin through a custom .wp-env.override.json file.
	// Q: What if .wp-env.override.json already exists?
	// const overrideConfig = {
	// 	plugins: [
	// 		"https://downloads.wordpress.org/plugin/performance-lab.zip",
	// 	],
	// 	"config": {
	// 		"PERFLAB_DISABLE_OBJECT_CACHE_DROPIN": true
	// 	}
	// };
	//
	// const wpEnvConfig = JSON.parse(await readFile(resolve(cwd, '.wp-env.json'), { encoding: 'utf-8'}));
	// overrideConfig.plugins = [...new Set<string>(
	// 	...wpEnvConfig.plugins,
	// 	...overrideConfig.plugins
	// 	)
	// ]
	//
	// await writeFile(
	// 		resolve(cwd, '.wp-env.override.json'),
	// 		JSON.stringify(overrideConfig)
	// );

	// TODO: Manually start wp-env server.
	// await exec('npx wp-env');

	// TODO: Manually run Playwright.
	// Possibly blocked by https://github.com/microsoft/playwright/issues/7275

	// TODO: Compare results.

	// TODO: Write comment or set status check.
}

(async () => {
	try {
		await run();
	} catch (error) {
		if (error instanceof Error) {
			setFailed(error.message);
		}
	}
})();
