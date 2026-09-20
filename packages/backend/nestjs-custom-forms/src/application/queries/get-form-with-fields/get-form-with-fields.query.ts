export class GetFormWithFieldsQuery {
  constructor(
    public readonly formId: string,
    public readonly userPermissions: string[],
  ) {}
}
