import { DynamicModule, Inject, Injectable, Module, ModuleMetadata, Optional, Provider } from '@nestjs/common';
import { DiscoveryModule, ModuleRef } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import {
  BaseDynamicModule,
  BaseModuleValidator,
  DynamicModuleAsyncOptions,
  IUserLookupPort,
  registerModuleValidator,
} from '@ssdev-toolkit/nestjs-core';
import { IUserRolePort } from '@ssdev-toolkit/nestjs-auth';
import { CorrespondenceOptionsSchema, type CorrespondenceModuleOptions } from './correspondence.schema';
import { CORRESPONDENCE_OPTIONS } from './correspondence-options.token';
import { INotificationRepository } from './domain/repositories/notification.repository';
import { IUserNotificationRepository } from './domain/repositories/user-notification.repository';
import { IResourceSubscriptionRepository } from './domain/repositories/resource-subscription.repository';
import { IEmailSenderPort } from './domain/ports/email-sender.port';
import { IPushNotificationPort } from './domain/ports/push-notification.port';
import { IDispatchQueuePort } from './domain/ports/dispatch-queue.port';
import { ITemplatePort } from './domain/ports/template.port';
import { ILayoutRendererPort } from './domain/ports/layout-renderer.port';

import { CorrespondenceOrchestrator } from './application/dispatch/correspondence-orchestrator';
import { SubscriptionResolutionService } from './application/dispatch/subscription-resolution.service';
import { EmailDispatchService } from './application/dispatch/email-dispatch.service';
import { RetentionSchedulerService } from './application/retention/retention-scheduler.service';

import { CorrespondenceEventResolverRegistry } from './application/dispatch/inbound/correspondence-event-resolver.registry';
import { CorrespondenceEventSubscriber } from './application/dispatch/inbound/correspondence-event.subscriber';
import { CorrespondenceFacade } from './application/facade/correspondence.facade';
import { DispatchSpecHandler } from './application/commands/dispatch-spec/dispatch-spec.handler';
import { SendEmailHandler } from './application/commands/send-email/send-email.handler';

import { MarkUserNotificationReadHandler } from './application/commands/mark-user-notification-read/mark-user-notification-read.handler';
import { MarkAllUserNotificationsReadHandler } from './application/commands/mark-all-user-notifications-read/mark-all-user-notifications-read.handler';
import { ArchiveUserNotificationHandler } from './application/commands/archive-user-notification/archive-user-notification.handler';
import { SubscribeUserHandler } from './application/commands/subscribe-user/subscribe-user.handler';
import { SubscribeRoleHandler } from './application/commands/subscribe-role/subscribe-role.handler';
import { UnsubscribeUserHandler } from './application/commands/unsubscribe-user/unsubscribe-user.handler';
import { UnsubscribeRoleHandler } from './application/commands/unsubscribe-role/unsubscribe-role.handler';
import { UpdateChannelConfigHandler } from './application/commands/update-channel-config/update-channel-config.handler';
import { UpdateSubscriberEmailHandler } from './application/commands/update-subscriber-email/update-subscriber-email.handler';
import { ResendPushHandler } from './application/commands/resend-push/resend-push.handler';

import { GetUserNotificationsHandler } from './application/queries/get-user-notifications/get-user-notifications.handler';
import { GetUnreadCountHandler } from './application/queries/get-unread-count/get-unread-count.handler';
import { GetNotificationsAdminHandler } from './application/queries/get-notifications-admin/get-notifications-admin.handler';
import { GetUserSubscriptionsHandler } from './application/queries/get-user-subscriptions/get-user-subscriptions.handler';
import { GetResourceSubscribersHandler } from './application/queries/get-resource-subscribers/get-resource-subscribers.handler';

import { GmailEmailAdapter } from './infrastructure/email/gmail-email.adapter';
import { SmtpEmailAdapter } from './infrastructure/email/smtp-email.adapter';
import { FallbackEmailAdapter } from './infrastructure/email/fallback-email.adapter';
import { HandlebarsLayoutRendererAdapter } from './infrastructure/templates/handlebars-layout-renderer.adapter';

import { OneSignalPushAdapter } from './infrastructure/push/onesignal-push.adapter';

import { CorrespondenceDispatchHandler } from './infrastructure/queue/correspondence-dispatch.handler';
import { PurgeNotificationsHandler } from './infrastructure/queue/purge-notifications.handler';
import { PurgeSubscriptionsHandler } from './infrastructure/queue/purge-subscriptions.handler';

import { UserNotificationController } from './presentation/controllers/user-notification.controller';
import { NotificationAdminController } from './presentation/controllers/notification-admin.controller';
import { SubscriptionController } from './presentation/controllers/subscription.controller';
import { EmailProviderController } from './presentation/controllers/email-provider.controller';

export type { CorrespondenceModuleOptions } from './correspondence.schema';

export interface CorrespondenceAsyncOptions
  extends DynamicModuleAsyncOptions<CorrespondenceModuleOptions> { }

export interface CorrespondenceModuleOverrides {
  /**
   * Host modules that export `IUserLookupPort` and/or `IUserRolePort`.
   * Both ports are @Optional — omit if user / role resolution is not needed.
   */
  imports?: ModuleMetadata['imports'];
  /** QueueModule dynamic module from the host (required for @QueueHandler processors). */
  queueModule?: DynamicModule;
}

const CORRESPONDENCE_MODULE_VALIDATOR = Symbol('CorrespondenceModule.internalValidator');

const USER_LOOKUP_PORT_MISSING_MSG =
  '[CorrespondenceModule] IUserLookupPort is not provided. ' +
  'User-targeted notifications and subscriber resolution by userId will be limited. ' +
  'Fix: import UserModule (exports IUserLookupPort) in CorrespondenceModule.forRoot() imports.';

const USER_ROLE_PORT_MISSING_MSG =
  '[CorrespondenceModule] IUserRolePort is not provided. ' +
  'Role-based subscription expansion will be skipped. ' +
  'Fix: import AuthModule before CorrespondenceModule — AuthModule registers IUserRolePort.';

@Injectable()
class CorrespondenceModuleValidator extends BaseModuleValidator {
  constructor(
    moduleRef: ModuleRef,
    @Optional() @Inject(IUserLookupPort) private readonly userLookup: IUserLookupPort | null,
    @Optional() @Inject(IUserRolePort) private readonly userRole: IUserRolePort | null,
  ) {
    super(moduleRef);
  }

  protected getModuleName(): string {
    return 'CorrespondenceModule';
  }

  protected validateModule(): void {
    this.requirePort(
      INotificationRepository,
      'Register INotificationRepository in PersistenceModule and import PersistenceModule before CorrespondenceModule.',
    );
    this.requirePort(
      IUserNotificationRepository,
      'Register IUserNotificationRepository in PersistenceModule and import PersistenceModule before CorrespondenceModule.',
    );
    this.requirePort(
      IResourceSubscriptionRepository,
      'Register IResourceSubscriptionRepository in PersistenceModule and import PersistenceModule before CorrespondenceModule.',
    );
    this.requirePort(
      ITemplatePort,
      'Register { provide: ITemplatePort, useClass: JsonStoreTemplateAdapter } in IntegrationsModule.',
    );
    this.requirePort(
      IDispatchQueuePort,
      'Register { provide: IDispatchQueuePort, useClass: QueueDispatchAdapter } in IntegrationsModule. Requires QueueModule.',
    );

    if (!this.userLookup) {
      this.warn(USER_LOOKUP_PORT_MISSING_MSG);
    }
    if (!this.userRole) {
      this.warn(USER_ROLE_PORT_MISSING_MSG);
    }
  }
}

@Module({})
export class CorrespondenceModule extends BaseDynamicModule {
  static forRoot(
    options: CorrespondenceModuleOptions,
    overrides: CorrespondenceModuleOverrides = {},
  ): DynamicModule {
    const validated = CorrespondenceModule.validateOptions(
      CorrespondenceOptionsSchema,
      options,
    );
    const optionsProvider = CorrespondenceModule.createOptionsProvider(
      CORRESPONDENCE_OPTIONS,
      CorrespondenceOptionsSchema,
      validated,
    );
    if (!overrides.queueModule) {
      throw new Error(
        '[CorrespondenceModule] queueModule override is required. Pass QueueModule.forRoot/forRootAsync from the host.',
      );
    }
    return CorrespondenceModule._build(
      [optionsProvider],
      overrides.queueModule,
      overrides.imports ?? [],
    );
  }

  static forRootAsync(
    options: CorrespondenceAsyncOptions,
    overrides: CorrespondenceModuleOverrides = {},
  ): DynamicModule {
    const optionsProvider = CorrespondenceModule.createAsyncOptionsProvider(
      CORRESPONDENCE_OPTIONS,
      CorrespondenceOptionsSchema,
      options,
    );
    if (!overrides.queueModule) {
      throw new Error(
        '[CorrespondenceModule] queueModule override is required. Pass QueueModule.forRoot/forRootAsync from the host.',
      );
    }
    return CorrespondenceModule._build(
      [optionsProvider],
      overrides.queueModule,
      options.imports ?? [],
    );
  }

  private static _build(
    optionsProviders: Provider[],
    queueModule: DynamicModule,
    extraImports: any[] = [],
  ): DynamicModule {
    return {
      module: CorrespondenceModule,
      imports: [...extraImports, CqrsModule, DiscoveryModule, queueModule],
      controllers: CorrespondenceModule.controllers,
      providers: CorrespondenceModule.providers(optionsProviders),
      exports: [CorrespondenceFacade],
    };
  }

  private static get controllers(): any[] {
    return [
      UserNotificationController,
      NotificationAdminController,
      SubscriptionController,
      EmailProviderController,
    ];
  }

  private static providers(
    optionsProviders: Provider[],
  ): Provider[] {
    return [
      ...optionsProviders,
      registerModuleValidator(CORRESPONDENCE_MODULE_VALIDATOR, CorrespondenceModuleValidator),

      GmailEmailAdapter,
      SmtpEmailAdapter,
      FallbackEmailAdapter,
      { provide: IEmailSenderPort, useClass: FallbackEmailAdapter },

      { provide: IPushNotificationPort, useClass: OneSignalPushAdapter },

      HandlebarsLayoutRendererAdapter,
      { provide: ILayoutRendererPort, useClass: HandlebarsLayoutRendererAdapter },

      CorrespondenceDispatchHandler,
      PurgeNotificationsHandler,
      PurgeSubscriptionsHandler,

      SubscriptionResolutionService,
      EmailDispatchService,
      RetentionSchedulerService,

      CorrespondenceOrchestrator,

      // Event-driven path: discover host resolvers, subscribe to the EventBus.
      CorrespondenceEventResolverRegistry,
      CorrespondenceEventSubscriber,

      // Facade path: dispatch(spec) via CommandBus.
      CorrespondenceFacade,
      DispatchSpecHandler,
      SendEmailHandler,

      MarkUserNotificationReadHandler,
      MarkAllUserNotificationsReadHandler,
      ArchiveUserNotificationHandler,
      SubscribeUserHandler,
      SubscribeRoleHandler,
      UnsubscribeUserHandler,
      UnsubscribeRoleHandler,
      UpdateChannelConfigHandler,
      UpdateSubscriberEmailHandler,
      ResendPushHandler,

      GetUserNotificationsHandler,
      GetUnreadCountHandler,
      GetNotificationsAdminHandler,
      GetUserSubscriptionsHandler,
      GetResourceSubscribersHandler,
    ];
  }
}
