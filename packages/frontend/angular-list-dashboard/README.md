# `@ssdev-toolkit/angular-list-dashboard`

Angular host for config-driven list dashboards (list + chips + filters + detail +
create + bulk edit + preparation + declarative actions).

## Setup

```typescript
import { UniversalListDashboardModule } from '@ssdev-toolkit/angular-list-dashboard';

@NgModule({
  imports: [
    UniversalListDashboardModule.forRoot({
      documentListComponent: DocumentListComponent,
      fileUploadComponent: FileUploadComponent,
    }),
  ],
})
export class SharedModule {}
```

Import theme defaults (override in the host app as needed):

```css
@import '@ssdev-toolkit/angular-list-dashboard/styles/list-dashboard.tokens.css';
```

`forRoot` registers **only** DocumentList + FileUpload. Nested collections
(expense items, UPI details, etc.) use `type: 'item_list'` detail sections in
config view mapping — never additional forRoot components.

## Config-only page

```typescript
readonly config = createEntityListConfig({ data, authorization, notify });
readonly refData = readRouteRefData(inject(ActivatedRoute));
```

```html
<na-list-dashboard
  [config]="config"
  [refData]="refData"
  [routeContext]="routeContext"
  [forEventId]="forEventId">
  <ng-template listOverlay><!-- optional custom markup --></ng-template>
</na-list-dashboard>
```

Default rows render `ListRowItem` (`title`, `subtitleParts`, `metaLeft`,
`metaRight`, `badge`, `icon`). Subtitle `linkId` emits `rowLinkClick` and can
invoke `config.operations[linkId]`.

## Public surface

- `ListDashboardComponent` (`na-list-dashboard`)
- `ListDashboardRuntime`, form cache, preparation service
- Projection directives: `listRow`, `listBulkActions`, `listFloatingActions`,
  `listDetailFooterActions`, `listOverlay`
- Existing list/filter/detail/create sheet components
- `ListActionFormController` + shared stepper host (create, detail edit, bulk edit,
  `actionForms`) and `provideListFormCustomStepRenderer(rendererKey, component)`
  for `kind: 'custom'` steps

## Docs

- [Developer guide](./docs/DEVELOPER-GUIDE.html) (open in a browser)
- React host (same config): [`../react-list-dashboard/README.md`](../react-list-dashboard/README.md)
- Core ADR & tokens: [`../shared/list-dashboard-core/docs/`](../shared/list-dashboard-core/docs/) (internal shared library; types are also re-exported from this adapter)
