import { SubscribedVia } from '../../../domain/enums/subscribed-via.enum';
import { SubscribeChannelInput } from '../subscribe-user/subscribe-user.command';

export class SubscribeRoleCommand {
  constructor(
    public readonly roleName: string,
    public readonly resourceType: string,
    public readonly via: SubscribedVia,
    public readonly resourceId?: string,
    public readonly channels?: SubscribeChannelInput[],
  ) {}
}
