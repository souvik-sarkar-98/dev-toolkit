import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UserRoleGroupGrantedEvent } from '../../../../domain/events/user-role-group-granted.event';
import { IUserAccessPort } from '../../../ports/user-access.port';

@EventsHandler(UserRoleGroupGrantedEvent)
@Injectable()
export class OnUserRoleGroupGrantedHandler implements IEventHandler<UserRoleGroupGrantedEvent> {
  constructor(@Inject(IUserAccessPort) private readonly rbac: IUserAccessPort) {}

  async handle(event: UserRoleGroupGrantedEvent): Promise<void> {
    await this.rbac.invalidate(event.snapshot.idpSub);
  }
}
