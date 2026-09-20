export class ListTokensQuery {
  constructor(
    public readonly params: {
      provider?: string;
      account?: string;
      ownerSub?: string;
      isAdmin?: boolean;
      pageIndex?: number;
      pageSize?: number;
    },
  ) {}
}
