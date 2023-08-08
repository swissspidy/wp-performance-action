# wp-performance-action

A GitHub action to measure performance metrics of WordPress sites.

Results are posted as comments to pull requests and as [GitHub Action job summaries](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/).

It collects data from the `Server-Timing` header and runs Lighthouse on a given set of URLs. 

![Screenshot of a GitHub Action job summary output by this action](https://i.imgur.com/NONeYNq.png)

## Usage

Add a workflow (`.github/workflows/build-test.yml`):

```yaml
name: 'build-test'
on: # rebuild any PRs and main branch changes
  pull_request:
  push:
    branches:
    - main
    - 'releases/*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Set up Node
      uses: actions/setup-node@v3.7.0
      with:
        node-version-file: '.nvmrc'

    - name: Install dependencies
      run: npm ci

# Here's where you would run your custom build process
# and configure & start the server environment.

    - name: Start server
      run: npx wp-env start

    - name: Run performance tests
      uses: swissspidy/wp-performance-action@main
      with:
        urls: |
          http://localhost:8889/
          http://localhost:8889/?p=1
```

It's recommended to use the [Performance Lab](https://wordpress.org/plugins/performance-lab) plugin on your site to get additional `Server-Timing` metrics.

