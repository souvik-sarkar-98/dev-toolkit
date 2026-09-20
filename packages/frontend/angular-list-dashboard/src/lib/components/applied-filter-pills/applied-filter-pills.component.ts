import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppliedListFilter } from '@ssdev-toolkit/list-dashboard-core';

@Component({
  selector: 'app-applied-filter-pills',
  templateUrl: './applied-filter-pills.component.html',
  styleUrls: ['./applied-filter-pills.component.scss'],
  standalone: false,
})
export class AppliedFilterPillsComponent {
  @Input({ required: true }) filters: AppliedListFilter[] = [];

  @Output() remove = new EventEmitter<string>();

  onRemove(id: string): void {
    this.remove.emit(id);
  }
}
