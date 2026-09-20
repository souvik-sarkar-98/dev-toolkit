export class CreateJsonDocumentCommand {
  constructor(
    public readonly params: {
      key: string;
      namespace: string;
      payload: Record<string, unknown>;
    },
  ) {}
}
