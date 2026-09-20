import { SetMetadata } from '@nestjs/common';
import { NotificationSpec } from '../../model/notification-spec';

/** Metadata flag used by CorrespondenceEventResolverRegistry to discover resolver providers. */
export const CORRESPONDENCE_EVENT_RESOLVER_METADATA =
  'correspondence:event-resolver';

/**
 * Marks a provider as a correspondence event resolver so the
 * CorrespondenceEventResolverRegistry can pick it up via DiscoveryService. The
 * provider must implement {@link ICorrespondenceEventResolver}.
 */
export const CorrespondenceEventResolver = (): ClassDecorator =>
  SetMetadata(CORRESPONDENCE_EVENT_RESOLVER_METADATA, true);

/**
 * Maps a single domain event to notification specs. Implementations live in host
 * modules (co-located with the data they need — a resolver may inject repositories
 * for enrichment) and are auto-discovered by the correspondence package.
 *
 * Matching is by class reference (`eventType` vs `event.constructor`), so the
 * correspondence package never imports host event classes.
 */
export interface ICorrespondenceEventResolver<TEvent = unknown> {
  /** The event class this resolver handles. */
  readonly eventType: Function;
  /** Build the specs to dispatch for this event, or null to skip. */
  resolve(
    event: TEvent,
  ): Promise<NotificationSpec[] | null> | NotificationSpec[] | null;
}
