# GitHub Actions Workflow Examples for Timekeeper

This directory contains example GitHub Actions workflows that you can use to automate your CI/CD pipeline.

## Available Workflow Examples

### 1. dotnet-ci.yml
Continuous Integration workflow that:
- Builds the solution
- Runs all tests
- Reports test results
- Checks code formatting

### 2. pr-validation.yml
Pull Request validation that:
- Validates PR has description
- Checks for linked issues
- Runs linters
- Ensures tests pass

## How to Enable Workflows

1. **Copy** the workflow file you want to `.github/workflows/`
2. **Review** the workflow configuration
3. **Customize** as needed for your project
4. **Commit** and push to enable

## Workflow Configuration

### Setting up .NET CI

Create `.github/workflows/dotnet-ci.yml`:

```yaml
name: .NET CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '8.0.x'
    
    - name: Restore dependencies
      run: dotnet restore
    
    - name: Build
      run: dotnet build --no-restore --configuration Release
    
    - name: Test
      run: dotnet test --no-build --configuration Release --verbosity normal --logger "trx;LogFileName=test-results.trx"
    
    - name: Publish Test Results
      uses: dorny/test-reporter@v1
      if: always()
      with:
        name: .NET Tests
        path: '**/test-results.trx'
        reporter: dotnet-trx
```

### Setting up PR Validation

Create `.github/workflows/pr-validation.yml`:

```yaml
name: PR Validation

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
    - name: Check PR has description
      uses: actions/github-script@v7
      with:
        script: |
          const pr = context.payload.pull_request;
          if (!pr.body || pr.body.length < 10) {
            core.setFailed('Pull request must have a description');
          }
    
    - name: Check PR has linked issue
      uses: actions/github-script@v7
      with:
        script: |
          const pr = context.payload.pull_request;
          const hasIssueLink = /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved):\s*#\d+/i.test(pr.body);
          if (!hasIssueLink) {
            core.warning('PR does not link to an issue');
          }

  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '8.0.x'
    
    - name: Restore dependencies
      run: dotnet restore
    
    - name: Build
      run: dotnet build --no-restore
    
    - name: Run tests
      run: dotnet test --no-build --verbosity normal
```

### Code Coverage Workflow

Create `.github/workflows/code-coverage.yml`:

```yaml
name: Code Coverage

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  coverage:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '8.0.x'
    
    - name: Install coverage tools
      run: dotnet tool install --global dotnet-coverage
    
    - name: Restore dependencies
      run: dotnet restore
    
    - name: Build
      run: dotnet build --no-restore
    
    - name: Run tests with coverage
      run: dotnet test --no-build --collect:"XPlat Code Coverage"
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: '**/coverage.cobertura.xml'
        fail_ci_if_error: true
```

## Environment Secrets

If your workflows need secrets (API keys, tokens, etc.):

1. Go to repository Settings
2. Navigate to Secrets and variables → Actions
3. Add your secrets
4. Reference in workflow: `${{ secrets.SECRET_NAME }}`

## Branch Protection

Consider enabling branch protection rules:
1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - Require pull request reviews
   - Require status checks to pass (select your workflows)
   - Require conversation resolution before merging

## Workflow Best Practices

### 1. Cache Dependencies
Speed up workflows by caching:
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.nuget/packages
    key: ${{ runner.os }}-nuget-${{ hashFiles('**/*.csproj') }}
    restore-keys: |
      ${{ runner.os }}-nuget-
```

### 2. Matrix Builds
Test on multiple platforms:
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
runs-on: ${{ matrix.os }}
```

### 3. Conditional Steps
Run steps conditionally:
```yaml
- name: Deploy
  if: github.ref == 'refs/heads/main'
  run: echo "Deploying..."
```

### 4. Job Dependencies
Chain jobs:
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps: [...]
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps: [...]
```

## Monitoring Workflows

- View workflow runs in the "Actions" tab
- Click on a run to see detailed logs
- Re-run failed workflows
- Download artifacts from workflow runs

## Troubleshooting

### Common Issues

**Issue**: Tests fail in CI but pass locally
**Solution**: 
- Check timezone differences (use UTC)
- Verify environment variables
- Check for race conditions

**Issue**: Slow workflow execution
**Solution**:
- Use caching for dependencies
- Parallelize jobs
- Use matrix builds efficiently

**Issue**: Workflow not triggering
**Solution**:
- Check trigger conditions (branches, paths)
- Verify YAML syntax
- Check workflow file location

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [.NET GitHub Actions](https://github.com/actions/setup-dotnet)
- [Marketplace Actions](https://github.com/marketplace?type=actions)

## Contributing

If you create useful workflows for this project, please:
1. Test them thoroughly
2. Document their purpose
3. Submit a PR to add them as examples
