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
import { FormStepperEngine } from '@ssdev-toolkit/forms-core';
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

  protected stepDefinition: FormDefinition = { id: '', key: '', label: '', description: null, fields: [] };
  protected stepInitialValues: FormValues = {};
  private lastEmittedStateKey = '';
  /** Bumped on each step refresh so cf-form is destroyed/recreated (starts at 0 = not mounted). */
  protected stepFormKey = 0;

  private readonly engine = new FormStepperEngine<T>();

  constructor(private readonly cdr: ChangeDetectorRef) {}

  protected get currentStepId(): T {
    return this.engine.currentStepIdValue;
  }

  protected get activeStepIds(): T[] {
    return this.engine.activeStepIds;
  }

  protected get stepIndex(): number {
    return this.engine.stepIndex;
  }

  protected get isFirstStep(): boolean {
    return this.engine.getState().isFirstStep;
  }

  protected get isLastStep(): boolean {
    return this.engine.getState().isLastStep;
  }

  protected get currentStepLabel(): string {
    return this.engine.currentStepLabel;
  }

  protected get preparing(): boolean {
    return this.engine.preparingValue;
  }

  protected get nextButtonLabel(): string {
    if (this.submitting) return this.submittingLabel;
    if (this.preparing) return this.preparingLabel;
    return this.isLastStep ? this.completeLabel : this.nextLabel;
  }

  protected get currentStepKind(): 'form' | 'custom' {
    return this.engine.currentStepKind;
  }

  protected get customStepTemplate() {
    return this.customStepTemplates?.find(t => t.stepId === this.currentStepId)?.template;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.engine.updateHooks({
      steps: this.steps,
      resolveSteps: this.resolveSteps,
      validateStep: this.validateStep,
      prepareStep: this.prepareStep,
    });
    if (changes['initialValues'] && !changes['initialValues'].firstChange) {
      const previous = changes['initialValues'].previousValue as FormValues | undefined;
      const current = changes['initialValues'].currentValue as FormValues | undefined;
      if (previous && current && !this.engine.shouldResetForInitialValues(previous, current)) {
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
    const result = this.engine.requestBack();
    if (result.type === 'blocked') {
      return;
    }
    if (result.type === 'cancel') {
      if (this.allowCancel) {
        this.cancelled.emit();
      }
      return;
    }
    this.mergeCurrentStepValues();
    void this.goToStep(result.stepId);
  }

  async onNext(): Promise<void> {
    if (this.engine.currentStepKind === 'form' && !this.validateFormStep()) {
      return;
    }
    if (this.engine.currentStepKind === 'custom' && !this.validateCustomStep()) {
      return;
    }

    this.mergeCurrentStepValues();

    const result = this.engine.requestNext({
      formValid: true,
      customValid: true,
      validationMessage: this.validationErrorMessage,
    });
    if (result.type === 'blocked') {
      return;
    }
    if (result.type === 'invalid') {
      this.validationError.emit(result.message);
      return;
    }
    if (result.type === 'complete') {
      this.emitStepState();
      this.completed.emit(result.values);
      return;
    }
    await this.goToStep(result.stepId);
  }

  getValues(): FormValues {
    return this.engine.getValues();
  }

  protected onStepValuesChange(values: FormValues): void {
    const { stepChanged } = this.engine.setLiveStepValues(values);
    if (stepChanged) {
      this.refreshStepDefinition();
    }
    this.emitStepState();
  }

  private async goToStep(stepId: T): Promise<void> {
    const entered = await this.engine.enterStep(stepId, this.prepareStepErrorMessage);
    this.emitStepState();
    this.cdr.markForCheck();
    if (!entered.ok) {
      if ('error' in entered && entered.error) {
        this.validationError.emit(entered.error);
      }
      return;
    }

    this.refreshStepDefinition();
    this.stepChange.emit({ stepId: this.currentStepId, values: this.engine.getValues() });
    this.emitStepState();
  }

  private validateFormStep(): boolean {
    if (!this.stepForm?.validateForm()) {
      this.validationError.emit(this.validationErrorMessage);
      return false;
    }
    return true;
  }

  private validateCustomStep(): boolean {
    if (this.customStepValidator && !this.customStepValidator()) {
      this.validationError.emit(this.validationErrorMessage);
      return false;
    }
    return true;
  }

  private mergeCurrentStepValues(): void {
    this.customStepValidator = null;
    if (this.engine.currentStepKind === 'form' && this.stepForm) {
      this.engine.mergeFormStep(this.stepForm.getValues(), this.stepForm.getConditionHiddenKeys());
      return;
    }
    this.engine.clearLiveStepValues();
  }

  private resetSteps(): void {
    this.engine.configure({
      steps: this.steps ?? [],
      resolveSteps: this.resolveSteps,
      validateStep: this.validateStep,
      prepareStep: this.prepareStep,
      initialValues: this.initialValues,
    });
    this.refreshStepDefinition();
    this.emitStepState();
  }

  private refreshStepDefinition(): void {
    this.customStepValidator = null;
    this.engine.clearLiveStepValues();
    if (this.engine.currentStepKind === 'form') {
      this.stepDefinition = this.buildStepDefinition(this.currentStepId, this.engine.getValues());
      this.stepInitialValues = { ...this.engine.getValues() };
      this.stepFormKey += 1;
    } else {
      this.stepFormKey = 0;
    }
    this.cdr.markForCheck();
  }

  private emitStepState(): void {
    const state = this.engine.getState();
    const key = `${state.stepId}|${state.stepIndex}|${state.totalSteps}`
      + `|${state.isFirstStep}|${state.isLastStep}|${state.preparing}`;
    if (key === this.lastEmittedStateKey) {
      return;
    }
    this.lastEmittedStateKey = key;
    this.stepStateChange.emit(state);
  }
}
