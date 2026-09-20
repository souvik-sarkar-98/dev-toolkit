import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChipFilter } from '@ssdev-toolkit/list-dashboard-core';

@Component({
  selector: 'app-chip-filter-bar',
  templateUrl: './chip-filter-bar.component.html',
  styleUrls: ['./chip-filter-bar.component.scss'],
  standalone: false,
})
export class ChipFilterBarComponent {
  @Input({ required: true }) chips: ChipFilter[] = [];
  @Input() activeId = '';
  @Output() chipSelect = new EventEmitter<string>();

  get visibleChips(): ChipFilter[] {
    return this.chips.filter(chip => !chip.hidden);
  }

  selectChip(chipId: string): void {
    if (chipId !== this.activeId) {
      this.chipSelect.emit(chipId);
    }
  }
}
