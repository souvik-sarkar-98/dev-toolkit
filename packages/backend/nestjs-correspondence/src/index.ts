// ── Module registration ────────────────────────────────────────────────────
export { CorrespondenceModule } from './correspondence.module';
export type {
  CorrespondenceModuleOptions,
  CorrespondenceAsyncOptions,
  CorrespondenceModuleOverrides,
} from './correspondence.module';
export { CORRESPONDENCE_OPTIONS } from './correspondence-options.token';
export type { ResourceTypeConfig } from './correspondence.schema';

// ── Email layout branding (host app supplies the look & feel) ────────────────
export {
  EmailThemeSchema,
  DEFAULT_EMAIL_THEME,
  resolveEmailTheme,
  type EmailThemeOptions,
  type ResolvedEmailTheme,
} from './email-theme';

// ── Shared correspondence vocabulary (recipient + channel types) ─────────────
export {
  type CorrespondenceRecipients,
  type TargetUsersRecipients,
  type TargetRolesRecipients,
  type TargetResourceRecipients,
  type InAppChannelOptions,
  type EmailChannelOptions,
  type PushChannelOptions,
  type CorrespondenceChannels,
  type NotificationAction,
} from './application/model/correspondence-types';

// ── Internal notification spec (built by resolvers / host adapters) ───────────
export type { NotificationSpec } from './application/model/notification-spec';

// ── Event-driven integration (host resolvers, discovered) ────────────────────
export {
  CorrespondenceEventResolver,
  type ICorrespondenceEventResolver,
} from './application/dispatch/inbound/correspondence-event-resolver';

// ── Facade integration (writes via CommandBus) ───────────────────────────────
export { CorrespondenceFacade } from './application/facade/correspondence.facade';

// ── Domain enums (needed by consumers when building events) ───────────────
export { ChannelType } from './domain/enums/channel-type.enum';
export { EmailRole } from './domain/enums/email-role.enum';
export { SubscriberType } from './domain/enums/subscriber-type.enum';
export { SubscribedVia } from './domain/enums/subscribed-via.enum';
export {
  NotificationType,
  NotificationPriority,
} from './domain/enums/notification-type.enum';

// ── Domain errors (consumers may catch these) ─────────────────────────────
export {
  NotificationNotFoundError,
  UserNotificationNotFoundError,
  SubscriptionNotFoundError,
  TemplateNotFoundError,
  NotificationAlreadyReadError,
  NotificationAlreadyArchivedError,
  TokenNotAvailableError,
  EmailDeliveryFailedError,
} from './domain/errors/correspondence.errors';

// ── Integration API ──────────────────────────────────────────────────────────
// Event-driven: implement @CorrespondenceEventResolver() providers in the owning
//   module; the EventBus subscriber resolves published events to specs.
// Facade: inject CorrespondenceFacade — dispatch(spec) for host adapters and
//   cron jobs that build their own NotificationSpec.
// Subscriptions / reads: dispatch exported commands/queries via CommandBus / QueryBus.
// Do not inject INotificationRepository or other correspondence repos from outside this package.

// ── Application commands (consumers may dispatch directly) ─────────────────
export { SubscribeUserCommand } from './application/commands/subscribe-user/subscribe-user.command';
export type { SubscribeChannelInput } from './application/commands/subscribe-user/subscribe-user.command';
export { SubscribeRoleCommand } from './application/commands/subscribe-role/subscribe-role.command';
export { UnsubscribeUserCommand } from './application/commands/unsubscribe-user/unsubscribe-user.command';
export { UnsubscribeRoleCommand } from './application/commands/unsubscribe-role/unsubscribe-role.command';
export { UpdateSubscriberEmailCommand } from './application/commands/update-subscriber-email/update-subscriber-email.command';
export { SendEmailCommand } from './application/commands/send-email/send-email.command';

// ── Application queries (consumers may dispatch directly) ──────────────────
export { GetUserNotificationsQuery } from './application/queries/get-user-notifications/get-user-notifications.query';
export { GetUnreadCountQuery } from './application/queries/get-unread-count/get-unread-count.query';
export { GetUserSubscriptionsQuery } from './application/queries/get-user-subscriptions/get-user-subscriptions.query';
export { GetResourceSubscribersQuery } from './application/queries/get-resource-subscribers/get-resource-subscribers.query';

// ── Application DTOs ──────────────────────────────────────────────────────
export { NotificationResponseDto } from './application/dtos/notification-response.dto';
export { UserNotificationResponseDto } from './application/dtos/user-notification-response.dto';
export { SubscriptionResponseDto, SubscriptionChannelDto } from './application/dtos/subscription-response.dto';

// ── Email dispatch input type (email composition service) ─────────────────
export type { EmailDispatchInput } from './application/dispatch/email-dispatch.service';

// ── Job classes (consumers may also dispatch directly for testing) ─────────
export { CorrespondenceDispatchJob } from './application/jobs/correspondence-dispatch.job';
export { PurgeNotificationsJob, PurgeSubscriptionsJob } from './application/jobs/retention.jobs';

// ── Domain repository tokens — **host persistence only** ─────────────────────
export { INotificationRepository } from './domain/repositories/notification.repository';
export { IUserNotificationRepository } from './domain/repositories/user-notification.repository';
export { IResourceSubscriptionRepository } from './domain/repositories/resource-subscription.repository';

// ── Domain port tokens (Symbol name = interface name — one import = token + type) ─
export { IEmailSenderPort } from './domain/ports/email-sender.port';
export { IPushNotificationPort } from './domain/ports/push-notification.port';
export { IDispatchQueuePort } from './domain/ports/dispatch-queue.port';
export { ITemplatePort } from './domain/ports/template.port';
export { ILayoutRendererPort } from './domain/ports/layout-renderer.port';
export type { EmailMessage, EmailAttachment } from './domain/ports/email-sender.port';
export type { PushNotificationPayload } from './domain/ports/push-notification.port';
export type { CorrespondenceDispatchPayload } from './domain/ports/dispatch-queue.port';
export type { EmailTemplateData, EmailLayoutData } from './domain/ports/template.port';

// ── JSON-store payload schemas ───────────────────────────────────────────────
export {
  EmailTemplatePayloadSchema,
  EmailLayoutDataSchema,
  type EmailTemplatePayload,
} from './email-template.schema';
