# `@ssdev-toolkit/nestjs-correspondence`

Notifications across email, in-app, and push. Host apps brand email layouts and supply sender/push adapters.

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-queue @ssdev-toolkit/nestjs-correspondence
```

`CorrespondenceModule` **requires** a `queueModule` override (`QueueModule.forRoot` / `forRootAsync` from the host). Register email, push, template, and layout ports in the host. Persistence tokens (`INotificationRepository`, …) are host-only.

## What it does

- Event-driven: `@CorrespondenceEventResolver()` maps domain events to `NotificationSpec`
- Facade: `CorrespondenceFacade.dispatch(spec)` for cron/host adapters
- Subscriptions: `SubscribeUserCommand`, `UnsubscribeUserCommand`, …
- Reads: `GetUserNotificationsQuery`, `GetUnreadCountQuery`, …
- `EmailThemeSchema` / `DEFAULT_EMAIL_THEME` — host look-and-feel (no remote fonts/logos)
- JSON-store payload schemas for email templates

## Usage

```ts
CorrespondenceModule.forRoot({
  /* resource types, retention, … */
}, {
  queueModule: QueueModule.forRootAsync({ /* … */ }),
});
```

```ts
await this.correspondence.dispatch({
  /* NotificationSpec: recipients + channels */
});
```

Email **message** links (CTA, unsubscribe) are payload. Do not load remote fonts, logos, or tracking pixels as layout chrome.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-correspondence
```

Overview: [root README](../../../README.md).
