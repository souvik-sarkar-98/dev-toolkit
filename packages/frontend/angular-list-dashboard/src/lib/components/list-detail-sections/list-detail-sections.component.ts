import { Component, Inject, Input, Type } from '@angular/core';
import {
  ListDetailContentSection,
  ListDetailItemListItem,
  ListDetailItemListSection,
  ListDetailKeyValueSection,
  ListDetailSection,
} from '@ssdev-toolkit/list-dashboard-core';
import { ULD_DOCUMENT_LIST, UldDocumentListComponent } from '../../tokens';

@Component({
  selector: 'app-list-detail-sections',
  templateUrl: './list-detail-sections.component.html',
  styleUrls: ['./list-detail-sections.component.scss'],
  standalone: false,
})
export class ListDetailSectionsComponent {
  @Input() sections: ListDetailSection[] = [];

  constructor(
    @Inject(ULD_DOCUMENT_LIST) readonly documentListComponent: Type<UldDocumentListComponent>,
  ) {}

  toggleSection(
    section: ListDetailKeyValueSection | ListDetailContentSection | ListDetailItemListSection,
  ): void {
    section.collapsed = !section.collapsed;
  }

  trackSection(_index: number, section: ListDetailSection): string {
    return section.id;
  }

  trackField(_index: number, field: { label: string }): string {
    return field.label;
  }

  trackItemListItem(index: number, item: ListDetailItemListItem): string {
    return item.id ?? `${item.title}-${index}`;
  }
}
