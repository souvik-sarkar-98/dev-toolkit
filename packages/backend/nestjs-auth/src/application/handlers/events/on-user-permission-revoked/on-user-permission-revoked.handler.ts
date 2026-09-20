import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UserPermissionRevokedEvent } from '../../../../domain/events/user-permission-revoked.event';
import { IUserAccessPort } from '../../../ports/user-access.port';

@EventsHandler(UserPermissionRevokedEvent)
@Injectable()
export class OnUserPermissionRevokedHandler
  implements IEventHandler<UserPermissionRevokedEvent>
{
  constructor(@Inject(IUserAccessPort) private readonly rbac: IUserAccessPort) {}

  async handle(event: UserPermissionRevokedEvent): Promise<void> {
    await this.rbac.invalidate(event.snapshot.idpSub);
  }
}
