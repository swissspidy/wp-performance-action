import * as process from 'node:process';
import * as cp from 'node:child_process';
import * as path from 'node:path';
import { expect, test } from '@jest/globals';

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
	process.env['INPUT_MILLISECONDS'] = '500';
	const np = process.execPath;
	const ip = path.join(__dirname, '..', 'lib', 'main.js');
	const options: cp.ExecFileSyncOptions = {
		env: process.env,
	};
	console.log(cp.execFileSync(np, [ip], options).toString());
});
