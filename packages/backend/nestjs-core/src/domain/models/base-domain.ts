/**
 * **BaseDomain — DDD Entity Base Class**
 *
 * In Domain-Driven Design (DDD), an **Entity** is a domain object that has a
 * distinct, continuous identity that persists across state changes and time.
 * Unlike Value Objects (which are defined by their attributes), an Entity is
 * defined by a thread of continuity and its **unique identifier**.
 *
 * ## DDD Entity Rules this class enforces
 *
 * - **Identity:** Every entity has a unique, immutable `id` (`#id` is set once
 *   in the constructor and never reassigned). Two entities are considered equal
 *   if and only if they share the same identity (`equals()` compares by `id`).
 *
 * - **Lifecycle tracking:** `createdAt` and `updatedAt` timestamps capture the
 *   entity's lifecycle. Subclasses call `touch()` whenever a meaningful state
 *   change occurs, keeping `updatedAt` current without exposing a public setter.
 *
 * - **Encapsulation:** Private fields (`#id`, `#createdAt`, `#updatedAt`) are
 *   accessible only through read-only getters, preventing external mutation and
 *   preserving the invariant that identity is immutable.
 *
 * - **Serialisation:** `toJson()` produces a plain, frozen snapshot of all
 *   getter-exposed state, traversing the prototype chain so that properties
 *   defined on any subclass level are included. Nested `BaseDomain` instances,
 *   `Date` objects, arrays, and plain objects are all converted recursively.
 *
 * @see AggregateRoot for the full comparison and lifecycle documentation.
 *
 * @typeParam T - The type of the entity's identifier (e.g. `string`, `number`,
 *   a strongly-typed `UserId` Value Object, etc.).
 */
export abstract class BaseDomain<T> {
  #id: T;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(id: T, createdAt?: Date, updatedAt?: Date) {
    this.#id = id;
    this.#createdAt = createdAt || new Date();
    this.#updatedAt = updatedAt || new Date();
  }

  /** The unique, immutable identity of this entity. */
  get id(): T {
    return this.#id;
  }

  /** Timestamp of when the entity was first created. */
  get createdAt(): Date {
    return this.#createdAt;
  }

  /** Timestamp of the last recorded state change (updated via `touch()`). */
  get updatedAt(): Date {
    return this.#updatedAt;
  }

  /**
   * Records a state-change timestamp.
   * Subclasses must call this inside any mutating method to keep `updatedAt`
   * consistent with actual domain changes, rather than relying on infrastructure.
   */
  protected touch(): void {
    this.#updatedAt = new Date();
  }

  /**
   * Identity-based equality check (DDD rule: entities are equal when their
   * identities are equal, regardless of attribute values).
   */
  public equals(entity?: BaseDomain<T>): boolean {
    if (!entity) return false;
    if (this === entity) return true;
    return this.id === entity.id;
  }

  /**
   * Produces a deep, frozen plain-object snapshot of this entity by walking
   * the prototype chain and collecting all getter-defined properties.
   */
  public toJson(): Record<string, any> {
    const result: Record<string, any> = {};
    let proto = Object.getPrototypeOf(this);

    while (proto && proto !== Object.prototype) {
      const descriptors = Object.getOwnPropertyDescriptors(proto);

      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (descriptor.get && key !== 'constructor') {
          result[key] = this.convert(Reflect.get(this, key));
        }
      }

      proto = Object.getPrototypeOf(proto);
    }

    return Object.freeze(result);
  }

  public toSnapshot<TSnapshot extends Record<string, any> = Record<string, any>>(): Readonly<TSnapshot> {
    return this.toJson() as Readonly<TSnapshot>;
  }

  private convert(value: any): any {
    if (value === null || value === undefined) return value;

    if (typeof value !== 'object') return value;

    if (value instanceof Date) return value.toISOString();

    if (Array.isArray(value)) {
      return value.map((v) => this.convert(v));
    }

    if (value instanceof BaseDomain) {
      return value.toJson();
    }

    if (Object.getPrototypeOf(value) === Object.prototype) {
      const obj: any = {};
      for (const [k, v] of Object.entries(value)) {
        obj[k] = this.convert(v);
      }
      return obj;
    }

    return value;
  }
}
