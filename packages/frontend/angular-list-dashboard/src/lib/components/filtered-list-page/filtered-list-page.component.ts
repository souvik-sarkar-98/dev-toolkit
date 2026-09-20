import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { FilteredListPageController } from '../../filtered-list-page.controller';
import { ListFilterCriteria, ListRowItem } from '@ssdev-toolkit/list-dashboard-core';

@Component({
  selector: 'app-filtered-list-page',
  templateUrl: './filtered-list-page.component.html',
  styleUrls: ['./filtered-list-page.component.scss'],
  standalone: false,
})
export class FilteredListPageComponent<TCriteria extends ListFilterCriteria = ListFilterCriteria> {
  @Input({ required: true }) controller!: FilteredListPageController<TCriteria>;
  @Input() searchPlaceholder = 'Search by ID';
  @Input() emptyMessage = 'No items match this filter.';
  @Input() showToolbar = true;
  @Input() selectable = false;
  @Input() filterSheetTitle = 'Filters';

  @ContentChild('rowTemplate', { read: TemplateRef })
  rowTemplate?: TemplateRef<{ $implicit: ListRowItem }>;

  @ContentChild('rowTrailing', { read: TemplateRef })
  rowTrailing?: TemplateRef<{ $implicit: ListRowItem }>;

  @Output() rowClick = new EventEmitter<ListRowItem>();
  @Output() rowLinkClick = new EventEmitter<{ item: ListRowItem; linkId: string }>();
}
