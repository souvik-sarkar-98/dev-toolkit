export class ArchiveUserNotificationCommand {
  constructor(
    public readonly userNotificationId: string,
    public readonly requestingUserId: string,
  ) {}
}
