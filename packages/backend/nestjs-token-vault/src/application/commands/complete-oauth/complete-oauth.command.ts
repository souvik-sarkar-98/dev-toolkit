export class CompleteOAuthCommand {
  constructor(
    public readonly params: {
      provider: string;
      code: string;
      state: string;
    },
  ) {}
}
