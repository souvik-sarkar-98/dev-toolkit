import type {
  CustomFieldType,
  CustomFieldValueParsed,
  FormDefinition,
  FormEngineOptions,
  FormStep,
  FormValidationResult,
  FormValues,
  ResolvedField,
} from '@ssdev-toolkit/forms-core';
import type { ReactNode } from 'react';

export interface FieldRenderProps {
  field: ResolvedField;
  id: string;
  name: string;
  value: CustomFieldValueParsed;
  onChange: (value: CustomFieldValueParsed) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  engineOptions?: FormEngineOptions;
}

export type FieldComponent = (props: FieldRenderProps) => ReactNode;

export type CustomFormComponents = Partial<Record<CustomFieldType, FieldComponent>>;

export interface CustomFormClassNames {
  root?: string;
  field?: string;
  label?: string;
  control?: string;
  error?: string;
  requiredMark?: string;
  submit?: string;
  heading?: string;
  description?: string;
  /** Combined phone control (country + national number). */
  phoneGroup?: string;
  phoneCountry?: string;
  phoneNational?: string;
}

export interface UseCustomFormOptions {
  definition: FormDefinition;
  initialValues?: FormValues;
  engineOptions?: FormEngineOptions;
}

export interface UseCustomFormReturn {
  values: FormValues;
  resolvedFields: ResolvedField[];
  visibleFields: ResolvedField[];
  steps: FormStep[];
  fieldErrors: Record<string, string>;
  setValue: (key: string, value: CustomFieldValueParsed) => void;
  setValues: (partial: FormValues) => void;
  validate: () => FormValidationResult;
  reset: (initialValues?: FormValues) => void;
  getSubmitValues: () => FormValues;
}

export interface CustomFormProps {
  definition: FormDefinition;
  initialValues?: FormValues;
  engineOptions?: FormEngineOptions;
  components: CustomFormComponents;
  classNames?: CustomFormClassNames;
  idPrefix?: string;
  disabled?: boolean;
  hideHeading?: boolean;
  submitLabel?: string;
  onSubmit?: (values: FormValues) => void | Promise<void>;
  renderStep?: (step: FormStep, renderFields: () => ReactNode) => ReactNode;
}

export type { CustomFieldValueParsed, FormDefinition, FormValues, ResolvedField, FormStep };
