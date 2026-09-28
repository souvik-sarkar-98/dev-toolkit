import { Injectable } from '@angular/core';
import type {
  FormDefinition,
  FormEngineOptions,
  FormStep,
  FormValidationResult,
  FormValues,
  ResolvedField,
} from '@ssdev-toolkit/forms-core';
import { FormEngine } from '@ssdev-toolkit/forms-core';

@Injectable()
export class FormEngineService {
  private engine: FormEngine | null = null;

  init(definition: FormDefinition, initialValues?: FormValues, options?: FormEngineOptions): void {
    this.engine = new FormEngine(definition, initialValues, options);
  }

  private requireEngine(): FormEngine {
    if (!this.engine) {
      throw new Error('FormEngineService not initialized');
    }
    return this.engine;
  }

  getValues(): FormValues {
    return this.requireEngine().getValues();
  }

  setValue(key: string, value: FormValues[string]): void {
    this.requireEngine().setValue(key, value);
  }

  setValues(values: FormValues): void {
    this.requireEngine().setValues(values);
  }

  updateDefinition(definition: FormDefinition): void {
    this.requireEngine().updateDefinition(definition);
  }

  setFieldError(key: string, message: string): void {
    this.requireEngine().setFieldError(key, message);
  }

  clearFieldError(key: string): void {
    this.requireEngine().clearFieldError(key);
  }

  getResolvedFields(): ResolvedField[] {
    return this.requireEngine().getResolvedFields();
  }

  getVisibleFields(): ResolvedField[] {
    return this.requireEngine().getVisibleFields();
  }

  getConditionHiddenKeys(): string[] {
    return this.requireEngine().getConditionHiddenKeys();
  }

  getSteps(): FormStep[] {
    return this.requireEngine().getSteps();
  }

  validate(): FormValidationResult {
    return this.requireEngine().validate();
  }

  getFieldErrors(): Record<string, string> {
    return this.requireEngine().getFieldErrors();
  }

  getSubmitValues(): FormValues {
    return this.requireEngine().getSubmitValues();
  }

  reset(initialValues?: FormValues): void {
    this.requireEngine().reset(initialValues);
  }
}
