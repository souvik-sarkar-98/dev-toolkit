import { BaseDomain } from './base-domain';
import { DomainEvent } from '../events/domain-event';

/**
 * **AggregateRoot — DDD Aggregate Root Base Class**
 *
 * Extends `BaseDomain<T>` with domain event collection and publication support.
 * Use this as the base for any entity that is the top-level consistency boundary
 * of an aggregate and must emit `DomainEvent`s when its state changes.
 *
 * @typeParam T - The type of the aggregate root's identifier.
 */
export abstract class AggregateRoot<T> extends BaseDomain<T> {
  #domainEvents: DomainEvent[] = [];

  /**
   * The ordered list of domain events raised during this aggregate's current
   * in-memory lifetime. Exposed as `ReadonlyArray` to prevent external mutation.
   */
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this.#domainEvents;
  }

  /**
   * Records a domain event that describes a meaningful state transition.
   * Call this inside domain methods **after** all invariants have been verified
   * and state has been updated.
   */
  public addDomainEvent(event: DomainEvent): void {
    this.#domainEvents.push(event);
  }

  /**
   * Clears the in-memory domain event queue.
   * Call from the application layer **after** events have been dispatched.
   */
  public clearEvents(): void {
    this.#domainEvents = [];
  }
}
