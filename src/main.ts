import { debug, getInput, setFailed, summary } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { exec, getExecOutput } from '@actions/exec';
import csv from 'csvtojson';

function log(message: string) {
	console.log(message);
}

export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

async function run(): Promise<void> {
	const token = getInput('repo-token');
	const octokit = getOctokit(token);
	const { number: prNumber } = context.issue;

	const headSha =
		context.payload.after || context.payload.pull_request?.head.sha;

	const baseSha = context.payload.before || context.payload.pull_request?.sha;
	const baseRef = context.payload.ref || context.payload.pull_request?.ref;

	if (!baseSha || !baseRef) {
		throw new Error(`Missing base SHA or ref for event ${context.eventName}`);
	}

	const urls = getInput('urls')
		.split('\n')
		.map(url => url.trim())
		.filter(url => isValidUrl(url));

	debug(`URLs to test: ${urls.join(', ')}`);

	log('Cloning the wpp-research repository...');
	await exec(
		'git clone https://github.com/GoogleChromeLabs/wpp-research.git',
		[],
		{ silent: true },
	);

	// TODO: What about nvm install, if the Node version doesn't match?
	log('Installing dependencies...');
	await exec(`npm ci`, [], { cwd: 'wpp-research' });

	const webVitalsPerUrl: Record<
		string,
		Record<string, string | number | boolean>[]
	> = {};
	const serverTimingPerUrl: Record<
		string,
		Record<string, string | number | boolean>[]
	> = {};

	for (const url of urls) {
		const { stdout: serverTimingResults } = await getExecOutput(
			`npm run research --silent -- benchmark-server-timing -u ${url} -n 1 -p -o csv`,
			[],
			{
				cwd: 'wpp-research',
				silent: false,
			},
		);
		serverTimingPerUrl[url] = await csv({
			noheader: true,
			headers: ['key', 'value'],
		}).fromString(serverTimingResults);

		const { stdout: webVitalsResults } = await getExecOutput(
			`npm run research --silent -- benchmark-web-vitals -u ${url} -n 2 -p -o csv`,
			[],
			{
				cwd: 'wpp-research',
				silent: false,
			},
		);
		webVitalsPerUrl[url] = await csv({
			noheader: true,
			headers: ['key', 'value'],
		}).fromString(webVitalsResults);
	}

	// TODO: Checkout target branch & commit, install dependencies, build, then run same tests.

	await summary
		.addHeading('Performance Test Results')
		.addRaw(`Performance test results for ${headSha} are in :bell:!`).addEOL();

	// Prepare results for each URL.
	// TODO: Maybe separate columns for 'Before', 'After', 'Diff %', 'Diff abs.'.
	for (const url of urls) {
		const serverTimingTable = serverTimingPerUrl[url]
			.map(({ key, value }, i) => {
				// TODO: Compare results with target here.
				if (0 === i) {
					return [
						{ data: key.toString(), header: true },
						{ data: value.toString(), header: true },
					];
				}

				// Success rate is not a number.
				if (!Number.isFinite(value)) {
					return [key.toString(), value.toString()];
				}

				return [key.toString(), `${value} ms`];
			})
			.filter(Boolean);
		await summary.addTable(serverTimingTable);

		const webVitalsTable = webVitalsPerUrl[url]
			.map(({ key, value }, i) => {
				// TODO: Compare results with target here.
				if (0 === i) {
					return [
						{ data: key.toString(), header: true },
						{ data: value.toString(), header: true },
					];
				}

				// Success rate is not a number.
				if (!Number.isFinite(value)) {
					return [key.toString(), value.toString()];
				}

				return [key.toString(), `${value} ms`];
			})
			.filter(Boolean);
		await summary.addTable(webVitalsTable);
	}

	// Re-use text as PR comment.
	const resultsText = summary.stringify();

	if (
		context.eventName !== 'pull_request' &&
		context.eventName !== 'pull_request_target'
	) {
		log('No PR associated with this action run, just posting summary.');
		await summary.write();
	} else {
		// TODO: Optionally set status check instead.

		const commentInfo = {
			...context.repo,
			issue_number: prNumber,
		};

		const comment = {
			...commentInfo,
			body: resultsText,
		};

		let commentId;
		try {
			const comments = (await octokit.rest.issues.listComments(commentInfo))
				.data;
			for (let i = comments.length; i--; ) {
				const c = comments[i];
				if (
					c.user?.type === 'Bot' &&
					/Performance test results/i.test(c?.body || '')
				) {
					commentId = c.id;
					break;
				}
			}
		} catch (e) {
			if (e instanceof Error) {
				log(`Error checking for previous comments: ${e.message}`);
			} else {
				log('Error checking for previous comments');
			}
		}

		if (commentId) {
			log(`Updating previous comment #${commentId}`);
			try {
				await octokit.rest.issues.updateComment({
					...context.repo,
					comment_id: commentId,
					body: comment.body,
				});
			} catch (e) {
				if (e instanceof Error) {
					log(`Error updating comment: ${e.message}`);
				} else {
					log('Error updating comment');
				}
			}
		}

		if (!commentId) {
			try {
				await octokit.rest.issues.createComment(comment);
			} catch (e) {
				if (e instanceof Error) {
					log(`Error creating comment: ${e.message}`);
				} else {
					log('Error creating comment');
				}
				log(`Adding to summary instead...`);
				await summary.write();
			}
		}
	}
}

(async () => {
	try {
		await run();
	} catch (error) {
		if (error instanceof Error) {
			setFailed(error.message);
		}
	}
})();
