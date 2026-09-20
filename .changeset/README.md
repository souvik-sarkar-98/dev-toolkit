# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) for independent package versioning and publishing.

## Workflow

1. **Record a change** — after implementing a feature or fix:

   ```powershell
   npm run changeset
   ```

   Select the affected published packages (`@ssdev-toolkit/nestjs-*` or frontend adapters such as `@ssdev-toolkit/angular-forms`) and choose patch / minor / major. Do not add changesets for `packages/frontend/shared/*-core` — those are internal libraries, not npm packages.

2. **Apply version bumps** — when ready to release (usually on merge to `main`):

   ```powershell
   npm run version-packages
   ```

   This bumps `package.json` versions, updates internal dependency ranges, and generates changelogs.

3. **Publish all changed packages**:

   ```powershell
   npm run release
   ```

   Type-checks, builds the packages, then publishes every package with a pending version bump.

## Registry

Packages publish as **public** to the npmjs registry (`registry.npmjs.org`). Anyone can install without a token:

```bash
npm install @ssdev-toolkit/nestjs-core
```

Before the first publish, create/claim the `@ssdev-toolkit` org on [npmjs.com](https://www.npmjs.com/) and log in:

```powershell
npm login
npm whoami
npm run release
```

In CI, set `NPM_TOKEN` to an npm automation token with publish rights for that org.

## Notes

- Internal package dependencies use `"*"` for npm workspace linking during development.
  `npm run version-packages` (Changesets) rewrites these to semver ranges (e.g. `^1.0.1`) in published manifests.
- `changeset status` requires a git repository with a `main` branch synced to remote.
- This repo publishes workspace libraries only (`packages/backend/*` and `packages/frontend/*` adapters). `packages/frontend/shared/` is not published. Host applications live in other repositories.
