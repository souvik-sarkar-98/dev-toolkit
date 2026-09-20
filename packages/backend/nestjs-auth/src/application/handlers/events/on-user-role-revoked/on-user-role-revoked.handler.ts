import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UserRoleRevokedEvent } from '../../../../domain/events/user-role-revoked.event';
import { IUserAccessPort } from '../../../ports/user-access.port';

@EventsHandler(UserRoleRevokedEvent)
@Injectable()
export class OnUserRoleRevokedHandler implements IEventHandler<UserRoleRevokedEvent> {
  constructor(@Inject(IUserAccessPort) private readonly rbac: IUserAccessPort) {}

  async handle(event: UserRoleRevokedEvent): Promise<void> {
    await this.rbac.invalidate(event.snapshot.idpSub);
  }
}
