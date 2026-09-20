# Frontend packages

Published adapters (`angular-*` / `react-*`) plus internal shared cores under
[`shared/`](shared/README.md). Cores are not workspaces and are not published;
apps depend on the adapters only.

| Package | Role |
|---------|------|
| `@ssdev-toolkit/react-forms` | `useCustomForm`, `CustomForm`, field renderers; subpaths `@ssdev-toolkit/react-forms/bootstrap` (Bootstrap preset + CSS), `@ssdev-toolkit/react-forms/zod` |
| `@ssdev-toolkit/angular-forms` | `CfForm`, `CfField`, `FormEngineService`, Angular Material defaults, `provideCfFormMaterial()` |
| `@ssdev-toolkit/react-comment` | React mention comment editor |
| `@ssdev-toolkit/angular-comment` | `cm-mention-comment-editor`, `cm-comment-content` |
| `@ssdev-toolkit/react-list-dashboard` | `<ListDashboard>` / `useListDashboard` React host; same `ListDashboardConfig` as Angular |
| `@ssdev-toolkit/angular-list-dashboard` | `<na-list-dashboard>` Angular host |
| `@ssdev-toolkit/angular-auth` | Angular auth/RBAC services, guards, permission directive |

Shared internals (TypeScript path aliases; React bundles them, Angular `file:`-links them for ng-packagr):

| Library | Role |
|---------|------|
| `forms-core` | Models, visibility/dependency engine, validation, API adapters, submit serialization, demo fixture |
| `comment-core` | Mention tokens, comment editor value builders |
| `list-dashboard-core` | Unified list/detail/form config, form resolution, preparation, compilation |
| `auth-core` | Auth user / RBAC models and helpers |

Each **adapter** has its own `package.json` and builds to `dist/**`. Apps depend
on workspace packages with `"@ssdev-toolkit/angular-forms": "*"` (and siblings).

```bash
npm run build                  # compile shared cores, then turbo-build adapters
npm run build:frontend-shared  # tsc the four cores only
npm run test:frontend-shared   # Vitest for shared cores
```

After changing an adapter, run `npm run changeset` from the repo root to record a
semver bump. Fixed version groups: forms, comments, list-dashboard, and auth.
Packages publish as public scoped packages to npmjs. See the root [README](../../README.md#package-versioning-changesets).

**Style override:** pass custom `components` (React) or `CUSTOM_FORM_FIELD_RENDERERS` / `CF_FORM_CLASS_NAMES` (Angular). Public Bootstrap preset: `@ssdev-toolkit/react-forms/bootstrap` + `@ssdev-toolkit/react-forms/bootstrap.css`. Angular defaults use Material; call `provideCfFormMaterial()` and import a theme.

**Legacy API payloads:** use `fromPublicFormDefinition()` and `normalizeFieldType()` to map uppercase mock types (`TEXT`, `CHECKBOX`) to canonical lowercase types.
