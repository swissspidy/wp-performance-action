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

	allResults: Record<
		string,
		{
			title: string;
			results: Record< string, number[] >[];
		}
	> = {};

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
			this.allResults[ test.location.file ] ??= {
				// 0 = empty, 1 = browser, 2 = file name, 3 = test suite name.
				title: test.titlePath()[ 3 ],
				results: [],
			};
			this.allResults[ test.location.file ].results.push(
				JSON.parse( performanceResults.body.toString( 'utf-8' ) )
			);
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
		const summary = [];

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

		for ( const [ file, { title, results } ] of Object.entries(
			this.allResults
		) ) {
			console.log( `\n${ title }\n` );
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

			summary.push( {
				file,
				title,
				results,
			} );
		}

		if ( ! existsSync( process.env.WP_ARTIFACTS_PATH as string ) ) {
			mkdirSync( process.env.WP_ARTIFACTS_PATH as string );
		}

		writeFileSync(
			join(
				process.env.WP_ARTIFACTS_PATH as string,
				'performance-results.json'
			),
			JSON.stringify( summary, null, 2 )
		);
	}
}

export default PerformanceReporter;
