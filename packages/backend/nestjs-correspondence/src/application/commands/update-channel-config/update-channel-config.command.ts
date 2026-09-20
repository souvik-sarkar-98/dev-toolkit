import { ChannelType } from '../../../domain/enums/channel-type.enum';
import { EmailRole } from '../../../domain/enums/email-role.enum';

export class UpdateChannelConfigCommand {
  constructor(
    public readonly subscriptionId: string,
    public readonly requestingUserId: string,
    public readonly channel: ChannelType,
    public readonly enabled: boolean,
    public readonly emailRole?: EmailRole,
  ) {}
}
