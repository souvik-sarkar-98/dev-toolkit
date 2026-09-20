export class ResendPushCommand {
  constructor(
    public readonly userNotificationId: string,
    public readonly requestingUserId: string,
  ) {}
}
