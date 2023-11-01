#!/usr/bin/env node

/**
 * External dependencies
 */
const { existsSync, readFileSync, writeFileSync } = require( 'node:fs' );
const { join } = require( 'node:path' );

process.env.WP_ARTIFACTS_PATH ??= join( process.cwd(), 'artifacts' );

const args = process.argv.slice( 2 );

const beforeFile = args[ 1 ];
const afterFile =
	args[ 0 ] ||
	join( process.env.WP_ARTIFACTS_PATH, 'performance-results.json' );

if ( ! existsSync( afterFile ) ) {
	console.error( `File not found: ${ afterFile }` );
	process.exit( 1 );
}

if ( beforeFile && ! existsSync( beforeFile ) ) {
	console.error( `File not found: ${ beforeFile }` );
	process.exit( 1 );
}

/**
 * @param {unknown} v
 * @return {string} Formatted value.
 */
function formatTableValue( v ) {
	if ( v === true || v === 'true' ) return '✅';
	if ( ! v || v === 'false' ) return '';
	return v?.toString() || String( v );
}

/**
 * Simple way to format an array of objects as a Markdown table.
 *
 * For example, this array:
 *
 * [
 * 	{
 * 	    foo: 123,
 * 	    bar: 456,
 * 	    baz: 'Yes',
 * 	},
 * 	{
 * 	    foo: 777,
 * 	    bar: 999,
 * 	    baz: 'No',
 * 	}
 * ]
 *
 * Will result in the following table:
 *
 * | foo | bar | baz |
 * |-----|-----|-----|
 * | 123 | 456 | Yes |
 * | 777 | 999 | No  |
 *
 * @param {Array<Object>} rows Table rows.
 * @return {string} Markdown table content.
 */
function formatAsMarkdownTable( rows ) {
	let result = '';
	const headers = Object.keys( rows[ 0 ] );
	for ( const header of headers ) {
		result += `| ${ header } `;
	}
	result += '|\n';
	for ( const header of headers ) {
		const dashes = '-'.repeat( header.length );
		result += `| ${ dashes } `;
	}
	result += '|\n';

	for ( const row of rows ) {
		for ( const [ key, value ] of Object.entries( row ) ) {
			result += `| ${ formatTableValue( value ).padStart(
				key.length,
				' '
			) } `;
		}
		result += '|\n';
	}

	return result;
}

/**
 * Computes the median number from an array numbers.
 *
 * @param {number[]} array List of numbers.
 * @return {number} Median.
 */
function median( array ) {
	const mid = Math.floor( array.length / 2 );
	const numbers = [ ...array ].sort( ( a, b ) => a - b );
	const result =
		array.length % 2 !== 0
			? numbers[ mid ]
			: ( numbers[ mid - 1 ] + numbers[ mid ] ) / 2;

	return Number( result.toFixed( 2 ) );
}

/**
 * @type {Array<{file: string, title: string, results: Record<string,number[]>[]}>}
 */
let beforeStats = [];

/**
 * @type {Array<{file: string, title: string, results: Record<string,number[]>[]}>}
 */
let afterStats;

if ( beforeFile ) {
	try {
		beforeStats = JSON.parse(
			readFileSync( beforeFile, { encoding: 'utf-8' } )
		);
	} catch {}
}

try {
	afterStats = JSON.parse( readFileSync( afterFile, { encoding: 'utf-8' } ) );
} catch {
	console.error( `Could not read file: ${ afterFile }` );
	process.exit( 1 );
}

/**
 * Returns a Markdown link to a Git commit on the current GitHub repository.
 *
 * For example, turns `a5c3785ed8d6a35868bc169f07e40e889087fd2e`
 * into (https://github.com/wordpress/wordpress-develop/commit/36fe58a8c64dcc83fc21bddd5fcf054aef4efb27)[36fe58a].
 *
 * @param {string} sha Commit SHA.
 * @return string Link
 */
function linkToSha( sha ) {
	const url = process.env.REPOSITORY_URL;
	return `[${ sha.slice( 0, 7 ) }](${ url }/commit/${ sha })`;
}

let summaryMarkdown = `**Performance Test Results**\n\n`;

if ( process.env.GITHUB_SHA ) {
	summaryMarkdown += `Performance test results for ${ linkToSha(
		process.env.GITHUB_SHA
	) } are in 🛎️!\n\n`;
} else {
	summaryMarkdown += `Performance test results are in 🛎️!\n\n`;
}

if ( beforeFile ) {
	summaryMarkdown += `Note: the numbers in parentheses show the difference to the previous (baseline) test run.\n\n`;
}

console.log( 'Performance Test Results\n' );

if ( beforeFile ) {
	console.log(
		'Note: the numbers in parentheses show the difference to the previous (baseline) test run.\n'
	);
}

const DELTA_VARIANCE = 0.5;
const PERCENTAGE_VARIANCE = 2;

/**
 * Format value and add unit.
 *
 * Turns bytes into MB (base 10).
 *
 * @todo Dynamic formatting based on definition in result.json.
 *
 * @param {number} value Value.
 * @param {string} key   Key.
 * @return {string} Formatted value.
 */
function formatValue( value, key ) {
	if ( key === 'CLS' ) {
		return value.toFixed( 2 );
	}

	if ( key === 'wpDbQueries' ) {
		return value.toFixed( 0 );
	}

	if ( key === 'wpMemoryUsage' ) {
		return `${ ( value / Math.pow( 10, 6 ) ).toFixed( 2 ) } MB`;
	}

	return `${ value.toFixed( 2 ) } ms`;
}

for ( const { file, title, results } of afterStats ) {
	const prevStat = beforeStats.find( ( s ) => s.file === file );

	/**
	 * @type {Array<Record<string,string|number|boolean>>}
	 */
	const diffResults = [];

	for ( const i in results ) {
		const newResult = results[ i ];

		/**
		 * @type {Record<string, string>}
		 */
		const diffResult = {
			Run: i,
		};

		for ( const [ key, values ] of Object.entries( newResult ) ) {
			// Only do comparison if the number of results is the same.
			const prevValues =
				prevStat?.results.length === results.length
					? prevStat?.results[ i ].key
					: null;

			const value = median( values );
			const prevValue = prevValues ? median( prevValues ) : 0;
			const delta = value - prevValue;
			const percentage = ( delta / value ) * 100;

			// Skip if there is not a significant delta or none at all.
			if (
				! prevValues ||
				! percentage ||
				Math.abs( percentage ) <= PERCENTAGE_VARIANCE ||
				! delta ||
				Math.abs( delta ) <= DELTA_VARIANCE
			) {
				diffResult[ key ] = formatValue(
					/** @type {number} */ ( value ),
					key
				);
				continue;
			}

			const prefix = delta > 0 ? '+' : '';

			diffResult[ key ] = `${ formatValue(
				value,
				key
			) } (${ prefix }${ formatValue(
				delta,
				key
			) } / ${ prefix }${ percentage }%)`;
		}

		diffResults.push( diffResult );
	}

	console.log( title );
	console.table( diffResults );

	summaryMarkdown += `**${ title }**\n\n`;
	summaryMarkdown += `${ formatAsMarkdownTable( diffResults ) }\n`;
}

writeFileSync(
	join( process.env.WP_ARTIFACTS_PATH, '/performance-results.md' ),
	summaryMarkdown
);
