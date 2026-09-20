# `@ssdev-toolkit/nestjs-custom-forms`

Definition-driven forms and per-entity submissions. Field types align with the frontend forms libraries (`text`, `select`, `date_range`, …).

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-custom-forms
```

Ruleset JSON (for UI/backend contract): `@ssdev-toolkit/nestjs-custom-forms/schemas/custom-forms.ruleset.json`.

The host registers `IFormRepository` and `IFormSubmissionRepository`, and optionally `ICustomFormEntityAccessPort`.

## What it does

- `CustomFormsModule.forRoot` / `forRootAsync`
- `CustomFormsFacade` — submit, draft, load, validate, clear
- Canonical `CustomFieldType` enum
- Domain events (`FormPublishedEvent`, `FormSubmittedEvent`, …)

Repository tokens are **host persistence only**. Sibling modules should use the facade (or exported commands/queries), not the repositories.

## Usage

```ts
await this.customForms.submitForm({
  formId,
  entityType: 'donation',
  entityId,
  values,
  submittedById: user.userId,
  userPermissions,
});
```

Hidden/conditioned field values must not be stored as if they were submitted; validation follows the published definition.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-custom-forms
```

Overview: [root README](../../../README.md).
