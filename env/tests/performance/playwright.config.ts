/**
 * External dependencies
 */
import { join } from 'node:path';
import { defineConfig, type ReporterDescription } from '@playwright/test';

/**
 * WordPress dependencies
 */
// @ts-ignore
import baseConfig from '@wordpress/scripts/config/playwright.config.js';

process.env.BLOB_REPORT_PATH ??= join( process.cwd(), 'blob-report' );
process.env.WP_ARTIFACTS_PATH ??= join( process.cwd(), 'artifacts' );
process.env.STORAGE_STATE_PATH ??= join(
	process.env.WP_ARTIFACTS_PATH,
	'storage-states/admin.json'
);
process.env.TEST_ITERATIONS ??= '20';
process.env.TEST_REPETITIONS ??= '2';

const reporter: ReporterDescription[] = [
	[ './config/performance-reporter.ts' ],
];

if ( process.env.SHARD ) {
	reporter.unshift( [ 'blob', { outputDir: process.env.BLOB_REPORT_PATH } ] );
}

if ( process.env.DEBUG ) {
	reporter.unshift( [ 'list' ] );
}

const config = defineConfig( {
	...baseConfig,
	globalSetup: require.resolve( './config/global-setup.ts' ),
	reporter,
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
