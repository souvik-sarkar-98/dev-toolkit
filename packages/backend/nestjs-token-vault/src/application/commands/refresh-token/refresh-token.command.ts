export class RefreshTokenCommand {
  constructor(
    public readonly params: {
      tokenId: string;
      provider: string;
    },
  ) {}
}
