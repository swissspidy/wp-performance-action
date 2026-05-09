import type { Page } from '@playwright/test';
import { test } from '@wordpress/e2e-test-utils-playwright';
import { camelCaseDashes } from '../utils';

const results: Record< string, Record< string, number[] > > = {};

test.describe( 'Tests', () => {
	test.use( {
		// @ts-ignore
		storageState: {}, // User will be logged out.
	} );

	// Run *once* before *all* iterations.
	// Ideal for setting up the site for this particular test.
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.request.get(
			`${ requestUtils.baseURL }/?reset_helper`
		);
	} );

	// After all results are processed, attach results for further processing.
	// For easier handling, only one attachment per file.
	test.afterAll( async ( {}, testInfo ) => {
		await testInfo.attach( 'results', {
			body: JSON.stringify( results, null, 2 ),
			contentType: 'application/json',
		} );
	} );

	const urlsToTest = ( process.env.URLS_TO_TEST || '' )
		.split( '\n' )
		.map( ( url ) => url.trim() )
		.filter( Boolean );

	const iterations = Number( process.env.TEST_ITERATIONS );
	const cpuThrottlingRate = getCpuThrottlingRate();

	for ( const url of urlsToTest ) {
		for ( let i = 1; i <= iterations; i++ ) {
			test( `URL: "${ url }" (${ i } of ${ iterations })`, async ( {
				browserName,
				page,
				metrics,
			} ) => {
				await applyCpuThrottling(
					page,
					browserName,
					cpuThrottlingRate
				);
				await page.goto( `${ url.replace( /\/$/, '' ) }/?i=${ i }` );

				const serverTiming = await metrics.getServerTiming();

				results[ url ] ??= {};

				for ( const [ key, value ] of Object.entries( serverTiming ) ) {
					results[ url ][ camelCaseDashes( key ) ] ??= [];
					results[ url ][ camelCaseDashes( key ) ].push( value );
				}

				const ttfb = await metrics.getTimeToFirstByte();
				const lcp = await metrics.getLargestContentfulPaint();

				results[ url ].largestContentfulPaint ??= [];
				results[ url ].largestContentfulPaint.push( lcp );
				results[ url ].timeToFirstByte ??= [];
				results[ url ].timeToFirstByte.push( ttfb );
				results[ url ].lcpMinusTtfb ??= [];
				results[ url ].lcpMinusTtfb.push( lcp - ttfb );
			} );
		}
	}
} );

function getCpuThrottlingRate() {
	const rate = ( process.env.CPU_THROTTLING_RATE || '' ).trim();

	if ( rate === '' ) {
		return 0;
	}

	const parsedRate = Number( rate );

	if ( ! Number.isFinite( parsedRate ) || parsedRate <= 0 ) {
		throw new Error( 'CPU_THROTTLING_RATE must be a positive number.' );
	}

	return parsedRate;
}

async function applyCpuThrottling(
	page: Page,
	browserName: string,
	rate: number
) {
	if ( rate === 0 || browserName !== 'chromium' ) {
		return;
	}

	const session = await page.context().newCDPSession( page );
	await session.send( 'Emulation.setCPUThrottlingRate', { rate } );
}
