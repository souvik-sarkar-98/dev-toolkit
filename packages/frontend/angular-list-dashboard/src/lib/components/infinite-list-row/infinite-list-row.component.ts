import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ListRowItem } from '@ssdev-toolkit/list-dashboard-core';

@Component({
  selector: 'app-infinite-list-row',
  templateUrl: './infinite-list-row.component.html',
  styleUrls: ['./infinite-list-row.component.scss'],
  standalone: false,
})
export class InfiniteListRowComponent {
  @Input({ required: true }) item!: ListRowItem;

  @Output() rowLinkClick = new EventEmitter<{ item: ListRowItem; linkId: string }>();

  onLinkClick(event: Event, linkId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.rowLinkClick.emit({ item: this.item, linkId });
  }
}
