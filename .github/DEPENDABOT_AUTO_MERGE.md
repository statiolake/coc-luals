# Test Dependabot Auto-merge Configuration

This file documents the auto-merge configuration for Dependabot PRs.

## How it works

1. **Dependabot creates PRs** for dependency updates weekly
2. **CI workflow runs** to verify builds pass on Node.js 18.x and 20.x
3. **Auto-merge workflow** checks if:
   - PR is from dependabot[bot]
   - Update is patch or minor (not major)
   - CI tests pass
4. **Auto-merge happens** if all conditions are met

## Supported update types

- ✅ **Patch updates** (1.0.0 → 1.0.1) - Auto-merged
- ✅ **Minor updates** (1.0.0 → 1.1.0) - Auto-merged
- ❌ **Major updates** (1.0.0 → 2.0.0) - Requires manual review

## Manual testing

To test this configuration:
1. Create a test PR that updates a dependency
2. Check that CI workflow runs and passes
3. Verify auto-merge behavior based on semver update type

## Files involved

- `.github/workflows/ci.yml` - CI pipeline
- `.github/workflows/dependabot-auto-merge.yml` - Auto-merge logic
- `.github/dependabot.yml` - Dependabot configuration