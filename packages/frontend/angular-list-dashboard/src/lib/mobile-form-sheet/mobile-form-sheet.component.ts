import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { setMobileSheetOpen } from '../utils/mobile-sheet-body-lock';

@Component({
  selector: 'app-mobile-form-sheet',
  templateUrl: './mobile-form-sheet.component.html',
  styleUrls: ['./mobile-form-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class MobileFormSheetComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() title = '';
  @Input() ariaLabel?: string;
  @Input() saving = false;
  @Input() saveLabel = 'Save';
  @Input() cancelLabel = 'Cancel';
  @Input() showSave = true;
  @Input() showCancel = true;
  @Input() showDefaultFooter = true;
  @Input() hint?: string;

  @Output() dismissed = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      setMobileSheetOpen(changes['open'].currentValue === true);
    }
  }

  ngOnDestroy(): void {
    if (this.open) {
      setMobileSheetOpen(false);
    }
  }

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  onCloseClick(): void {
    this.dismissed.emit();
  }

  onCancelClick(): void {
    this.cancel.emit();
    this.dismissed.emit();
  }

  onSaveClick(): void {
    this.save.emit();
  }
}
