export class GetSignedUrlQuery {
  constructor(
    readonly documentId: string,
    readonly userId: string,
    readonly userPermissions: string[],
  ) {}
}
