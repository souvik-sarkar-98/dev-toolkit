import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CfFormComponent } from '@ssdev-toolkit/angular-forms';
import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import { setMobileSheetOpen } from '../../utils/mobile-sheet-body-lock';

@Component({
  selector: 'app-list-filter-sheet',
  templateUrl: './list-filter-sheet.component.html',
  styleUrls: ['./list-filter-sheet.component.scss'],
  standalone: false,
})
export class ListFilterSheetComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() title = 'Filters';
  @Input() definition!: FormDefinition;
  @Input() initialValues: FormValues = {};

  @Output() closed = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() applied = new EventEmitter<FormValues>();

  @ViewChild(CfFormComponent) cfForm?: CfFormComponent;

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      setMobileSheetOpen(changes['open'].currentValue === true);
    }

    const openedNow = changes['open']?.currentValue === true && changes['open']?.previousValue !== true;
    if (this.definition && openedNow) {
      queueMicrotask(() => this.cfForm?.resetForm(this.initialValues));
      return;
    }

    // Keep an open sheet in sync when criteria defaults change (e.g. Reset).
    if (changes['initialValues'] && this.open && this.definition) {
      queueMicrotask(() => this.cfForm?.resetForm(this.initialValues));
    }
  }

  ngOnDestroy(): void {
    if (this.open) {
      setMobileSheetOpen(false);
    }
  }

  onBackdropClick(): void {
    this.closed.emit();
  }

  onReset(): void {
    // Clear the open form immediately. Parent also resets list criteria via (reset).
    this.cfForm?.resetForm({});
    this.reset.emit();
  }

  onApply(): void {
    if (!this.cfForm) {
      return;
    }
    this.applied.emit(this.cfForm.getVisibleValues());
  }
}
