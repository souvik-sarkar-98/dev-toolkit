import { FormStatus } from '../../../domain/enums/form-status.enum';

export class ListFormsQuery {
  constructor(
    public readonly entityType: string | undefined,
    public readonly status: FormStatus | undefined,
    public readonly userId: string,
    public readonly userPermissions: string[],
  ) {}
}
