import { InjectionToken, Provider, Type } from '@angular/core';

/** Host component contract for {@link ULD_DOCUMENT_LIST}. */
export interface UldDocumentListComponent {
  documents: readonly unknown[];
  showHeading?: boolean;
}

/** Host component contract for {@link ULD_FILE_UPLOAD}. */
export interface UldFileUploadComponent {
  allowedFileTypes?: string[];
  maxFileSize?: number;
  files: unknown;
}

export const ULD_DOCUMENT_LIST = new InjectionToken<Type<UldDocumentListComponent>>(
  'ULD_DOCUMENT_LIST',
);

export const ULD_FILE_UPLOAD = new InjectionToken<Type<UldFileUploadComponent>>(
  'ULD_FILE_UPLOAD',
);

export interface UniversalListDashboardRootConfig {
  documentListComponent: Type<UldDocumentListComponent>;
  fileUploadComponent: Type<UldFileUploadComponent>;
}

export const ULD_ROOT_CONFIG = new InjectionToken<UniversalListDashboardRootConfig>(
  'ULD_ROOT_CONFIG',
);

/** Minimal `EventEmitter`/`Observable` shape consumed by the custom step host. */
export interface ListFormCustomStepOutput<TData = unknown> {
  subscribe(listener: (value: TData) => void): { unsubscribe(): void };
}

/**
 * Component contract for a custom stepper step registered through
 * {@link LIST_FORM_CUSTOM_STEP_RENDERERS}:
 *
 * - `@Input() data` — receives the current custom-step data for its step id
 * - `@Output() dataChange` — emits the edited data back to the flow
 * - `validate(): boolean` — optional gate for Next/Save; a missing method is
 *   treated as always valid
 */
export interface ListFormCustomStepComponent<TData = unknown> {
  data?: TData;
  dataChange?: ListFormCustomStepOutput<TData>;
  validate?(): boolean;
}

export interface ListFormCustomStepRenderer<TData = unknown> {
  /** Matches `customSteps[stepId].rendererKey` in the flow config. */
  rendererKey: string;
  component: Type<ListFormCustomStepComponent<TData>>;
}

/** Multi-provider registry mapping a framework-neutral renderer key to a component. */
export const LIST_FORM_CUSTOM_STEP_RENDERERS = new InjectionToken<
  readonly ListFormCustomStepRenderer[]
>('LIST_FORM_CUSTOM_STEP_RENDERERS');

export function provideListFormCustomStepRenderer<TData>(
  rendererKey: string,
  component: Type<ListFormCustomStepComponent<TData>>,
): Provider {
  return {
    provide: LIST_FORM_CUSTOM_STEP_RENDERERS,
    multi: true,
    useValue: { rendererKey, component } satisfies ListFormCustomStepRenderer<TData>,
  };
}
