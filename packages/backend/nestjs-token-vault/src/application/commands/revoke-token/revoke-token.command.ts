export class RevokeTokenCommand {
  constructor(
    public readonly params: {
      tokenId: string;
      provider: string;
      /** The caller's sub — used for ownership enforcement on non-admin requests. */
      callerSub?: string;
      /** Admins with manage:oauth_token may revoke any token, not just their own. */
      isAdmin?: boolean;
    },
  ) {}
}
