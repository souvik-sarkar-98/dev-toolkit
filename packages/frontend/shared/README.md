# Frontend shared libraries

Framework-agnostic TypeScript used only by the `angular-*` / `react-*` adapters.
These folders are **not** npm workspaces and are **not** published.

| Library | Role |
|---------|------|
| `forms-core` | Visibility, validation, submit extraction, stepper engine, serialization |
| `comment-core` | Mention tokens and autocomplete state machine |
| `list-dashboard-core` | List config, preparation, pagination/filter/action state |
| `auth-core` | RBAC session, guard decisions, redirect sanitization |

Adapters import them as `@ssdev-toolkit/*-core` via TypeScript path aliases
(`packages/frontend/tsconfig.json`). Angular adapters `file:`-link the cores
so ng-packagr can resolve them; React adapters bundle them with tsup. Apps
install the published adapters only. Cores are not workspace packages.

Run tests from the repo root with `npm run test:frontend-shared`.
