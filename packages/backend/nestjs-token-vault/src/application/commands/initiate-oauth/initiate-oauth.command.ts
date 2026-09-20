export class InitiateOAuthCommand {
  constructor(
    public readonly params: {
      provider: string;
      scopes: string[];
      /** The authenticated user initiating the flow — bound to the PKCE state for attribution. */
      ownerSub?: string;
      /** Optional caller-provided state; a cryptographically secure state is generated when omitted. */
      customState?: string;
    },
  ) {}
}
