import { MentionInput } from '../../../domain/repositories/mention-input';

export class AddCommentCommand {
  constructor(
    public readonly params: {
      content: string;
      entityType: string;
      entityId: string;
      parentId?: string;
      /** Full mention list from the client — { userId, displayName, email } */
      mentions: MentionInput[];
      authorId: string;
      /** Stored on Comment row — eliminates UserProfile join at read time */
      authorName: string;
      authorEmail: string;
      /** Resolved by the auth guard — no extra DB call */
      userPermissions: string[];
    },
  ) {}
}
