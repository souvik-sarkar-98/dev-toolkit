# `@ssdev-toolkit/nestjs-auth`

JWT, API keys, reCAPTCHA, throttling, and RBAC (roles, groups, permissions, scoped permissions).

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-auth
```

The host must register Prisma adapters for the auth repository tokens and provide cache (`ICACHE_PORT`). JWT verification, API-key hashing, and reCAPTCHA default adapters can be replaced via ports.

## What it does

- `AuthModule.forRoot` / `forRootAsync`
- Guards: `UnifiedAuthGuard`, `RolesGuard`, `PermissionsGuard`, `RoleGroupsGuard`, `ScopedPermissionsGuard`
- Decorators: `@Public()`, `@RequirePermissions()`, `@RequireRoles()`, `@RequireRoleGroups()`, `@RequirePermissionsInScope()`, `@UseApiKey()`, `@IgnoreCaptcha()`, `@CurrentUser()`, `@StrictThrottle()`
- `AuthFacade` and `IUserRolePort` for other modules (not raw repositories)

Repository tokens (`IRoleRepository`, `IApiKeyRepository`, …) are **host persistence only**.

## Usage

```ts
@RequirePermissions('donation:read')
@Get('donations')
list(@CurrentUser() user: AuthUser) { /* user.userId, not raw IdP sub in domain modules */ }
```

```ts
AuthModule.forRootAsync({
  imports: [PersistenceModule],
  useFactory: () => ({
    jwt: { /* issuer, audience, JWKS */ },
    // throttler, recaptcha, apiKey, …
  }),
});
```

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-auth
```

Overview: [root README](../../../README.md).
