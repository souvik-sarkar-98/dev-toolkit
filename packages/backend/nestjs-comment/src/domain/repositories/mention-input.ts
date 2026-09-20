/** Data shape for a mention provided by the client at write time. */
export interface MentionInput {
  userId: string;
  displayName: string;
  email: string;
}
