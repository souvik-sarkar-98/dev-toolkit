import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import type { FormDefinition, FormEngineOptions, FormValues } from '@ssdev-toolkit/forms-core';
import { CfFormComponent } from './cf-form.component';
import { CfFormStepperStepDirective } from './cf-form-stepper-step.directive';
import type {
  CfFormStepperBuildDefinition,
  CfFormStepperCustomStepValidator,
  CfFormStepperPrepareStep,
  CfFormStepperResolveSteps,
  CfFormStepperState,
  CfFormStepperStep,
  CfFormStepperStepChange,
  CfFormStepperValidateStep,
} from './cf-form-stepper.types';

@Component({
  selector: 'cf-form-stepper',
  standalone: true,
  imports: [CfFormComponent, NgTemplateOutlet],
  styleUrl: './cf-form-stepper.component.scss',
  template: `
    <div class="cf-form-stepper">
      <div class="cf-form-stepper__header">
        <h3 class="cf-form-stepper__title">{{ currentStepLabel }}</h3>
        <span class="cf-form-stepper__progress">
          Step {{ stepIndex + 1 }} of {{ activeStepIds.length }}
        </span>
      </div>

      @if (currentStepKind === 'form' && stepFormKey > 0) {
        <!--
          Remount via @for track when stepFormKey changes. Safe now that create initialValues
          are snapshotted/cached — avoids empty first paint (key starts at 0 until definition is ready).
        -->
        @for (renderKey of [stepFormKey]; track renderKey) {
          <cf-form
            #stepForm
            class="cf-form-stepper__form"
            [definition]="stepDefinition"
            [initialValues]="stepInitialValues"
            [engineOptions]="engineOptions"
            [hideHeading]="true"
            [showSubmit]="false"
            [idPrefix]="idPrefix + '-' + currentStepId"
            (valuesChange)="onStepValuesChange($event)">
          </cf-form>
        }
      }

      @if (currentStepKind === 'custom') {
        <div class="cf-form-stepper__custom">
          @if (customStepTemplate; as tpl) {
            <ng-container *ngTemplateOutlet="tpl"></ng-container>
          }
        </div>
      }

      @if (showInlineActions) {
        <ng-container *ngTemplateOutlet="actionsTpl"></ng-container>
      }
    </div>

    <!--
      Action bar template. Rendered inline by default; hosts that pin actions in a
      sheet footer set showInlineActions=false and project actionsTemplate instead.
    -->
    <ng-template #actionsTpl>
      <div class="cf-form-stepper__actions app-btn-group">
        @if (!isFirstStep || allowCancel) {
          <button
            type="button"
            class="app-btn app-btn--ghost cf-form-stepper__back"
            [disabled]="submitting || preparing"
            (click)="onBackOrCancel()">
            {{ isFirstStep ? cancelLabel : backLabel }}
          </button>
        }
        <button
          type="button"
          class="app-btn app-btn--primary cf-form-stepper__next"
          [disabled]="submitting || preparing"
          (click)="onNext()">
          {{ nextButtonLabel }}
        </button>
      </div>
    </ng-template>
  `,
})
export class CfFormStepperComponent<T extends string = string> implements OnChanges {
  @Input({ required: true }) steps!: CfFormStepperStep<T>[];
  @Input({ required: true }) buildStepDefinition!: CfFormStepperBuildDefinition<T>;
  @Input() resolveSteps?: CfFormStepperResolveSteps<T>;
  @Input() initialValues: FormValues = {};
  @Input() engineOptions?: FormEngineOptions;
  @Input() validateStep?: CfFormStepperValidateStep<T>;
  /** Awaited before a step is entered so its definition can be loaded on demand. */
  @Input() prepareStep?: CfFormStepperPrepareStep<T>;
  @Input() idPrefix = 'cf-stepper';
  @Input() allowCancel = true;
  @Input() submitting = false;
  @Input() backLabel = 'Back';
  @Input() nextLabel = 'Next';
  @Input() cancelLabel = 'Cancel';
  @Input() completeLabel = 'Save';
  @Input() submittingLabel = 'Saving…';
  @Input() preparingLabel = 'Loading…';
  @Input() validationErrorTitle = 'Validation';
  @Input() validationErrorMessage = 'Please fill all required fields before continuing.';
  @Input() prepareStepErrorMessage = 'Could not load the next step. Please try again.';
  /** When false, the action bar is not rendered inline; hosts project {@link actionsTemplate}. */
  @Input() showInlineActions = true;

  @Output() completed = new EventEmitter<FormValues>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() stepChange = new EventEmitter<CfFormStepperStepChange<T>>();
  @Output() stepStateChange = new EventEmitter<CfFormStepperState<T>>();
  @Output() validationError = new EventEmitter<string>();

  @ViewChild('stepForm') stepForm?: CfFormComponent;
  /** `descendants` lets hosts declare step templates inside `*ngFor`/`*ngIf` blocks. */
  @ContentChildren(CfFormStepperStepDirective, { descendants: true })
  customStepTemplates!: QueryList<CfFormStepperStepDirective>;

  /** Optional validator registered by custom step content. */
  customStepValidator: CfFormStepperCustomStepValidator | null = null;

  protected currentStepId!: T;
  protected stepDefinition: FormDefinition = { id: '', key: '', label: '', description: null, fields: [] };
  protected stepInitialValues: FormValues = {};
  protected formValues: FormValues = {};
  /** Live edits on the active form step (merged into resolveSteps before Next/Back). */
  private liveStepValues: FormValues = {};
  private lastEmittedStateKey = '';
  /** Bumped on each step refresh so cf-form is destroyed/recreated (starts at 0 = not mounted). */
  protected stepFormKey = 0;
  /** True while {@link prepareStep} resolves the step the user is moving to. */
  protected preparing = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  private get effectiveValues(): FormValues {
    return { ...this.formValues, ...this.liveStepValues };
  }

  protected get activeStepIds(): T[] {
    if (this.resolveSteps) {
      return this.resolveSteps(this.effectiveValues);
    }
    return this.steps.map(step => step.id);
  }

  protected get stepIndex(): number {
    return this.activeStepIds.indexOf(this.currentStepId);
  }

  protected get isFirstStep(): boolean {
    return this.stepIndex <= 0;
  }

  protected get isLastStep(): boolean {
    return this.stepIndex >= this.activeStepIds.length - 1;
  }

  protected get currentStepLabel(): string {
    return this.steps.find(step => step.id === this.currentStepId)?.label ?? '';
  }

  protected get nextButtonLabel(): string {
    if (this.submitting) return this.submittingLabel;
    if (this.preparing) return this.preparingLabel;
    return this.isLastStep ? this.completeLabel : this.nextLabel;
  }

  protected get currentStepKind(): 'form' | 'custom' {
    return this.steps.find(step => step.id === this.currentStepId)?.kind ?? 'form';
  }

  protected get customStepTemplate() {
    return this.customStepTemplates?.find(t => t.stepId === this.currentStepId)?.template;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValues'] && !changes['initialValues'].firstChange) {
      const previous = changes['initialValues'].previousValue as FormValues | undefined;
      const current = changes['initialValues'].currentValue as FormValues | undefined;
      if (previous && current && this.hasSameFormValues(previous, current)) {
        return;
      }
      this.resetSteps();
      return;
    }
    if (changes['steps'] || changes['initialValues']) {
      this.resetSteps();
    }
  }

  /** Register a validator from custom step content (cleared on step change). */
  registerCustomStepValidator(validator: CfFormStepperCustomStepValidator | null): void {
    this.customStepValidator = validator;
  }

  onBackOrCancel(): void {
    if (this.preparing) {
      return;
    }
    if (this.isFirstStep) {
      if (this.allowCancel) {
        this.cancelled.emit();
      }
      return;
    }
    this.mergeCurrentStepValues();
    void this.goToStep(this.activeStepIds[this.stepIndex - 1]);
  }

  async onNext(): Promise<void> {
    if (this.preparing || !this.validateCurrentStep()) {
      return;
    }

    this.mergeCurrentStepValues();

    const crossFieldError = this.validateStep?.(this.currentStepId, this.formValues);
    if (crossFieldError) {
      this.validationError.emit(crossFieldError);
      return;
    }

    if (this.isLastStep) {
      this.emitStepState();
      this.completed.emit(this.formValues);
      return;
    }

    await this.goToStep(this.activeStepIds[this.stepIndex + 1]);
  }

  getValues(): FormValues {
    return { ...this.formValues };
  }

  protected onStepValuesChange(values: FormValues): void {
    this.liveStepValues = { ...values };
    this.ensureCurrentStepInActiveIds();
    this.emitStepState();
  }

  private async goToStep(stepId: T): Promise<void> {
    if (this.prepareStep) {
      this.preparing = true;
      this.emitStepState();
      this.cdr.markForCheck();
      try {
        await this.prepareStep(stepId, { ...this.formValues });
      } catch {
        this.validationError.emit(this.prepareStepErrorMessage);
        return;
      } finally {
        this.preparing = false;
        this.emitStepState();
        this.cdr.markForCheck();
      }
    }

    this.currentStepId = stepId;
    this.refreshStepDefinition();
    this.stepChange.emit({ stepId: this.currentStepId, values: { ...this.formValues } });
    this.emitStepState();
  }

  private validateCurrentStep(): boolean {
    if (this.currentStepKind === 'form') {
      if (!this.stepForm?.validateForm()) {
        this.validationError.emit(this.validationErrorMessage);
        return false;
      }
      return true;
    }

    if (this.customStepValidator && !this.customStepValidator()) {
      this.validationError.emit(this.validationErrorMessage);
      return false;
    }

    return true;
  }

  private mergeCurrentStepValues(): void {
    this.customStepValidator = null;
    if (this.currentStepKind === 'form' && this.stepForm) {
      // Values from earlier steps are kept even when the current step does not
      // declare them, but condition-hidden fields must not reach the payload.
      const merged = { ...this.formValues, ...this.stepForm.getValues() };
      for (const key of this.stepForm.getConditionHiddenKeys()) {
        delete merged[key];
      }
      this.formValues = merged;
    }
    this.liveStepValues = {};
  }

  private resetSteps(): void {
    this.preparing = false;
    this.formValues = { ...this.initialValues };
    this.liveStepValues = {};
    const ids = this.activeStepIds;
    this.currentStepId = ids[0] ?? this.steps[0]?.id;
    this.refreshStepDefinition();
    this.emitStepState();
  }

  private refreshStepDefinition(): void {
    this.customStepValidator = null;
    this.liveStepValues = {};
    if (this.currentStepKind === 'form') {
      this.stepDefinition = this.buildStepDefinition(this.currentStepId, this.formValues);
      this.stepInitialValues = { ...this.formValues };
      // Start at 0 so the first mount happens only after stepDefinition is set (same CD).
      // Later bumps recreate the form when the step changes.
      this.stepFormKey += 1;
    } else {
      this.stepFormKey = 0;
    }
    this.cdr.markForCheck();
  }

  private ensureCurrentStepInActiveIds(): void {
    const ids = this.activeStepIds;
    if (!ids.length || ids.includes(this.currentStepId)) {
      return;
    }
    this.currentStepId = ids[0];
    this.refreshStepDefinition();
  }

  private emitStepState(): void {
    const ids = this.activeStepIds;
    const stepIndex = Math.max(0, ids.indexOf(this.currentStepId));
    const totalSteps = Math.max(ids.length, 1);
    const state: CfFormStepperState<T> = {
      stepId: this.currentStepId,
      stepIndex,
      totalSteps,
      isFirstStep: stepIndex <= 0,
      isLastStep: stepIndex >= totalSteps - 1,
      preparing: this.preparing,
    };
    const key = `${state.stepId}|${state.stepIndex}|${state.totalSteps}`
      + `|${state.isFirstStep}|${state.isLastStep}|${state.preparing}`;
    if (key === this.lastEmittedStateKey) {
      return;
    }
    this.lastEmittedStateKey = key;
    this.stepStateChange.emit(state);
  }

  private hasSameFormValues(a: FormValues, b: FormValues): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    return aKeys.every(key => Object.is(a[key], b[key]));
  }
}
