# list-dashboard-core

Internal shared library (not an npm workspace, not published). The
`@ssdev-toolkit/list-dashboard-core` name is a TypeScript path alias used by
the list-dashboard adapters. Apps should install
`@ssdev-toolkit/react-list-dashboard` or `@ssdev-toolkit/angular-list-dashboard`,
not this folder.

Framework-agnostic types, configs, adapters, form/preparation runtime, list
state machines, and route-query utilities for the Universal List Dashboard.

## Responsibility

- Config compile/resolve and form preparation runner
- Pagination / infinite-list state (`applyInfiniteListPage`, `LoadGeneration`)
- Debounced search helper (`createDebouncedRunner`) — uses `setTimeout`, not `window`
- Filter/action visibility and submit decisions
- Preparation trigger aliasing (`list` → `init`, `create` → `createOpen`, …)
- Prepared context mapping (`filterOptions`, with `donorOptions` as a compatibility alias)

## Framework adapters

Angular components subscribe and forward UI events. React `useListDashboard` uses the same helpers. Route navigation stays in adapters (`ListRouteSync` / memory sync).

## Migration

- Do not put app-specific keys such as `donorOptions` into generic runtime. Set `preparation.contextBindings.filterOptionsKey` or populate `filterOptions` on the preparation context. `donorOptions` is still read as a fallback alias.

## Framework-only leftovers

- Angular Material sheets, CDK overlay, `ActivatedRoute` subscriptions, RxJS `loadPage` observables, and DOM infinite-scroll sentinels remain in adapters.


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
