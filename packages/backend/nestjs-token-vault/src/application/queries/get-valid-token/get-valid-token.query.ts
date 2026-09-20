export class GetValidTokenQuery {
  constructor(
    public readonly params: {
      provider: string;
      /** Scope or scopes the token must contain (substring match). */
      scope?: string | string[];
      /** Optional email to scope selection to a specific account. */
      email?: string;
      /** Optional ownerSub to scope selection to a specific user's token. */
      ownerSub?: string;
      /** Direct token lookup — bypasses all other filters when provided. */
      tokenId?: string;
    },
  ) {}
}
