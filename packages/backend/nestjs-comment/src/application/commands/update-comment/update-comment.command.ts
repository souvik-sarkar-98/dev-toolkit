import { MentionInput } from '../../../domain/repositories/mention-input';

export class UpdateCommentCommand {
  constructor(
    public readonly params: {
      id: string;
      content: string;
      /** Full updated mention list — server diffs to detect new @mentions */
      mentions: MentionInput[];
      authorId: string;
      authorName: string;
      userPermissions: string[];
    },
  ) {}
}
