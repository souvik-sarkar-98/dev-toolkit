# auth-core

Framework-agnostic identity/RBAC models, load session, and guard decisions.

## Responsibility

- `AuthUser` and RBAC snapshots (`effectivePermissions`, `effectiveRoles`)
- Authorization loading (`RbacSession`, `waitUntilLoaded`, `RbacNotLoadedError`)
- Guard decisions: allow / login / unauthorized / redirect
- Redirect sanitization (`sanitizeInternalRedirectUrl`)
- Login-to-RBAC sequence (`loadRbacAfterLogin`)

## Ports (implement in the adapter)

- `IdentityProvider` — is the user logged in
- `RbacLoader` — fetch/clear the snapshot
- `NavigationExecutor` — perform router navigation

Auth0 SDK calls, Angular DI, and Angular Router stay in `@ssdev-toolkit/angular-auth`.

```ts
import { decideAuthGuard, applyAuthGuardDecision } from '@ssdev-toolkit/auth-core';

await applyAuthGuardDecision(
  decideAuthGuard(loggedIn, requestedUrl),
  { goToLogin, goTo },
);
```

React Native should implement the ports against SecureStore / native navigation; core has no `window`.

## Migration

- `RbacNotLoadedError` now lives in core; Angular re-exports it.
- `sanitizeInternalRedirectUrl` in Angular still accepts `(url, fallback)` and passes `window.location.origin` when present.
