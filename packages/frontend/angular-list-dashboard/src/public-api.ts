/**
 * Public API for the Universal List Dashboard (Angular).
 */
export * from '@ssdev-toolkit/list-dashboard-core';

export { UniversalListDashboardModule } from './lib/universal-list-dashboard.module';
export {
  LIST_FORM_CUSTOM_STEP_RENDERERS,
  ULD_DOCUMENT_LIST,
  ULD_FILE_UPLOAD,
  ULD_ROOT_CONFIG,
  provideListFormCustomStepRenderer,
} from './lib/tokens';
export type {
  UniversalListDashboardRootConfig,
  UldDocumentListComponent,
  UldFileUploadComponent,
  ListFormCustomStepComponent,
  ListFormCustomStepOutput,
  ListFormCustomStepRenderer,
} from './lib/tokens';

export { setMobileSheetOpen } from './lib/utils/mobile-sheet-body-lock';
export { trackByIndex } from './lib/utils/track-by-index.util';

export { FilteredInfiniteListComponent } from './lib/components/filtered-infinite-list.component';
export { FilteredListPageComponent } from './lib/components/filtered-list-page/filtered-list-page.component';
export { ListDetailSheetComponent } from './lib/components/list-detail-sheet/list-detail-sheet.component';
export { ListDetailSectionsComponent } from './lib/components/list-detail-sections/list-detail-sections.component';
export { ListFilterSheetComponent } from './lib/components/list-filter-sheet/list-filter-sheet.component';
export { ListFilterToolbarComponent } from './lib/components/list-filter-toolbar/list-filter-toolbar.component';
export { ChipFilterBarComponent } from './lib/components/chip-filter-bar/chip-filter-bar.component';
export { ListRowCardComponent } from './lib/components/list-row-card/list-row-card.component';
export { InfiniteListRowComponent } from './lib/components/infinite-list-row/infinite-list-row.component';
export { AppliedFilterPillsComponent } from './lib/components/applied-filter-pills/applied-filter-pills.component';
export { InfiniteScrollSentinelDirective } from './lib/infinite-scroll-sentinel.directive';

export { FilteredListDashboardController } from './lib/filtered-list-dashboard.controller';
export type { FilteredListDashboardInitHooks, FilteredListDashboardInitOptions } from './lib/filtered-list-dashboard.controller';
export { FilteredListPageController } from './lib/filtered-list-page.controller';
export { ListDetailPageController } from './lib/list-detail-page.controller';
export { ListCreatePageController } from './lib/list-create-page.controller';
export { BulkEditPageController } from './lib/bulk-edit-page.controller';

export { ListRouteSync } from './lib/list-route-sync';
export type {
  ListRouteFilterBinding,
  ListRouteChipConfig,
  ListRouteState,
} from './lib/list-route-sync';
export { ListDetailRouteSync } from './lib/list-detail-route-sync';
export type { ListDetailRouteMode, ListDetailRouteSyncConfig, ListDetailRoutePending } from './lib/list-detail-route-sync';
export { ListCreateRouteSync, buildCreateRouteQuery, isCreateActionOpen } from './lib/list-create-route-sync';
export type {
  ListCreateRoutePresetBinding,
  ListCreateRouteSyncConfig,
  ListCreateRoutePending,
} from './lib/list-create-route-sync';

export { ListCreateSheetComponent } from './lib/list-create-sheet.component';
export {
  ListCreateStepperSheetComponent,
  /** Shared stepper host name — create, detail edit, bulk edit and action forms. */
  ListCreateStepperSheetComponent as ListFormStepperSheetComponent,
  type ListFormCustomStepDataChange,
} from './lib/list-create-stepper-sheet.component';
export { MobileFormSheetComponent } from './lib/mobile-form-sheet/mobile-form-sheet.component';
export { DynamicFileUploadComponent } from './lib/components/dynamic-file-upload.component';
export { ListFormCustomStepHostComponent } from './lib/components/list-form-custom-step-host.component';
export {
  ListActionFormController,
  type ListActionFormInitOptions,
  type ListActionFormSaved,
} from './lib/list-action-form.controller';

export { ListDashboardComponent } from './lib/components/list-dashboard/list-dashboard.component';
export {
  ListDashboardRuntime,
  LIST_BULK_EDIT_FORM_ID,
  LIST_DETAIL_EDIT_FORM_ID,
  type ListDashboardRuntimeHooks,
  type ListDashboardRuntimeInitOptions,
  type ListDashboardNotification,
  type ListDashboardNotificationLevel,
} from './lib/runtime/list-dashboard.runtime';
export { ListFormCache } from './lib/runtime/list-form-cache.service';
export { ListPreparationService } from './lib/runtime/list-preparation.service';
export {
  toListRowLinkEvent,
  type ListRowLinkEvent,
} from './lib/runtime/list-row-link';
export {
  ListRowTemplateDirective,
  ListFloatingActionsDirective,
  ListBulkActionsDirective,
  ListDetailFooterActionsDirective,
  ListDetailHeroDirective,
  ListDetailViewExtrasDirective,
  ListOverlayDirective,
  type ListRowTemplateContext,
  type ListActionsTemplateContext,
  type ListDetailActionsTemplateContext,
  type ListOverlayTemplateContext,
} from './lib/runtime/list-dashboard-templates';

export { readRouteRefData } from '@ssdev-toolkit/list-dashboard-core';
