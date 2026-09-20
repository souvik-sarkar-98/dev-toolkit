import { InjectionToken, Type } from '@angular/core';
import type { CustomFieldType } from '@ssdev-toolkit/forms-core';

export interface CfFormClassNames {
  root?: string;
  field?: string;
  label?: string;
  control?: string;
  error?: string;
  requiredMark?: string;
  submit?: string;
  phoneGroup?: string;
  phoneCountry?: string;
  phoneNational?: string;
}

export interface CfFieldRenderer {
  fieldType: CustomFieldType;
}

export const CUSTOM_FORM_FIELD_RENDERERS = new InjectionToken<
  Partial<Record<CustomFieldType, Type<CfFieldRenderer>>>
>('CUSTOM_FORM_FIELD_RENDERERS');

export const CF_FORM_CLASS_NAMES = new InjectionToken<CfFormClassNames>('CF_FORM_CLASS_NAMES');
