import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { NotificationSpec } from '../../model/notification-spec';
import {
  ICorrespondenceEventResolver,
  CORRESPONDENCE_EVENT_RESOLVER_METADATA,
} from './correspondence-event-resolver';

/**
 * Discovers every provider marked with `@CorrespondenceEventResolver()` and indexes
 * them by the event class they handle. At dispatch time, resolves a published
 * event to its notification specs (flattening all matching resolvers).
 */
@Injectable()
export class CorrespondenceEventResolverRegistry implements OnModuleInit {
  private readonly logger = new Logger(CorrespondenceEventResolverRegistry.name);
  private readonly resolvers = new Map<Function, ICorrespondenceEventResolver[]>();

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit(): void {
    for (const wrapper of this.discovery.getProviders()) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;
      if (!Reflect.getMetadata(CORRESPONDENCE_EVENT_RESOLVER_METADATA, metatype)) {
        continue;
      }

      const resolver = instance as ICorrespondenceEventResolver;
      if (typeof resolver.resolve !== 'function' || !resolver.eventType) {
        this.logger.warn(
          `Provider ${metatype.name} is marked @CorrespondenceEventResolver but is malformed — skipping.`,
        );
        continue;
      }

      const list = this.resolvers.get(resolver.eventType) ?? [];
      list.push(resolver);
      this.resolvers.set(resolver.eventType, list);
    }

    this.logger.log(
      `Registered correspondence event resolvers for ${this.resolvers.size} event type(s).`,
    );
  }

  /** Returns specs for the given event, or null when no resolver matches. */
  async resolve(event: object): Promise<NotificationSpec[] | null> {
    const resolvers = this.resolvers.get(event.constructor);
    if (!resolvers?.length) return null;

    const specs: NotificationSpec[] = [];
    for (const resolver of resolvers) {
      const result = await resolver.resolve(event);
      if (result) specs.push(...result);
    }
    return specs.length ? specs : null;
  }
}
