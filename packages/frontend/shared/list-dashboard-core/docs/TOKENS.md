# List Dashboard CSS Tokens

Import package defaults once, then override in the host app:

```css
@import '@ssdev-toolkit/angular-list-dashboard/styles/list-dashboard.tokens.css';
/* or */
@import '@ssdev-toolkit/react-list-dashboard/styles/list-dashboard.tokens.css';

:root {
  --primary-500: #f97316;
  --uld-badge-success: #16a34a;
  --uld-icon-orange: #ffedd5;
}
```

## Required scales

- `--primary-50` … `--primary-800`
- `--secondary-400` … `--secondary-900`

## List UI tokens

| Token | Default role |
|---|---|
| `--uld-badge-success` | Success badge |
| `--uld-badge-warning` | Warning badge |
| `--uld-badge-danger` | Danger badge |
| `--uld-badge-neutral` | Neutral badge |
| `--uld-badge-primary` | Primary badge |
| `--uld-icon-orange` | Icon tone orange |
| `--uld-icon-blue` | Icon tone blue |
| `--uld-icon-green` | Icon tone green |
| `--uld-icon-red` | Icon tone red |
| `--uld-icon-amber` | Icon tone amber |
| `--uld-icon-indigo` | Icon tone indigo |
| `--uld-icon-neutral` | Icon tone neutral |
| `--uld-row-hover` | Row hover surface |
| `--uld-item-list-border` | `item_list` section border |
| `--uld-fab-size` | Floating action button diameter (48px, matches app shell FAB) |
| `--uld-fab-icon-size` | FAB glyph size |
| `--uld-fab-right` / `--uld-fab-right-mobile` | FAB right offset |
| `--uld-fab-bottom` / `--uld-fab-bottom-mobile` | FAB bottom offset (mobile clears bottom nav + safe area) |
| `--uld-fab-z-index` | FAB stacking order |

## forRoot boundary

`UniversalListDashboardModule.forRoot` registers only:

- `documentListComponent`
- `fileUploadComponent`

Nested collections (expense items, UPI details, etc.) use `type: 'item_list'`
in config view mapping — never forRoot component registration.
