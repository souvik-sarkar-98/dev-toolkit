export class GetJsonDocumentQuery {
  constructor(
    public readonly params:
      | { id: string; key?: never; namespace?: never }
      | { id?: never; key: string; namespace: string },
  ) {}
}
