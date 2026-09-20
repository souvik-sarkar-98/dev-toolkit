export class PurgeNotificationsJob {
  constructor(public readonly payload: { retentionDays: number }) {}
}

export class PurgeSubscriptionsJob {
  constructor(public readonly payload: { retentionDays: number }) {}
}
