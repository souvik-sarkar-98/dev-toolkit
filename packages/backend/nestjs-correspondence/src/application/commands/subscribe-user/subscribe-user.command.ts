import { SubscribedVia } from '../../../domain/enums/subscribed-via.enum';
import { ChannelType } from '../../../domain/enums/channel-type.enum';
import { EmailRole } from '../../../domain/enums/email-role.enum';

export interface SubscribeChannelInput {
  channel: ChannelType;
  enabled?: boolean;
  emailRole?: EmailRole;
}

export class SubscribeUserCommand {
  constructor(
    public readonly userId: string,
    public readonly userEmail: string | undefined,
    public readonly resourceType: string,
    public readonly via: SubscribedVia = SubscribedVia.MANUAL,
    public readonly userName?: string,
    public readonly resourceId?: string,
    public readonly channels?: SubscribeChannelInput[],
  ) {}
}
