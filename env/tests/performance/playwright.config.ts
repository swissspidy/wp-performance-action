/**
 * External dependencies
 */
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

/**
 * WordPress dependencies
 */
// @ts-ignore
import baseConfig from '@wordpress/scripts/config/playwright.config.js';

process.env.WP_ARTIFACTS_PATH ??= join( process.cwd(), 'artifacts' );
process.env.STORAGE_STATE_PATH ??= join(
	process.env.WP_ARTIFACTS_PATH,
	'storage-states/admin.json'
);
process.env.TEST_ITERATIONS ??= '20';
process.env.TEST_REPETITIONS ??= '2';

const config = defineConfig( {
	...baseConfig,
	globalSetup: require.resolve( './config/global-setup.ts' ),
	reporter: process.env.SHARD
		? [ [ 'blob' ], [ './config/performance-reporter.ts' ] ]
		: [ [ 'list' ], [ './config/performance-reporter.ts' ] ],
	forbidOnly: !! process.env.CI,
	workers: 1,
	retries: 0,
	repeatEach: Number( process.env.TEST_REPETITIONS ),
	timeout: parseInt( process.env.TIMEOUT || '', 10 ) || 600_000, // Defaults to 10 minutes.
	// Don't report slow test "files", as we will be running our tests in serial.
	reportSlowTests: null,
	webServer: {
		...baseConfig.webServer,
		command: 'npm run env:start',
	},
	use: {
		...baseConfig.use,
		video: 'off',
		trace: 'off',
	},
} );

export default config;
