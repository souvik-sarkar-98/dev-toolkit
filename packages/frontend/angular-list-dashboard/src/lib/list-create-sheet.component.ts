import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import type { FormDefinition, FormEngineOptions, FormValues } from '@ssdev-toolkit/forms-core';
import { CfFormComponent } from '@ssdev-toolkit/angular-forms';
import { MobileFormSheetComponent } from './mobile-form-sheet/mobile-form-sheet.component';

@Component({
  selector: 'app-list-create-sheet',
  standalone: true,
  imports: [CommonModule, MobileFormSheetComponent, CfFormComponent],
  templateUrl: './list-create-sheet.component.html',
  styleUrls: ['./list-create-sheet.component.scss'],
})
export class ListCreateSheetComponent implements OnChanges {
  @Input() open = false;
  @Input() title = 'Create';
  @Input() hint?: string;
  @Input() definition?: FormDefinition;
  @Input() initialValues: FormValues = {};
  @Input() engineOptions?: FormEngineOptions;
  @Input() idPrefix = 'list-create';
  @Input() saveLabel = 'Create';
  @Input() saving = false;

  @Output() dismissed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<FormValues>();
  /** Live field edits — action forms use these to refresh definition/values. */
  @Output() valuesChange = new EventEmitter<FormValues>();

  @ViewChild('createForm') createForm?: CfFormComponent;

  protected formKey = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes && changes['open'].currentValue === true) {
      this.formKey += 1;
    }
    if ('initialValues' in changes && changes['open']?.currentValue !== true) {
      this.formKey += 1;
    }
  }

  protected onDismissed(): void {
    this.dismissed.emit();
  }

  protected onSaveClick(): void {
    if (!this.createForm?.validateForm()) {
      return;
    }
    this.saved.emit(this.createForm.getValues());
  }
}
