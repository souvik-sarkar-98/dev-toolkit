# `@ssdev-toolkit/nestjs-token-vault`

Encrypted OAuth account and token storage. Other modules obtain access tokens through `TokenVaultFacade` only.

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-token-vault
```

The host implements `IOAuthAccountRepository` / `IOAuthTokenRepository` and registers OAuth providers on `OAUTH_PROVIDER_REGISTRY`.

## What it does

- `TokenVaultModule.forRoot` / `forRootAsync`
- `TokenVaultFacade` — connect, callback, refresh, revoke
- Provider port: `IOAuthProvider` (`GOOGLE_SCOPES`, `MICROSOFT_SCOPES` helpers)
- Domain errors (`TokenExpiredError`, `InvalidCallbackStateError`, …)

Repository tokens are **host persistence only**.

## Usage

```ts
const token = await this.tokenVault.getAccessToken({
  provider: 'google',
  scope: GOOGLE_SCOPES.gmailReadonly,
  ownerSub,
});
```

Wire `OAUTH_ACCESS_TOKEN_PORT` from core to this facade so DMS/Gmail adapters can request tokens without importing the vault package’s repositories.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-token-vault
```

Overview: [root README](../../../README.md).
