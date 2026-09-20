import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-list-filter-toolbar',
  templateUrl: './list-filter-toolbar.component.html',
  styleUrls: ['./list-filter-toolbar.component.scss'],
  standalone: false,
})
export class ListFilterToolbarComponent {
  @Input() searchText = '';
  @Input() searchPlaceholder = 'Search by ID';
  @Input() filterCount = 0;

  @Output() searchChange = new EventEmitter<string>();
  @Output() filterOpen = new EventEmitter<void>();

  onSearchInput(value: string): void {
    this.searchChange.emit(value);
  }

  onFilterClick(): void {
    this.filterOpen.emit();
  }
}
