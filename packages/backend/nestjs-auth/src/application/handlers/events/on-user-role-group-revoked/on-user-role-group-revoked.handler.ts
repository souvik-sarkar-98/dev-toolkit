import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UserRoleGroupRevokedEvent } from '../../../../domain/events/user-role-group-revoked.event';
import { IUserAccessPort } from '../../../ports/user-access.port';

@EventsHandler(UserRoleGroupRevokedEvent)
@Injectable()
export class OnUserRoleGroupRevokedHandler implements IEventHandler<UserRoleGroupRevokedEvent> {
  constructor(@Inject(IUserAccessPort) private readonly rbac: IUserAccessPort) {}

  async handle(event: UserRoleGroupRevokedEvent): Promise<void> {
    await this.rbac.invalidate(event.snapshot.idpSub);
  }
}
