# Frontend shared libraries

Framework-agnostic TypeScript used only by the `angular-*` / `react-*` adapters.
These folders are **not** npm workspaces and are **not** published.

| Library | Role |
|---------|------|
| `forms-core` | Models, visibility/dependency engine, validation, API adapters |
| `comment-core` | Mention tokens, comment editor value builders |
| `list-dashboard-core` | Unified list/detail/form config, form resolution, preparation |
| `auth-core` | Auth user / RBAC models and helpers |

Adapters import them as `@ssdev-toolkit/*-core` via TypeScript path aliases
(`packages/frontend/tsconfig.json`). Angular adapters `file:`-link the cores
so ng-packagr can resolve them; React adapters bundle them with tsup. Apps
install the published adapters only. Cores are not workspace packages.

Run tests from the repo root with `npm run test:frontend-shared`.
