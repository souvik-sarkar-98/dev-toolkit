import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CfFormComponent } from '@ssdev-toolkit/angular-forms';
import { ChipFilterBarComponent } from './components/chip-filter-bar/chip-filter-bar.component';
import { ListRowCardComponent } from './components/list-row-card/list-row-card.component';
import { InfiniteListRowComponent } from './components/infinite-list-row/infinite-list-row.component';
import { FilteredInfiniteListComponent } from './components/filtered-infinite-list.component';
import { ListFilterToolbarComponent } from './components/list-filter-toolbar/list-filter-toolbar.component';
import { AppliedFilterPillsComponent } from './components/applied-filter-pills/applied-filter-pills.component';
import { ListFilterSheetComponent } from './components/list-filter-sheet/list-filter-sheet.component';
import { ListDetailSectionsComponent } from './components/list-detail-sections/list-detail-sections.component';
import { ListDetailSheetComponent } from './components/list-detail-sheet/list-detail-sheet.component';
import { FilteredListPageComponent } from './components/filtered-list-page/filtered-list-page.component';
import { InfiniteScrollSentinelDirective } from './infinite-scroll-sentinel.directive';
import { MobileFormSheetComponent } from './mobile-form-sheet/mobile-form-sheet.component';
import { ListCreateSheetComponent } from './list-create-sheet.component';
import { ListCreateStepperSheetComponent } from './list-create-stepper-sheet.component';
import { DynamicFileUploadComponent } from './components/dynamic-file-upload.component';
import { ListFormCustomStepHostComponent } from './components/list-form-custom-step-host.component';
import {
  ULD_DOCUMENT_LIST,
  ULD_FILE_UPLOAD,
  ULD_ROOT_CONFIG,
  UniversalListDashboardRootConfig,
} from './tokens';

const DECLARATIONS = [
  ChipFilterBarComponent,
  ListRowCardComponent,
  InfiniteListRowComponent,
  FilteredInfiniteListComponent,
  ListFilterToolbarComponent,
  AppliedFilterPillsComponent,
  ListFilterSheetComponent,
  ListDetailSectionsComponent,
  ListDetailSheetComponent,
  FilteredListPageComponent,
  InfiniteScrollSentinelDirective,
  DynamicFileUploadComponent,
];

@NgModule({
  declarations: DECLARATIONS,
  imports: [
    CommonModule,
    NgComponentOutlet,
    MatCheckboxModule,
    CfFormComponent,
    MobileFormSheetComponent,
    ListCreateSheetComponent,
    ListCreateStepperSheetComponent,
    ListFormCustomStepHostComponent,
  ],
  exports: [
    ...DECLARATIONS,
    MobileFormSheetComponent,
    ListCreateSheetComponent,
    ListCreateStepperSheetComponent,
    ListFormCustomStepHostComponent,
  ],
})
export class UniversalListDashboardModule {
  static forRoot(
    config: UniversalListDashboardRootConfig,
  ): ModuleWithProviders<UniversalListDashboardModule> {
    return {
      ngModule: UniversalListDashboardModule,
      providers: [
        { provide: ULD_ROOT_CONFIG, useValue: config },
        { provide: ULD_DOCUMENT_LIST, useValue: config.documentListComponent },
        { provide: ULD_FILE_UPLOAD, useValue: config.fileUploadComponent },
      ],
    };
  }
}
