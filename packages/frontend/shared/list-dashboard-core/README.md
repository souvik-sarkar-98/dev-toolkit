# list-dashboard-core

Internal shared library (not an npm workspace, not published). The
`@ssdev-toolkit/list-dashboard-core` name is a TypeScript path alias used by
the list-dashboard adapters. Apps should install
`@ssdev-toolkit/react-list-dashboard` or `@ssdev-toolkit/angular-list-dashboard`,
not this folder.

Framework-agnostic types, configs, adapters, form/preparation runtime, and
route-query utilities for the Universal List Dashboard.

## Exports

- **Models** — `ListRowItem`, `ListDetailSection` (incl. `item_list`), `ChipFilter`, etc.
- **Configs** — `ListDashboardConfig` (unified consumer config), `FilteredListPageConfig`,
  `ListDetailPageConfig`, `FilteredListDashboardConfig`, `ListActionDef`
- **Runtime** — form resolve (local/backend/hybrid), preparation runner,
  `resolveListDashboardConfig` / `compileListDashboardConfig`
- **Adapters** — `createListPageAdapter`, `createDetailPageAdapter`
- **Utils** — route query, detail helpers (`detailItemListSection`), bulk-edit derive

## Consumer contract

Feature authors write one `ListDashboardConfig` and pass it to
`<ListDashboard>` (`@ssdev-toolkit/react-list-dashboard`) or
`<na-list-dashboard>` (`@ssdev-toolkit/angular-list-dashboard`).

Nested collections use `type: 'item_list'` sections — not host forRoot widgets.

## Build

From the repo root:

```bash
npm run build:frontend-shared
npm run test:frontend-shared
```

## Consumers

- `@ssdev-toolkit/react-list-dashboard` — React host
- `@ssdev-toolkit/angular-list-dashboard` — Angular host
- `@ssdev-toolkit/public-site` — backend form resolution via `resolveListForm`

## Docs

- [ADR: unified list dashboard](./docs/ADR-unified-list-dashboard.md)
- [Design tokens](./docs/TOKENS.md)
- Angular developer guide: `@ssdev-toolkit/angular-list-dashboard` → `docs/DEVELOPER-GUIDE.html`
- React host: `@ssdev-toolkit/react-list-dashboard` → `README.md`
