# wp-performance-action

A GitHub action to measure performance metrics of WordPress sites.

Results are posted as comments to pull requests and as [GitHub Action job summaries](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/).

It collects data from the `Server-Timing` header and runs Lighthouse on a given set of URLs. 

<img width="1154" alt="Screenshot of a GitHub Action job summary output by this action" src="https://github.com/swissspidy/wp-performance-action/assets/841956/bb543ba2-a142-49d5-bb45-77d11f121824">

## Usage

### Basic Example

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

# Here's where you would install dependencies, run your custom build process, etc.

    - name: Run performance tests
      uses: swissspidy/wp-performance-action@main
      with:
        plugins: |
          ./my-awesome-plugin
        urls: |
          http://localhost:8889/
          http://localhost:8889/?p=1
```

### Advanced Example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:

    - name: Run performance tests
      uses: ./
      with:
        urls: |
          /
          /sample/page/
        plugins: |
          ./my-awesome-plugin
          https://downloads.wordpress.org/plugin/performant-translations.zip
          https://downloads.wordpress.org/plugin/wordpress-seo.zip
        iterations: 5
        repetitions: 1
```
