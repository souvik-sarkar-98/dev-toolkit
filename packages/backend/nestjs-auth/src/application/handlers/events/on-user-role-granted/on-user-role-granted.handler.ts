import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UserRoleGrantedEvent } from '../../../../domain/events/user-role-granted.event';
import { IUserAccessPort } from '../../../ports/user-access.port';

@EventsHandler(UserRoleGrantedEvent)
@Injectable()
export class OnUserRoleGrantedHandler implements IEventHandler<UserRoleGrantedEvent> {
  constructor(@Inject(IUserAccessPort) private readonly rbac: IUserAccessPort) {}

  async handle(event: UserRoleGrantedEvent): Promise<void> {
    await this.rbac.invalidate(event.snapshot.idpSub);
  }
}
