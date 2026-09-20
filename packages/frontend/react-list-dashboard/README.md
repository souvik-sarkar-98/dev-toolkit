# `@ssdev-toolkit/react-list-dashboard`

React host for the same `ListDashboardConfig` used by
`@ssdev-toolkit/angular-list-dashboard`. The shared core is bundled into this
adapter; apps install this package (and `@ssdev-toolkit/react-forms` for filter
and create sheets).

## Setup

```tsx
import { ListDashboard } from '@ssdev-toolkit/react-list-dashboard';
import '@ssdev-toolkit/react-list-dashboard/styles/list-dashboard.tokens.css';
import '@ssdev-toolkit/react-list-dashboard/styles/list-dashboard.css';

export function DonationsPage({ config, refData }) {
  return <ListDashboard config={config} refData={refData} />;
}
```

For headless control (custom layout), use `useListDashboard` and render from
the returned controller.

## What this host covers

- Chip tabs, search (debounced), applied-filter pills, infinite **Load more**
- Row click → detail panel (`key_value`, `content`, `item_list`, `documents`)
- Filter and create sheets via `CustomForm` from `@ssdev-toolkit/react-forms`
- Floating, bulk, row-menu, and detail-footer actions (`operations` or built-in
  `openCreate` / `openDetail`)

Document list / file-upload widgets and Material sheets stay Angular-only.
Bind the same `ListDashboardConfig`; nested collections still use
`type: 'item_list'` sections.

## Public surface

- `ListDashboard`
- `useListDashboard`
- `createMemoryListRouteSync` (default when no router is bound)
- Core types and runtime (`ListDashboardConfig`, `ListDashboardRuntime`, …)

Config contract (chips, filters, detail sections, actions) is documented in the
[Angular developer guide](../angular-list-dashboard/docs/DEVELOPER-GUIDE.html);
this package binds the same `ListDashboardConfig`.
