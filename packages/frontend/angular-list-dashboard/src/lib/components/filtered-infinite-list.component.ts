import {
  Component,
  ContentChild,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { AppliedListFilter, ChipFilter, ListRowItem } from '@ssdev-toolkit/list-dashboard-core';

export type ListSelectionInteraction = 'checkbox' | 'tap' | 'responsive';

@Component({
  selector: 'app-filtered-infinite-list',
  templateUrl: './filtered-infinite-list.component.html',
  styleUrls: ['./filtered-infinite-list.component.scss'],
  standalone: false,
})
export class FilteredInfiniteListComponent implements OnInit, OnChanges {
  @Input({ required: true }) chips: ChipFilter[] = [];
  @Input() activeChipId = '';
  @Input({ required: true }) items: ListRowItem[] = [];
  @Input() loading = false;
  @Input() loadingMore = false;
  @Input() hasMore = false;
  @Input() emptyMessage = 'No items found.';

  @Input() showToolbar = false;
  @Input() searchText = '';
  @Input() searchPlaceholder = 'Search by ID';
  @Input() filterCount = 0;
  @Input() appliedFilters: AppliedListFilter[] = [];

  @Input() selectable = false;
  @Input() selectedIds: readonly string[] = [];
  /** checkbox: always show checkboxes. tap: selection mode + row tap. responsive: tap below 640px. */
  @Input() selectionInteraction: ListSelectionInteraction = 'responsive';

  /** Optional override when the list is wrapped (e.g. by {@link FilteredListPageComponent}). */
  @Input() rowTemplateRef?: TemplateRef<{ $implicit: ListRowItem }>;
  @Input() rowTrailingTemplateRef?: TemplateRef<{ $implicit: ListRowItem }>;

  @ContentChild('rowTemplate', { read: TemplateRef })
  rowTemplate?: TemplateRef<{ $implicit: ListRowItem }>;

  @ContentChild('rowTrailing', { read: TemplateRef })
  rowTrailingTemplate?: TemplateRef<{ $implicit: ListRowItem }>;

  @Output() chipSelect = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();
  @Output() rowClick = new EventEmitter<ListRowItem>();
  @Output() rowLinkClick = new EventEmitter<{ item: ListRowItem; linkId: string }>();
  @Output() filterOpen = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() pillRemove = new EventEmitter<string>();
  @Output() selectedIdsChange = new EventEmitter<string[]>();
  @Output() selectionModeChange = new EventEmitter<boolean>();

  protected selectionModeActive = false;
  protected useTapInteraction = false;

  private longPressTimer?: ReturnType<typeof setTimeout>;
  private longPressHandled = false;

  ngOnInit(): void {
    this.syncInteractionMode();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectionInteraction']) {
      this.syncInteractionMode();
    }

    if (changes['selectedIds'] && this.selectedIds.length === 0) {
      this.selectionModeActive = false;
    }

    if (changes['selectable'] && !this.selectable) {
      this.exitSelectionMode(false);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.selectionInteraction === 'responsive') {
      this.syncInteractionMode();
    }
  }

  get selectedCount(): number {
    return this.selectedIds.length;
  }

  get allSelected(): boolean {
    return this.items.length > 0 && this.items.every(item => this.isSelected(item.id));
  }

  get isIndeterminate(): boolean {
    return this.selectedCount > 0 && !this.allSelected;
  }

  get resolvedRowTemplate(): TemplateRef<{ $implicit: ListRowItem }> | undefined {
    return this.rowTemplateRef ?? this.rowTemplate;
  }

  get resolvedRowTrailingTemplate(): TemplateRef<{ $implicit: ListRowItem }> | undefined {
    return this.rowTrailingTemplateRef ?? this.rowTrailingTemplate;
  }

  /** First fetch with no rows yet — panel-scoped centered spinner. */
  get initialLoading(): boolean {
    return this.loading && this.items.length === 0;
  }

  /** Chip/filter/search reload — keep stale rows, show top refresh bar. */
  get refreshing(): boolean {
    return this.loading && this.items.length > 0;
  }

  isSelected(id: string): boolean {
    return this.selectedIds.includes(id);
  }

  toggleSelection(item: ListRowItem, checked: boolean): void {
    const next = checked
      ? [...new Set([...this.selectedIds, item.id])]
      : this.selectedIds.filter(id => id !== item.id);
    this.selectedIdsChange.emit(next);
  }

  toggleAll(checked: boolean): void {
    if (!checked) {
      this.selectedIdsChange.emit([]);
      return;
    }

    const loadedIds = this.items.map(item => item.id);
    this.selectedIdsChange.emit([...new Set([...this.selectedIds, ...loadedIds])]);
  }

  clearSelection(): void {
    if (this.selectedCount) {
      this.selectedIdsChange.emit([]);
    }
  }

  enterSelectionMode(): void {
    if (!this.selectable || !this.useTapInteraction || this.selectionModeActive) {
      return;
    }

    this.selectionModeActive = true;
    this.selectionModeChange.emit(true);
  }

  exitSelectionMode(clearSelected = true): void {
    if (clearSelected) {
      this.clearSelection();
    }

    if (!this.selectionModeActive) {
      return;
    }

    this.selectionModeActive = false;
    this.selectionModeChange.emit(false);
  }

  onRowClick(item: ListRowItem): void {
    if (this.longPressHandled) {
      this.longPressHandled = false;
      return;
    }

    if (this.selectable && this.useTapInteraction && this.selectionModeActive) {
      this.toggleSelection(item, !this.isSelected(item.id));
      return;
    }

    this.rowClick.emit(item);
  }

  onRowPointerDown(item: ListRowItem): void {
    if (!this.selectable || !this.useTapInteraction || this.selectionModeActive) {
      return;
    }

    this.longPressHandled = false;
    this.longPressTimer = setTimeout(() => {
      this.longPressHandled = true;
      this.enterSelectionMode();
      this.toggleSelection(item, true);
    }, 450);
  }

  onRowPointerUp(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }

  private syncInteractionMode(): void {
    if (this.selectionInteraction === 'tap') {
      this.useTapInteraction = true;
      return;
    }

    if (this.selectionInteraction === 'checkbox') {
      this.useTapInteraction = false;
      this.selectionModeActive = false;
      return;
    }

    this.useTapInteraction = window.matchMedia('(max-width: 639px)').matches;
    if (!this.useTapInteraction) {
      this.selectionModeActive = false;
    }
  }
}
