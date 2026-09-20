export class TestOAuthConnectionQuery {
  constructor(
    public readonly params: {
      provider: string;
      tokenId: string;
      callerSub?: string;
      isAdmin?: boolean;
    },
  ) {}
}
