import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  Optional,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { FormDefinition, FormEngineOptions, FormStep, FormValues } from '@ssdev-toolkit/forms-core';
import { isDateRangeValue } from '@ssdev-toolkit/forms-core';
import { CfFieldComponent } from './cf-field.component';
import { FormEngineService } from './form-engine.service';
import { CF_FORM_CLASS_NAMES, type CfFormClassNames } from './tokens';

function isSameFormValue(current: unknown, next: unknown): boolean {
  if (current === next) {
    return true;
  }
  if (isDateRangeValue(current) && isDateRangeValue(next)) {
    return current.startDate === next.startDate && current.endDate === next.endDate;
  }
  if (Array.isArray(current) && Array.isArray(next)) {
    return current.length === next.length && current.every((item, index) => item === next[index]);
  }
  return false;
}

@Component({
  selector: 'cf-form',
  standalone: true,
  imports: [CfFieldComponent, MatButtonModule],
  styleUrl: './cf-form.component.scss',
  providers: [FormEngineService],
  template: `
    <form
      class="cf-form mat-typography"
      [class]="classNames?.root"
      (submit)="onSubmit($event)"
      novalidate
      [attr.data-cf-form]="definition.key"
    >
      @if (!hideHeading && definition.label) {
        <h2 class="mat-headline-6 cf-form-title">{{ definition.label }}</h2>
      }
      @if (!hideHeading && definition.description) {
        <p class="cf-form-description">{{ definition.description }}</p>
      }

      @for (step of steps; track step.stepId) {
        <div class="cf-form-step" [attr.data-cf-step]="step.stepId || null">
          @if (step.stepName) {
            <h3 class="mat-title-medium cf-form-step-title">{{ step.stepName }}</h3>
          }
          @for (field of step.fields; track field.definition.id) {
            <cf-field
              [field]="field"
              [fieldId]="idPrefix + '-' + field.definition.key"
              [value]="formValuesSnapshot[field.definition.key] ?? null"
              [formValues]="formValuesSnapshot"
              [error]="fieldErrors[field.definition.key]"
              [classNames]="classNames ?? undefined"
              [engineOptions]="engineOptions"
              (valueChange)="setValue(field.definition.key, $event)"
            />
          }
        </div>
      }

      @if (showSubmit) {
        <button
          mat-flat-button
          color="primary"
          type="submit"
          class="cf-form-submit"
          [class]="classNames?.submit"
          [disabled]="submitting"
        >
          {{ submitting ? 'Submitting…' : submitLabel }}
        </button>
      }
    </form>
  `,
})
export class CfFormComponent implements OnChanges {
  @Input({ required: true }) definition!: FormDefinition;
  @Input() initialValues?: FormValues;
  @Input() engineOptions?: FormEngineOptions;
  @Input() idPrefix = 'cf';
  @Input() hideHeading = false;
  @Input() submitLabel = 'Submit';
  @Input() showSubmit = true;

  @Output() submitted = new EventEmitter<FormValues>();
  @Output() valuesChange = new EventEmitter<FormValues>();

  submitting = false;
  private engineReady = false;
  /** Stable reference for child fields — updated only when engine values change. */
  formValuesSnapshot: FormValues = {};

  constructor(
    private readonly engine: FormEngineService,
    @Optional() @Inject(CF_FORM_CLASS_NAMES) public classNames: CfFormClassNames | null,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.classNames = this.classNames ?? {};
  }

  /** Live visible steps — always read from the engine (conditional fields). */
  get steps(): FormStep[] {
    return this.engineReady ? this.engine.getSteps() : [];
  }

  /** Live field values — includes conditionally hidden fields. */
  get values(): FormValues {
    return this.engineReady ? this.engine.getValues() : {};
  }

  /** Live validation errors from the engine. */
  get fieldErrors(): Record<string, string> {
    return this.engineReady ? this.engine.getFieldErrors() : {};
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.definition) {
      return;
    }

    const definitionChanged = !!changes['definition'];
    const initialValuesChanged = !!changes['initialValues'];
    const engineOptionsChanged = !!changes['engineOptions'];

    // Same values must not skip a concurrent definition change (stepper step swaps).
    if (
      initialValuesChanged
      && !changes['initialValues'].firstChange
      && !definitionChanged
      && !engineOptionsChanged
    ) {
      const previous = changes['initialValues'].previousValue as FormValues | undefined;
      if (this.engineReady && previous && this.hasSameFormValues(previous, this.initialValues ?? {})) {
        return;
      }
    }

    if (initialValuesChanged || engineOptionsChanged) {
      this.initEngine(this.initialValues);
      return;
    }

    if (definitionChanged) {
      const previous = changes['definition'].previousValue as FormDefinition | undefined;
      const preserveValues = this.engineReady && previous && this.hasSameDefinitionStructure(previous, this.definition);
      if (preserveValues) {
        this.engine.updateDefinition(this.definition);
        this.cdr.markForCheck();
        return;
      }
      this.initEngine(this.engineReady ? this.engine.getValues() : this.initialValues);
    }
  }

  setValuesSilent(partial: FormValues): void {
    if (!this.engineReady) {
      return;
    }
    this.engine.setValues(partial);
    this.refreshFormValuesSnapshot();
    this.cdr.markForCheck();
  }

  setValue(key: string, value: FormValues[string]): void {
    const current = this.engine.getValues()[key];
    if (isSameFormValue(current, value)) {
      return;
    }
    this.engine.setValue(key, value);
    this.refreshFormValuesSnapshot();
    this.valuesChange.emit(this.formValuesSnapshot);
    this.cdr.markForCheck();
  }

  setFieldError(key: string, message: string): void {
    if (!this.engineReady) {
      return;
    }
    this.engine.setFieldError(key, message);
    this.cdr.markForCheck();
  }

  clearFieldError(key: string): void {
    if (!this.engineReady) {
      return;
    }
    this.engine.clearFieldError(key);
    this.cdr.markForCheck();
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const result = this.engine.validate();
    if (!result.valid) {
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    try {
      this.submitted.emit(this.engine.getSubmitValues());
      this.engine.reset();
      this.cdr.markForCheck();
    } finally {
      this.submitting = false;
    }
  }

  /** Visible field values — for embedded/filter forms without using submit. */
  getVisibleValues(): FormValues {
    return this.engine.getSubmitValues();
  }

  /** All field values held by the engine (includes conditionally hidden fields). */
  getValues(): FormValues {
    return this.engine.getValues();
  }

  /** Keys hidden by an unmet condition — drop these before submitting. */
  getConditionHiddenKeys(): string[] {
    return this.engineReady ? this.engine.getConditionHiddenKeys() : [];
  }

  /** Run validation and refresh field errors (for embedded save actions). */
  validateForm(): boolean {
    const result = this.engine.validate();
    this.cdr.detectChanges();
    return result.valid;
  }

  /** Reset the form engine and re-render fields. */
  resetForm(initialValues?: FormValues): void {
    this.engine.reset(initialValues);
    this.refreshFormValuesSnapshot();
    this.cdr.markForCheck();
  }

  private initEngine(initialValues?: FormValues): void {
    this.engine.init(this.definition, initialValues, this.engineOptions);
    this.engineReady = true;
    this.refreshFormValuesSnapshot();
    this.cdr.markForCheck();
  }

  private refreshFormValuesSnapshot(): void {
    this.formValuesSnapshot = this.engineReady ? this.engine.getValues() : {};
  }

  private hasSameDefinitionStructure(previous: FormDefinition, next: FormDefinition): boolean {
    if (previous.fields.length !== next.fields.length) {
      return false;
    }
    return previous.fields.every((field, index) => {
      const other = next.fields[index];
      return field.key === other.key && field.fieldType === other.fieldType;
    });
  }

  private hasSameFormValues(previous: FormValues, next: FormValues): boolean {
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    for (const key of keys) {
      if (!isSameFormValue(previous[key], next[key])) {
        return false;
      }
    }
    return true;
  }
}
