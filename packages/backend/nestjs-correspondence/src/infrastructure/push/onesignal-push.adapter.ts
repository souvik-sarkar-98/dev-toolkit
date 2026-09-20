import { Inject, Injectable, Logger } from '@nestjs/common';
import * as OneSignal from '@onesignal/node-onesignal';
import { IPushNotificationPort, PushNotificationPayload } from '../../domain/ports/push-notification.port';
import { CORRESPONDENCE_OPTIONS } from '../../correspondence-options.token';
import type { CorrespondenceModuleOptions } from '../../correspondence.module';

@Injectable()
export class OneSignalPushAdapter implements IPushNotificationPort {
  private readonly logger = new Logger(OneSignalPushAdapter.name);
  private readonly client: OneSignal.DefaultApi;
  private readonly appId: string;

  constructor(
    @Inject(CORRESPONDENCE_OPTIONS)
    private readonly options: CorrespondenceModuleOptions,
  ) {
    this.appId = options.push?.oneSignal?.appId ?? '';
    const configuration = OneSignal.createConfiguration({
      restApiKey: options.push?.oneSignal?.apiKey ?? '',
    });
    this.client = new OneSignal.DefaultApi(configuration);
  }

  async send(payload: PushNotificationPayload): Promise<void> {
    if (!payload.userIds?.length) {
      this.logger.warn('OneSignalPushAdapter.send: no userIds provided, skipping.');
      return;
    }

    const notification = new OneSignal.Notification();
    notification.app_id = this.appId;
    notification.target_channel = 'push';
    notification.include_aliases = { external_id: payload.userIds };
    notification.headings = { en: payload.title };
    notification.contents = { en: payload.body };
    notification.data = payload.data;

    if (payload.imageUrl) {
      notification.chrome_web_image = payload.imageUrl;
      notification.big_picture = payload.imageUrl;
    }
    if (payload.data?.actionUrl) {
      notification.web_url = payload.data.actionUrl;
    }

    const response = await this.client.createNotification(notification);
    this.logger.log(
      `OneSignal push sent to ${payload.userIds.length} users. ` +
        `Response: ${JSON.stringify(response)}`,
    );
  }
}
