import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { Locator, Page } from '@playwright/test';

type LocatorOptions = Record< string, unknown >;

export interface ScenarioStep {
	step: string;
	arg?: string;
	role?: string;
	selector?: string;
	url?: string;
	value?: string;
	state?: 'load' | 'domcontentloaded' | 'networkidle';
	timeout?: number;
	options?: LocatorOptions;
}

export interface Scenario {
	name: string;
	steps: ScenarioStep[];
}

interface ScenarioFile {
	scenarios?: Scenario[];
}

export function loadScenarios( filePath = process.env.SCENARIOS_FILE || '' ) {
	if ( filePath.trim() === '' ) {
		return [];
	}

	const resolvedPath = isAbsolute( filePath )
		? filePath
		: join( process.env.GITHUB_WORKSPACE || process.cwd(), filePath );

	if ( ! existsSync( resolvedPath ) ) {
		throw new Error( `Scenario file not found: ${ resolvedPath }` );
	}

	const data = JSON.parse(
		readFileSync( resolvedPath, 'utf-8' )
	) as ScenarioFile;

	return ( data.scenarios || [] ).map( validateScenario );
}

export async function runScenario(
	page: Page,
	scenario: Scenario,
	iteration: number
) {
	let locator: Locator | undefined;

	for ( const step of scenario.steps ) {
		locator = await runStep( page, step, iteration, locator );
	}
}

async function runStep(
	page: Page,
	step: ScenarioStep,
	iteration: number,
	locator: Locator | undefined
) {
	switch ( step.step ) {
		case 'visit':
			await page.goto(
				addIterationParam( getRequiredString( step, 'url' ), iteration )
			);
			return undefined;

		case 'locator':
			return page.locator( getRequiredString( step, 'selector' ) );

		case 'getByLabel':
			return page.getByLabel(
				getRequiredString( step, 'arg' ),
				normalizeOptions( step.options )
			);

		case 'getByPlaceholder':
			return page.getByPlaceholder(
				getRequiredString( step, 'arg' ),
				normalizeOptions( step.options )
			);

		case 'getByText':
			return page.getByText(
				getRequiredString( step, 'arg' ),
				normalizeOptions( step.options )
			);

		case 'getByRole':
			return page.getByRole(
				getRole( step ),
				normalizeOptions( step.options ) as Parameters<
					Page[ 'getByRole' ]
				>[ 1 ]
			);

		case 'click':
			await getLocator( locator, step ).click(
				normalizeOptions( step.options )
			);
			return locator;

		case 'fill':
			await getLocator( locator, step ).fill(
				getRequiredString( step, 'arg' ),
				normalizeOptions( step.options )
			);
			return locator;

		case 'press':
			await getLocator( locator, step ).press(
				getRequiredString( step, 'arg' ),
				normalizeOptions( step.options )
			);
			return locator;

		case 'hover':
			await getLocator( locator, step ).hover(
				normalizeOptions( step.options )
			);
			return locator;

		case 'waitFor':
			await getLocator( locator, step ).waitFor(
				normalizeOptions( step.options )
			);
			return locator;

		case 'waitForLoadState':
			await page.waitForLoadState( step.state || 'load' );
			return locator;

		case 'waitForTimeout':
			await page.waitForTimeout( step.timeout || 0 );
			return locator;

		case 'reload':
			await page.reload();
			return undefined;

		case 'clearCookies':
			await page.context().clearCookies();
			return locator;

		default:
			throw new Error( `Unsupported scenario step: ${ step.step }` );
	}
}

function validateScenario( scenario: Scenario ) {
	if ( typeof scenario.name !== 'string' || scenario.name.trim() === '' ) {
		throw new Error( 'Each scenario needs a non-empty name.' );
	}

	if ( ! Array.isArray( scenario.steps ) || scenario.steps.length === 0 ) {
		throw new Error(
			`Scenario "${ scenario.name }" needs at least one step.`
		);
	}

	return scenario;
}

function getLocator( locator: Locator | undefined, step: ScenarioStep ) {
	if ( ! locator ) {
		throw new Error( `Step "${ step.step }" needs a locator first.` );
	}

	return locator;
}

function getRole( step: ScenarioStep ) {
	return getRequiredString( step, step.role ? 'role' : 'arg' ) as Parameters<
		Page[ 'getByRole' ]
	>[ 0 ];
}

function getRequiredString( step: ScenarioStep, key: keyof ScenarioStep ) {
	const value = step[ key ];
	if ( typeof value !== 'string' || value.trim() === '' ) {
		throw new Error(
			`Step "${ step.step }" needs a non-empty "${ key }".`
		);
	}

	return value;
}

function normalizeOptions( options: LocatorOptions = {} ) {
	return Object.fromEntries(
		Object.entries( options ).map( ( [ key, value ] ) => [
			key,
			parseOptionValue( value ),
		] )
	) as LocatorOptions;
}

function parseOptionValue( value: unknown ) {
	if ( typeof value !== 'string' ) {
		return value;
	}

	const regex = value.match( /^\/(.+)\/([a-z]*)$/i );

	return regex ? new RegExp( regex[ 1 ], regex[ 2 ] ) : value;
}

function addIterationParam( url: string, iteration: number ) {
	const withoutTrailingSlash = url === '/' ? '/' : url.replace( /\/$/, '' );
	const separator = withoutTrailingSlash.includes( '?' ) ? '&' : '?';

	return `${ withoutTrailingSlash }${ separator }i=${ iteration }`;
}
