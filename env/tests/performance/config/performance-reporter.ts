import { join } from 'node:path';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import type {
	FullConfig,
	FullResult,
	Reporter,
	TestCase,
	TestResult,
} from '@playwright/test/reporter';
import { median } from '../utils';

process.env.WP_ARTIFACTS_PATH ??= join( process.cwd(), 'artifacts' );

class PerformanceReporter implements Reporter {
	private shard?: FullConfig[ 'shard' ];

	allResults: Record< string, Array< Record< string, number[] > > > = {};

	onBegin( config: FullConfig ) {
		if ( config.shard ) {
			this.shard = config.shard;
		}
	}

	/**
	 * Called after a test has been finished in the worker process.
	 *
	 * Used to add test results to the final summary of all tests.
	 *
	 * @param test
	 * @param result
	 */
	onTestEnd( test: TestCase, result: TestResult ) {
		const performanceResults = result.attachments.find(
			( attachment ) => attachment.name === 'results'
		);

		if ( performanceResults?.body ) {
			const resultsByUrl = JSON.parse(
				performanceResults.body.toString( 'utf-8' )
			) as Record< string, Record< string, number[] > >;

			for ( const [ url, results ] of Object.entries( resultsByUrl ) ) {
				this.allResults[ url ] ??= [];

				this.allResults[ url ].push( results );
			}
		}
	}

	/**
	 * Called after all tests have been run, or testing has been interrupted.
	 *
	 * Provides a quick summary and writes all raw numbers to a file
	 * for further processing, for example to compare with a previous run.
	 *
	 * @param result
	 */
	onEnd( result: FullResult ) {
		if ( Object.keys( this.allResults ).length > 0 ) {
			if ( this.shard ) {
				console.log(
					`\nPerformance Test Results ${ this.shard.current }/${ this.shard.total }`
				);
			} else {
				console.log( `\nPerformance Test Results` );
			}
			console.log( `Status: ${ result.status }` );
		}

		for ( const [ url, results ] of Object.entries( this.allResults ) ) {
			console.log( `\nURL: \`${ url }\`\n` );
			console.table(
				results.map( ( r ) =>
					Object.fromEntries(
						Object.entries( r ).map( ( [ key, value ] ) => [
							key,
							median( value ),
						] )
					)
				)
			);
		}

		if ( ! existsSync( process.env.WP_ARTIFACTS_PATH as string ) ) {
			mkdirSync( process.env.WP_ARTIFACTS_PATH as string );
		}

		writeFileSync(
			join(
				process.env.WP_ARTIFACTS_PATH as string,
				'performance-results.json'
			),
			JSON.stringify( this.allResults, null, 2 )
		);
	}
}

export default PerformanceReporter;
