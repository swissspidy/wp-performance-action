# wp-performance-action

A GitHub action to measure performance metrics of WordPress sites.

Results are posted as comments to pull requests and as [GitHub Action job summaries](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/).

It collects data from the `Server-Timing` header and runs Lighthouse on a given set of URLs. 

<img width="1154" alt="Screenshot of a GitHub Action job summary output by this action" src="https://github.com/swissspidy/wp-performance-action/assets/841956/bb543ba2-a142-49d5-bb45-77d11f121824">

## Usage

See [action.yml](action.yml)

<!-- start usage -->
```yaml
- uses: swissspidy/wp-performance-action@main
  with:
    # Personal access token (PAT) used to comment on pull requests.
    #
    # [Learn more about creating and using encrypted secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets)
    #
    # Default: ${{ github.token }}
    github-token: ''

    # Whether to create PR comments with performance results.
    # Might require a custom `github-token` to be set.
    #
    # Default: false
    create-comment: ''

    # Whether to log additional debugging information
    #
    # Default: ${{ runner.debug == '1' }}
    debug: ''

    # List of URLs on the WordPress site to test.
    # Each URL should be separated with new lines.
    #
    # Default: ''
    urls: ''

    # List of plugins to install.
    # Each plugin should be separated with new lines.
    # Supports paths to local directories or ZIP URLs.
    # Performance Lab (performance-lab) is always installed.
    #
    # Default: ''
    plugins: ''

    # List of themes to install.
    # Each theme should be separated with new lines.
    # Supports paths to local directories or ZIP URLs.
    # Twenty Twenty-One (twentytwentyone) and Twenty Twenty-Three (twentytwentythree)
    # are always installed.
    #
    # Default: ''
    themes: ''

    # Theme to activate on the site.
    # Theme needs to be already installed.
    #
    # Default: 'twentytwentyone'
    active-theme: ''

    # WordPress version to use.
    # Supports aliases such as latest, nightly, or trunk.
    # Also supports ZIP URLs or a Git reference from https://github.com/WordPress/wordpress
    # to install a specific version.
    #
    # Default: 'latest'
    wp-version: ''

    # PHP version to use.
    # Defaults to whatever version is the default
    # in the Docker-maintained WordPress image
    # (currently 8.0 as of November 2023)
    #
    # Default: 'auto'
    php-version: ''
 
    # Number of times the tests should be repeated.
    #
    # Default: 2
    repetitions: ''

    # Number of iterations (loops) within a single run.
    #
    # Default: 20
    iterations: ''

    # Shard to use if running tests in parallel.
    # Valid values are 1/2, 1/4, etc.
    #
    # Default: ''
    shard: ''

    # Action to perform, can be either "test" or "merge".
    # Merging is needed when running tests in parallel
    # in a test matrix, where you later need to merge
    # the results from the individual jobs together.
    #
    # Default: 'test'
    action: ''

    # Path to a file with previous performance results for comparison.
    # Useful when running tests for a pull request and
    # the target branch, so that the performance impact can be measured.
    #
    # Default: ''
    previous-results: ''
```
<!-- end usage -->

### Basic

Add a workflow (`.github/workflows/build-test.yml`):

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4
  
  - name: Run performance tests
    uses: swissspidy/wp-performance-action@main
    with:
      plugins: |
        ./my-awesome-plugin
      urls: |
        /
        /sample-page/
```

### Advanced

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4
  
  - name: Run performance tests
    uses: swissspidy/wp-performance-action@main
    with:
      urls: |
        /
        /sample-page/
      plugins: |
        ./my-awesome-plugin
        https://downloads.wordpress.org/plugin/performant-translations.zip
        https://downloads.wordpress.org/plugin/wordpress-seo.zip
      iterations: 5
      repetitions: 1
```

### Running tests in parallel (sharding)

```yaml
jobs:
  matrix:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
    - uses: actions/checkout@v4

    - name: Run performance tests
      uses: swissspidy/wp-performance-action@main
      id: run-tests
      with:
        urls: |
          /
          /sample-page/
        plugins: |
          ./my-awesome-plugin
        shard: ${{ matrix.shard }}

  merge-reports:
    if: always()
    needs: [matrix]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Merge performance test results
      uses: swissspidy/wp-performance-action@main
      with:
        action: 'merge'
```

### Performance results output

The `results` step output contains information regarding where the raw performance results numbers are stored.
This output can be used for a variety of purposes such as logging or for a comparison with previous results.

In addition to that, the raw results are also uploaded as a [workflow artifact](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts).

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4
  
  - name: Run performance tests
    uses: swissspidy/wp-performance-action@main
    id: performance-tests
    with:
      plugins: |
        ./my-awesome-plugin
      urls: |
        /
        /sample-page/

  - name: 'Echo results path'
    run: echo ${{steps.performance-tests.outputs.results}}
```
