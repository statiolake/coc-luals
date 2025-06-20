# Dependabot Auto-merge Configuration

This file documents the auto-merge configuration for Dependabot PRs.

## How it works

1. **Dependabot creates PRs** for dependency updates weekly
2. **CI workflow runs** to verify builds pass on Node.js 18.x and 20.x
3. **Auto-merge workflow** checks if:
   - PR is from dependabot[bot]
   - Update is patch or minor (not major)
4. **Auto-merge happens immediately** for safe updates (no tests to wait for)

## Supported update types

- ✅ **Patch updates** (1.0.0 → 1.0.1) - Auto-merged immediately
- ✅ **Minor updates** (1.0.0 → 1.1.0) - Auto-merged immediately  
- ❌ **Major updates** (1.0.0 → 2.0.0) - Requires manual review

## No tests requirement

Since this project currently has no tests, the auto-merge doesn't wait for CI to pass. It merges patch and minor updates immediately to reduce maintenance overhead.

## Manual testing

To test this configuration:
1. Create a test PR that updates a dependency
2. Verify auto-merge behavior based on semver update type
3. Check that major updates are logged but not merged

## Files involved

- `.github/workflows/ci.yml` - CI pipeline (build validation)
- `.github/workflows/dependabot-auto-merge.yml` - Auto-merge logic
- `.github/dependabot.yml` - Dependabot configuration