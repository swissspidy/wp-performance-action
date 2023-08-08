import { env, execPath } from 'node:process';
import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';
import { join } from 'node:path';
import { expect, test } from '@jest/globals';

const file = join(__dirname, '..', 'lib', 'main.js');

test('Fails by default', () => {
	const options: ExecFileSyncOptions = {
		env: env,
	};
	expect(() => execFileSync(execPath, [file], options)).toThrow(
		'Command failed',
	);
});
