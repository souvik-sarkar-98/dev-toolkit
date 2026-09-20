export class UpdateJsonDocumentCommand {
  constructor(
    public readonly params: {
      id: string;
      payload: Record<string, unknown>;
    },
  ) {}
}
