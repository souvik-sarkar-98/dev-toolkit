export class MarkUserNotificationReadCommand {
  constructor(
    public readonly userNotificationId: string,
    public readonly requestingUserId: string,
  ) {}
}
