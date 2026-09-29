# @ssdev-toolkit/angular-auth

## 1.1.1-beta.0

### Patch Changes

- a0519ab: Centralizes shared auth, forms, comment, and list-dashboard behavior into reusable core packages to align Angular and React adapters around the same logic.
  Adds typed, framework-agnostic guard/session primitives for RBAC loading, login redirect decisions, and redirect sanitization.
  Reworks mention autocomplete into a shared controller with debouncing, stale-response protection, and keyboard command handling.
  Moves multi-step form state management into a common stepper engine and standardizes submit-value extraction to omit hidden/conditional fields.
  Improves list dashboard behavior with shared pagination, search debounce, stale-load protection, and preparation context binding utilities.
  Tightens TypeScript contracts in the document generator packages (PDF/Excel interfaces and builder APIs).
  Preserves compatibility with legacy aliases/deprecations while moving runtime responsibilities into the core layer.

## 1.1.0

### Minor Changes

- 12b9e18: initial release

### Patch Changes

- 8c4f684: Centralizes shared auth, forms, comment, and list-dashboard behavior into reusable core packages to align Angular and React adapters around the same logic.
  Adds typed, framework-agnostic guard/session primitives for RBAC loading, login redirect decisions, and redirect sanitization.
  Reworks mention autocomplete into a shared controller with debouncing, stale-response protection, and keyboard command handling.
  Moves multi-step form state management into a common stepper engine and standardizes submit-value extraction to omit hidden/conditional fields.
  Improves list dashboard behavior with shared pagination, search debounce, stale-load protection, and preparation context binding utilities.
  Tightens TypeScript contracts in the document generator packages (PDF/Excel interfaces and builder APIs).
  Preserves compatibility with legacy aliases/deprecations while moving runtime responsibilities into the core layer.
- Updated dependencies [12b9e18]
  - @ssdev-toolkit/auth-core@1.1.0
