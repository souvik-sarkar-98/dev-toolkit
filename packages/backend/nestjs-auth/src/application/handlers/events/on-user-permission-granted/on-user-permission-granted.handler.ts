import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UserPermissionGrantedEvent } from '../../../../domain/events/user-permission-granted.event';
import { IUserAccessPort } from '../../../ports/user-access.port';

@EventsHandler(UserPermissionGrantedEvent)
@Injectable()
export class OnUserPermissionGrantedHandler
  implements IEventHandler<UserPermissionGrantedEvent>
{
  constructor(@Inject(IUserAccessPort) private readonly rbac: IUserAccessPort) {}

  async handle(event: UserPermissionGrantedEvent): Promise<void> {
    await this.rbac.invalidate(event.snapshot.idpSub);
  }
}
