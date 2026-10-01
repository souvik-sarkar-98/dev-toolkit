# Dev Toolkit

npm workspaces + [Turborepo](https://turbo.build/) of **shared backend and frontend libraries**. This repository publishes `@ssdev-toolkit/*` packages; applications live in separate repos and consume these libraries from npm or a workspace link.

## Packages

### Backend

| Area | Packages | Docs |
|------|----------|------|
| Foundation | `nestjs-core`, `nestjs-persistence` | [core](packages/backend/nestjs-core/README.md) · [persistence](packages/backend/nestjs-persistence/README.md) |
| Ops | `nestjs-observability`, `nestjs-health` | [observability](packages/backend/nestjs-observability/README.md) · [health](packages/backend/nestjs-health/README.md) |
| Identity & jobs | `nestjs-auth`, `nestjs-queue`, `nestjs-cron`, `nestjs-token-vault` | [auth](packages/backend/nestjs-auth/README.md) · [queue](packages/backend/nestjs-queue/README.md) · [cron](packages/backend/nestjs-cron/README.md) · [token-vault](packages/backend/nestjs-token-vault/README.md) |
| Content | `nestjs-json-store`, `nestjs-custom-forms`, `nestjs-comment`, `nestjs-correspondence`, `nestjs-dms`, `nestjs-document-generator` | [json-store](packages/backend/nestjs-json-store/README.md) · [custom-forms](packages/backend/nestjs-custom-forms/README.md) · [comment](packages/backend/nestjs-comment/README.md) · [correspondence](packages/backend/nestjs-correspondence/README.md) · [dms](packages/backend/nestjs-dms/README.md) · [document-generator](packages/backend/nestjs-document-generator/README.md) |

Catalog and wiring notes: [packages/backend/README.md](packages/backend/README.md). Index of both stacks: [packages/README.md](packages/README.md).

**Convention:** host apps import each feature as `XxxModule.forRoot()` / `forRootAsync()`, implement persistence adapters in the host, and call **facades** (or the command/query bus) from other modules. Repository tokens are for host persistence wiring only.

### Frontend

| Family | Packages | Docs |
|--------|----------|------|
| Forms | `react-forms`, `angular-forms` (shared `forms-core`) | [frontend catalog](packages/frontend/README.md) |
| Comments | `react-comment`, `angular-comment` (shared `comment-core`) | [frontend catalog](packages/frontend/README.md) |
| List dashboard | `react-list-dashboard`, `angular-list-dashboard` (shared `list-dashboard-core`) | [frontend catalog](packages/frontend/README.md) |
| Auth | `angular-auth` (shared `auth-core`) | [frontend catalog](packages/frontend/README.md) |

Published frontend packages live under `packages/frontend/*` (`angular-*` / `react-*`, matching backend `nestjs-*`). Framework-agnostic `*-core` sources live in [`packages/frontend/shared/`](packages/frontend/shared/README.md): they are **not** npm workspaces and are **not** published. Apps install adapters only. React adapters bundle cores; Angular adapters `file:`-link them for ng-packagr.

To refresh those packages from the standalone web-toolkit tree:

```bash
node scripts/import-web-packages.mjs
```

## Prerequisites

- Node.js 22+
- npm 10+
- NestJS 11 (host app)

Install once at the repo root: 

```bash
npm install 
``` 

## Commands (from repo root)

| Script | Description |
|--------|-------------|
| `npm run build` | Compile frontend shared cores, then Turbo-build workspace packages (`^build`) |
| `npm run type-check` | Type-check all workspaces |
| `npm run lint` | Type-check / lint workspaces that define `lint` |
| `npm run test` | Backend Jest from the repo root, then Vitest for frontend adapters and shared cores |
| `npm run clean` | Clean package `dist/` and Turbo cache |
| `npm run watch:packages` | Rebuild backend and frontend packages on change |
| `npm run changeset` | Record a semver bump + changelog entry |
| `npm run changeset:status` | Show pending changesets |
| `npm run version-packages` | Apply changesets (bump versions, changelogs) |
| `npm run release` | Type-check, build `packages/*`, and publish (npm dist-tag `latest`) |
| `npm run release:beta` | Type-check, build `packages/*`, and publish with npm dist-tag `beta` |

Target one package with `npm run <script> -w @ssdev-toolkit/nestjs-<name>` or `npm run <script> -w @ssdev-toolkit/<frontend-package>`.

## Adding a shared package

- **Backend:** `packages/backend/nestjs-<name>/package.json` (name `@ssdev-toolkit/nestjs-<name>`).
- **Frontend adapter (published):** `packages/frontend/angular-<name>` or `packages/frontend/react-<name>` (name `@ssdev-toolkit/angular-<name>` / `@ssdev-toolkit/react-<name>`). Depend on it with `"*"` inside this repo, or from an app via npm.
- **Frontend core (internal):** `packages/frontend/shared/<name>-core`. Keep it `private`, out of workspaces and Changesets. Adapters import `@ssdev-toolkit/<name>-core` via TypeScript paths in [`packages/frontend/tsconfig.json`](packages/frontend/tsconfig.json).

Turborepo runs workspace dependency builds first via `dependsOn: ["^build"]`. After a public API or behavior change on a **published** package, run `npm run changeset`.

## Package versioning (Changesets)

This repo uses [Changesets](https://github.com/changesets/changesets) to version and publish libraries. Backend packages under `packages/backend/` version independently. Published frontend **adapters** under `packages/frontend/` use fixed groups (forms, comments, list-dashboard, auth). Shared cores under `packages/frontend/shared/` are not versioned or published.

### Day-to-day workflow

1. **After changing a library**, add a changeset:

   ```bash
   npm run changeset
   ```

   Choose the affected package(s), a semver bump (`patch` / `minor` / `major`), and a short changelog summary.

2. **When ready to release**, merge to `develop`. CI opens one rolling Version Packages pull request (`2.3.3-beta.1`, then `.2`). Merging that pull request publishes with the npm `beta` dist-tag. Promoting `develop` to `main` opens the stable Version Packages pull request (`2.3.3`); merging it publishes with `latest`.

   Local equivalents:

   ```bash
   npm run version-packages   # bumps package.json + CHANGELOG.md
   npm run release:beta       # develop: type-check, build, publish (dist-tag beta)
   npm run release            # main: type-check, build, publish (dist-tag latest)
   ```

3. **Check pending releases** (needs a git repo with a `main` branch):

   ```bash
   npm run changeset:status
   ```

Dependent packages that use workspace `"*"` ranges get a patch bump when an upstream library changes (`updateInternalDependencies` in [`.changeset/config.json`](.changeset/config.json)). During publish, Changesets rewrites `"*"` to semver ranges in the published manifests.

### CI release pipeline

GitHub Actions calls the reusable workflows in `nabarun-ngo/ngo-nabarun-deploy`. The publish workflow versions with Changesets and publishes `@ssdev-toolkit/*` to the public npm registry. It does **not** create git tags or GitHub Releases. Version history lives in `package.json`, `CHANGELOG.md`, and npm. `develop` is the integration and beta branch. `main` is the stable branch. Stage and prod remain deployment environments in the apps that consume these packages.

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Pull requests to `main` or `develop` | Calls `reusable-ci-pr-check.yml` (install, type-check, lint if present, build, test) |
| [`.github/workflows/changeset-check.yml`](.github/workflows/changeset-check.yml) | Pull requests to `main` or `develop` | Calls `reusable-ci-changeset-check.yml`; rejects a non-conventional title, and fails if `packages/` changed without a matching changeset |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | Push to `main` or `develop` | Calls `reusable-ci-publish.yml`. Opens a **Version Packages** pull request when changesets exist; publishes when that pull request merges |

| Branch | npm dist-tag | Install |
|--------|----------------|---------|
| `main` | `latest` | `npm install @ssdev-toolkit/nestjs-core` |
| `develop` | `beta` | `npm install @ssdev-toolkit/nestjs-core@beta` |

**Setup (one-time):**

1. Add repository secret **`NPM_TOKEN`** with an npm automation token that can publish `@ssdev-toolkit/*` packages.
2. Add repository secret **`RELEASE_TOKEN`**: a GitHub App token or fine-grained PAT with `contents: write` and `pull-requests: write` on this repository, and read access to `nabarun-ngo/ngo-nabarun-deploy`. The release and changeset-check workflows pass it as `TEMPLATES_TOKEN` so they can read `scripts/release_model.py`. It also creates and updates `changeset-release/develop` or `changeset-release/main` and opens the Version Packages pull request. Do not use the default `GITHUB_TOKEN` for this job: pull requests created by that token do not start the repository's pull-request checks, which can leave a required-check-protected Version Packages pull request unable to merge, and `GITHUB_TOKEN` cannot read the templates repository.
3. Ensure you are logged in to npmjs with publish rights for `@ssdev-toolkit` (`npm login`). Root [`.npmrc`](.npmrc) points the scope at `registry.npmjs.org`.
4. The updated reusable workflows must be on `main` of `nabarun-ngo/ngo-nabarun-deploy` before these callers run. Change the `uses:` owner/name when that platform repository moves.
5. Merge feature pull requests into `develop`. The release workflow enters beta prerelease mode on the first changeset and opens the Version Packages pull request. Merge that pull request to publish `beta`.
6. Promote `develop` to `main`. The workflow leaves prerelease mode and opens the stable Version Packages pull request. Merge it to publish `latest`.

Pull request titles must be conventional commits: `fix:`, `feat:`, `feat!:` or `BREAKING CHANGE:`, `docs:`, `chore:`, or `ci:`. A package change's changeset bump must match the highest of those commits.

### Publishing notes

- Workspace libraries under `packages/backend/*` and `packages/frontend/*` (adapters only) publish as **public** packages to npmjs (`publishConfig.access: public` + `registry.npmjs.org`). Nested `packages/frontend/shared/` is unpublished.
- Anyone can install without a token: `npm install @ssdev-toolkit/nestjs-core` (stable) or `npm install @ssdev-toolkit/nestjs-core@beta`.
- For CI publish, use an npm automation token (`NPM_TOKEN`) with write access to the `@ssdev-toolkit` org.
- Workflows call `nabarun-ngo/ngo-nabarun-deploy` (`reusable-ci-publish.yml`, `reusable-ci-changeset-check.yml`, `reusable-ci-pr-check.yml`). Change the `uses:` owner/name if the ops repo is published under a different path.
