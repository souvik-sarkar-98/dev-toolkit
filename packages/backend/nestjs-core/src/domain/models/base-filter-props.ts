/**
 * **ICriteria — DDD Specification / Criteria interface**
 *
 * Encapsulates a business rule or query predicate as a first-class domain object.
 *
 * @typeParam T - The domain type being evaluated.
 */
export interface ICriteria<T> {
  /** Returns `true` if `candidate` satisfies this criterion. */
  isSatisfiedBy(candidate: T): boolean;

  /** Combines this criterion with another using logical AND. */
  and(other: ICriteria<T>): ICriteria<T>;

  /** Combines this criterion with another using logical OR. */
  or(other: ICriteria<T>): ICriteria<T>;

  /** Returns the logical negation of this criterion. */
  not(): ICriteria<T>;
}

/**
 * **Criteria — Abstract DDD Specification base class**
 *
 * Provides default implementations of the boolean combinators (`and`, `or`,
 * `not`) so that concrete criteria only need to implement `isSatisfiedBy()`.
 *
 * @typeParam T - The domain type being evaluated.
 */
export abstract class Criteria<T> implements ICriteria<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: ICriteria<T>): ICriteria<T> {
    return new AndCriteria(this, other);
  }

  or(other: ICriteria<T>): ICriteria<T> {
    return new OrCriteria(this, other);
  }

  not(): ICriteria<T> {
    return new NotCriteria(this);
  }
}

/** @internal Composite: both left AND right must be satisfied. */
class AndCriteria<T> extends Criteria<T> {
  constructor(
    private readonly left: ICriteria<T>,
    private readonly right: ICriteria<T>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

/** @internal Composite: either left OR right must be satisfied. */
class OrCriteria<T> extends Criteria<T> {
  constructor(
    private readonly left: ICriteria<T>,
    private readonly right: ICriteria<T>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

/** @internal Negation: the inner criterion must NOT be satisfied. */
class NotCriteria<T> extends Criteria<T> {
  constructor(private readonly inner: ICriteria<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.inner.isSatisfiedBy(candidate);
  }
}

import { SortOrder } from './sort-order.enum';

/**
 * **BaseFilter — Query Criteria for repository pagination and filtering**
 *
 * Carries structured query parameters passed to a repository so the database
 * layer can build an efficient query (e.g. a SQL `WHERE` clause).
 *
 * @typeParam T - Shape of the domain-specific filter properties.
 */
export class BaseFilter<T> {
  /** Zero-based page index. `undefined` means "return all results" (no pagination). */
  readonly pageIndex?: number;

  /** Maximum number of records per page. `undefined` means "return all results". */
  readonly pageSize?: number;

  /** Column name to sort by. `undefined` defers to the repository's `defaultOrderBy()`. */
  readonly sortBy?: string;

  /** Sort direction. Defaults to `SortOrder.ASC` when `sortBy` is provided. */
  readonly sortDir?: SortOrder;

  /** Domain-specific filter properties used to build the query predicate. */
  readonly props?: T;

  constructor(
    props?: T,
    pageIndex?: number,
    pageSize?: number,
    sortBy?: string,
    sortDir?: SortOrder,
  ) {
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.sortBy = sortBy;
    this.sortDir = sortDir;
    this.props = props;
  }
}
