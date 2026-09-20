export class DeleteCommentCommand {
  constructor(
    public readonly params: {
      id: string;
      authorId: string;
      userPermissions: string[];
    },
  ) {}
}
