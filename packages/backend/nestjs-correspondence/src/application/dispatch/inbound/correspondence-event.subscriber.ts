import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Subscription } from 'rxjs';
import { CorrespondenceEventResolverRegistry } from './correspondence-event-resolver.registry';
import { CorrespondenceOrchestrator } from '../correspondence-orchestrator';

/**
 * Subscribes to every event published on the CQRS EventBus, resolves each to
 * notification specs via the registry (a cheap Map lookup by constructor that
 * returns null for non-matches), and dispatches them through the orchestrator.
 *
 * In-process, single subscription — no dedupe needed. Errors are contained so a
 * single failing resolver/dispatch never tears down the subscription.
 */
@Injectable()
export class CorrespondenceEventSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CorrespondenceEventSubscriber.name);
  private subscription?: Subscription;

  constructor(
    private readonly eventBus: EventBus,
    private readonly registry: CorrespondenceEventResolverRegistry,
    private readonly orchestrator: CorrespondenceOrchestrator,
  ) {}

  onModuleInit(): void {
    this.subscription = this.eventBus.subscribe((event) => {
      void this.handle(event);
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private async handle(event: unknown): Promise<void> {
    if (!event || typeof event !== 'object') return;
    const name = event.constructor?.name ?? 'UnknownEvent';

    let specs: Awaited<ReturnType<CorrespondenceEventResolverRegistry['resolve']>>;
    try {
      specs = await this.registry.resolve(event);
    } catch (err) {
      this.logger.error(`Resolver failed for ${name}`, (err as Error).stack);
      return;
    }
    if (!specs?.length) return;

    for (const spec of specs) {
      try {
        await this.orchestrator.dispatch(spec);
      } catch (err) {
        this.logger.error(`Dispatch failed for ${name}`, (err as Error).stack);
      }
    }
  }
}
