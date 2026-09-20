export class GetCommentsQuery {
  constructor(
    public readonly params: {
      entityType: string;
      entityId: string;
      userId: string;
      userPermissions: string[];
      limit?: number;
      offset?: number;
    },
  ) {}
}
