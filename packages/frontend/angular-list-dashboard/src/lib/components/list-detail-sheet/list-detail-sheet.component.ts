import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  Type,
  ViewChild,
} from '@angular/core';
import { ULD_FILE_UPLOAD, UldFileUploadComponent } from '../../tokens';
import { CfFormComponent } from '@ssdev-toolkit/angular-forms';
import type { FormDefinition, FormEngineOptions, FormValues } from '@ssdev-toolkit/forms-core';
import { setMobileSheetOpen } from '../../utils/mobile-sheet-body-lock';
import { ListFileUpload } from '@ssdev-toolkit/list-dashboard-core';
import {
  ListDetailField,
  ListDetailSection,
  ListDetailSheetMode,
} from '@ssdev-toolkit/list-dashboard-core';

@Component({
  selector: 'app-list-detail-sheet',
  templateUrl: './list-detail-sheet.component.html',
  styleUrls: ['./list-detail-sheet.component.scss'],
  standalone: false,
})
export class ListDetailSheetComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() mode: ListDetailSheetMode = 'view';
  @Input() title = 'Details';
  @Input() sections: ListDetailSection[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Input() primaryActionLabel?: string;

  /** Read-only context shown above the edit form. */
  @Input() editSummary: ListDetailField[] = [];
  @Input() editDefinition?: FormDefinition;
  @Input() editInitialValues: FormValues = {};
  @Input() editEngineOptions?: FormEngineOptions;
  @Input() editTitle?: string;

  /** Optional payment-proof upload shown below the edit form (e.g. paid donations). */
  @Input() editShowDocumentUpload = false;
  @Input() editDocumentUploadLabel = 'Payment proof';
  @Input() editDocumentUploadHint = 'Upload a supporting image or PDF';
  @Input() editDocumentUploadError?: string;
  @Input() editDocumentAllowedTypes: string[] = ['jpg', 'jpeg', 'png', 'pdf'];
  @Input() hasFooterActions = false;
  @Input() allowEditCancel = true;
  @Input() allowDismiss = true;
  @Input() hideEditForm = false;
  @Input() hideEditActions = false;

  @Output() closed = new EventEmitter<void>();
  @Output() primaryAction = new EventEmitter<void>();
  @Output() editSave = new EventEmitter<FormValues>();
  @Output() editCancel = new EventEmitter<void>();
  @Output() editValuesChange = new EventEmitter<FormValues>();
  @Output() editDocumentsChange = new EventEmitter<ListFileUpload[]>();

  @ViewChild(CfFormComponent) cfForm?: CfFormComponent;

  readonly fileUploadMaxSize = 2 * 1024 * 1024;

  constructor(
    @Inject(ULD_FILE_UPLOAD) readonly fileUploadComponent: Type<UldFileUploadComponent>,
  ) {}

  get sheetTitle(): string {
    if (this.mode === 'edit') {
      return this.editTitle ?? `${this.title} — Edit`;
    }
    return this.title;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      this.syncBodyLock(changes['open'].currentValue === true);
    }

    const enteredEdit = changes['mode']?.currentValue === 'edit'
      && changes['mode']?.previousValue !== 'edit';
    const openedInEdit = changes['open']?.currentValue === true && this.mode === 'edit';

    if (this.editDefinition && (enteredEdit || openedInEdit)) {
      queueMicrotask(() => this.cfForm?.resetForm(this.editInitialValues));
    }
  }

  ngOnDestroy(): void {
    if (this.open) {
      setMobileSheetOpen(false);
    }
  }

  onDismissClick(): void {
    if (this.mode === 'edit') {
      if (!this.allowEditCancel) {
        return;
      }
      this.editCancel.emit();
      return;
    }
    if (!this.allowDismiss) {
      return;
    }
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (!this.allowDismiss) {
      return;
    }
    this.onDismissClick();
  }

  onPrimaryAction(): void {
    this.primaryAction.emit();
  }

  onCancelEdit(): void {
    this.editCancel.emit();
  }

  onSaveEdit(): void {
    if (!this.cfForm || !this.cfForm.validateForm()) {
      return;
    }
    this.editSave.emit(this.cfForm.getVisibleValues());
  }

  onEditValuesChange(values: FormValues): void {
    this.editValuesChange.emit(values);
  }

  onEditDocumentsChange(files: ListFileUpload[]): void {
    this.editDocumentsChange.emit(files);
  }

  onFileUpload = (files: ListFileUpload[]): void => {
    this.onEditDocumentsChange(files);
  };

  trackSummaryField(_index: number, field: ListDetailField): string {
    return field.label;
  }

  private syncBodyLock(open: boolean): void {
    setMobileSheetOpen(open);
  }
}
