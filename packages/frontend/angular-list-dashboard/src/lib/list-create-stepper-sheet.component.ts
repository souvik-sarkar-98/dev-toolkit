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
import type { FormEngineOptions, FormValues } from '@ssdev-toolkit/forms-core';
import type { ListFormCustomStepDef } from '@ssdev-toolkit/list-dashboard-core';
import {
  CfFormStepperComponent,
  CfFormStepperStepDirective,
  type CfFormStepperBuildDefinition,
  type CfFormStepperCustomStepValidator,
  type CfFormStepperPrepareStep,
  type CfFormStepperResolveSteps,
  type CfFormStepperState,
  type CfFormStepperStep,
  type CfFormStepperStepChange,
  type CfFormStepperValidateStep,
} from '@ssdev-toolkit/angular-forms';
import { MobileFormSheetComponent } from './mobile-form-sheet/mobile-form-sheet.component';
import { ListFormCustomStepHostComponent } from './components/list-form-custom-step-host.component';

export interface ListFormCustomStepDataChange {
  stepId: string;
  data: unknown;
}

interface ListFormCustomStepEntry {
  stepId: string;
  rendererKey: string;
}

/**
 * Shared stepper sheet host for create and config-driven action/edit form flows.
 * Custom steps are rendered by {@link ListFormCustomStepHostComponent} from the
 * `rendererKey` registry.
 */
@Component({
  selector: 'app-list-create-stepper-sheet',
  standalone: true,
  imports: [
    CommonModule,
    MobileFormSheetComponent,
    CfFormStepperComponent,
    CfFormStepperStepDirective,
    ListFormCustomStepHostComponent,
  ],
  templateUrl: './list-create-stepper-sheet.component.html',
  styleUrls: ['./list-create-stepper-sheet.component.scss'],
})
export class ListCreateStepperSheetComponent implements OnChanges {
  @Input() open = false;
  @Input() title = 'Create';
  @Input() hint?: string;
  @Input({ required: true }) steps!: CfFormStepperStep[];
  @Input({ required: true }) buildStepDefinition!: CfFormStepperBuildDefinition;
  @Input() resolveSteps?: CfFormStepperResolveSteps;
  @Input() validateStep?: CfFormStepperValidateStep;
  /** Awaited before a step is entered so its form can be loaded on demand. */
  @Input() prepareStep?: CfFormStepperPrepareStep;
  @Input() initialValues: FormValues = {};
  @Input() engineOptions?: FormEngineOptions;
  @Input() idPrefix = 'list-create-stepper';
  @Input() completeLabel = 'Create';
  @Input() backLabel = 'Back';
  @Input() nextLabel = 'Next';
  @Input() cancelLabel = 'Cancel';
  @Input() submittingLabel = 'Saving…';
  @Input() preparingLabel = 'Loading…';
  @Input() allowCancel = true;
  @Input() saving = false;
  /** Step id → renderer declaration for steps with `kind: 'custom'`. */
  @Input() customSteps?: Record<string, ListFormCustomStepDef>;
  /** Step id → current data handed to the matching custom step renderer. */
  @Input() customStepData?: Record<string, unknown>;

  @Output() dismissed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<FormValues>();
  @Output() stepChange = new EventEmitter<CfFormStepperStepChange>();
  @Output() validationError = new EventEmitter<string>();
  @Output() customStepDataChange = new EventEmitter<ListFormCustomStepDataChange>();

  @ViewChild(CfFormStepperComponent) stepper?: CfFormStepperComponent;

  protected stepperKey = 0;
  /** Snapshot at open so parent getter churn cannot reset the stepper mid-flow. */
  protected capturedInitialValues: FormValues = {};
  /** Live stepper position from `stepStateChange` (source of truth for the pinned footer). */
  protected stepState?: CfFormStepperState;

  private activeCustomStepHost?: ListFormCustomStepHostComponent;
  private customStepEntriesCache: ListFormCustomStepEntry[] = [];
  private customStepEntriesRef?: Record<string, ListFormCustomStepDef>;

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes && changes['open'].currentValue === true) {
      this.capturedInitialValues = { ...(this.initialValues ?? {}) };
      this.stepState = undefined;
      this.stepperKey += 1;
      return;
    }
    if ('initialValues' in changes && this.open) {
      // Ignore live parent re-emissions while open; values were captured on open.
      return;
    }
    if ('initialValues' in changes && !this.open) {
      this.capturedInitialValues = { ...(this.initialValues ?? {}) };
    }
  }

  registerCustomStepValidator(validator: CfFormStepperCustomStepValidator | null): void {
    this.stepper?.registerCustomStepValidator(validator);
  }

  /** Stable array so the step template `*ngFor` does not re-create views each cycle. */
  protected get customStepEntries(): ListFormCustomStepEntry[] {
    const steps = this.customSteps;
    if (!steps) {
      this.customStepEntriesRef = undefined;
      this.customStepEntriesCache = [];
      return this.customStepEntriesCache;
    }
    if (this.customStepEntriesRef !== steps) {
      this.customStepEntriesRef = steps;
      this.customStepEntriesCache = Object.entries(steps).map(([stepId, def]) => ({
        stepId,
        rendererKey: def.rendererKey,
      }));
    }
    return this.customStepEntriesCache;
  }

  protected trackCustomStep(_index: number, entry: ListFormCustomStepEntry): string {
    return entry.stepId;
  }

  protected customStepDataFor(stepId: string): unknown {
    return this.customStepData ? this.customStepData[stepId] : undefined;
  }

  protected onCustomStepData(stepId: string, data: unknown): void {
    this.customStepDataChange.emit({ stepId, data });
  }

  protected onCustomStepHostReady(host: ListFormCustomStepHostComponent): void {
    this.activeCustomStepHost = host;
    this.registerCustomStepValidator(() => host.validate());
  }

  protected onCustomStepHostClosed(host: ListFormCustomStepHostComponent): void {
    if (this.activeCustomStepHost === host) {
      this.activeCustomStepHost = undefined;
    }
  }

  protected onStepChange(event: CfFormStepperStepChange): void {
    // The stepper clears the validator on every step change; re-attach the active
    // custom host (hosts created later re-register themselves via `ready`).
    const host = this.activeCustomStepHost;
    if (host) {
      this.registerCustomStepValidator(() => host.validate());
    }
    this.stepChange.emit(event);
  }

  protected onStepState(state: CfFormStepperState): void {
    this.stepState = state;
  }

  protected get isFirstStep(): boolean {
    return this.stepState?.isFirstStep ?? true;
  }

  protected get isLastStep(): boolean {
    return this.stepState?.isLastStep ?? false;
  }

  protected get preparing(): boolean {
    return this.stepState?.preparing ?? false;
  }

  protected get nextLabelText(): string {
    if (this.saving) return this.submittingLabel;
    if (this.preparing) return this.preparingLabel;
    return this.isLastStep ? this.completeLabel : this.nextLabel;
  }

  protected onBack(): void {
    this.stepper?.onBackOrCancel();
  }

  protected onNext(): void {
    this.stepper?.onNext();
  }

  protected onDismissed(): void {
    this.dismissed.emit();
  }
}
