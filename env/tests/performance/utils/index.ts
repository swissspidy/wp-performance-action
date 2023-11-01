/**
 * Helper function to camel case the letter after dashes, removing the dashes.
 *
 * @param str
 */
export function camelCaseDashes( str: string ) {
	return str.replace( /-([a-z])/g, function ( g ) {
		return g[ 1 ].toUpperCase();
	} );
}

/**
 * Computes the median number from an array numbers.
 *
 * @param array List of numbers.
 * @return Median.
 */
export function median( array: number[] ) {
	const mid = Math.floor( array.length / 2 );
	const numbers = [ ...array ].sort( ( a, b ) => a - b );
	const result =
		array.length % 2 !== 0
			? numbers[ mid ]
			: ( numbers[ mid - 1 ] + numbers[ mid ] ) / 2;

	return Number( result.toFixed( 2 ) );
}
