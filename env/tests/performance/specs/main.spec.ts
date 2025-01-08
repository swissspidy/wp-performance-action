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

	for ( const url of urlsToTest ) {
		for ( let i = 1; i <= iterations; i++ ) {
			test( `URL: "${ url }" (${ i } of ${ iterations })`, async ( {
				page,
				metrics,
			} ) => {
				await page.goto( `${ url.replace( /\/$/, '' ) }/?i=${ i }` );

				const serverTiming = await metrics.getServerTiming();

				for ( const [ key, value ] of Object.entries( serverTiming ) ) {
					results[url][ camelCaseDashes( key ) ] ??= [];
					results[url][ camelCaseDashes( key ) ].push( value );
				}

				const ttfb = await metrics.getTimeToFirstByte();
				const lcp = await metrics.getLargestContentfulPaint();

				results[url].largestContentfulPaint ??= [];
				results[url].largestContentfulPaint.push( lcp );
				results[url].timeToFirstByte ??= [];
				results[url].timeToFirstByte.push( ttfb );
				results[url].lcpMinusTtfb ??= [];
				results[url].lcpMinusTtfb.push( lcp - ttfb );
			} );
		}
	}
} );
