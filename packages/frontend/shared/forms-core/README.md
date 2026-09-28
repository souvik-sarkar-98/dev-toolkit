# forms-core

Framework-agnostic form engine. Safe for Node and React Native: no DOM, React, Angular, or router imports.

## Responsibility

- Field visibility, permissions, dependent options, defaults
- Validation (mandatory, regex, phone, date bounds, option membership)
- Canonical submit extraction (`getVisibleSubmitValues` / `FormEngine.getSubmitValues`)
- Submit serialization (`serializeFormSubmitValues`)
- Multi-step merge (`mergeStepValues`) and wizard control (`FormStepperEngine`)

## Framework adapters

- React: `@ssdev-toolkit/react-forms` (`useCustomForm`, `CustomForm`, `useFormStepper`)
- Angular: `@ssdev-toolkit/angular-forms` (`CfForm`, `FormEngineService`, `cf-form-stepper`)
- React Native: import this core (or the React adapter without Bootstrap CSS)

```ts
import { FormEngine, FormStepperEngine, serializeFormSubmitValues } from '@ssdev-toolkit/forms-core';

const engine = new FormEngine(definition, initialValues);
if (engine.validate().valid) {
  post(serializeFormSubmitValues(definition, engine.getSubmitValues()));
}
```

## Migration

- `serializePublicFormSubmitValues` remains as a deprecated alias of `serializeFormSubmitValues`.
- React `@ssdev-toolkit/react-forms/zod` `buildFormZodSchema` is deprecated. Canonical validation is `validateForm` / `FormEngine.validate`. The Zod helper does not encode visibility, dependent options, date bounds, phone emptiness, or permissions.

## Framework-only leftovers

- React/Angular field widgets, Material/Bootstrap styling, change detection, and `cf-form` remount keys stay in adapters.
