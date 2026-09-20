export class ListAccountsQuery {
  constructor(
    public readonly params: {
      provider?: string;
      pageIndex?: number;
      pageSize?: number;
    },
  ) {}
}
