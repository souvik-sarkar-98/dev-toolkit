export class UpdateSubscriberEmailCommand {
  constructor(
    public readonly userId: string,
    public readonly newEmail: string,
  ) {}
}
