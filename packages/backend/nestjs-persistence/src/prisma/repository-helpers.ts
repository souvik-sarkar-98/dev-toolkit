/**
 * Detects a Prisma "known request" error without importing the consumer's
 * generated Prisma client. Prisma sets `name` to "PrismaClientKnownRequestError"
 * and exposes a string `code` (e.g. "P2025") on these errors.
 */
function isPrismaKnownRequestError(
  error: unknown,
): error is { name: string; code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "PrismaClientKnownRequestError" &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

/**
 * Detects a Prisma validation error via its `name`, again without depending on
 * the generated client.
 */
function isPrismaValidationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "PrismaClientValidationError"
  );
}

/**
 * Helper functions for repository operations
 */
export class RepositoryHelpers {
  /**
   * Build audit fields for create operations
   */
  static buildCreateAuditFields(): {
    createdAt: Date;
    updatedAt: Date;
    version: number;
  } {
    const now = new Date();
    return {
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }

  /**
   * Build audit fields for update operations
   */
  static buildUpdateAuditFields(currentVersion: number): {
    updatedAt: Date;
    version: number;
  } {
    return {
      updatedAt: new Date(),
      version: currentVersion + 1,
    };
  }

  /**
   * Build soft delete data
   */
  static buildSoftDeleteData(): {
    deletedAt: Date;
    updatedAt: Date;
  } {
    const now = new Date();
    return {
      deletedAt: now,
      updatedAt: now,
    };
  }

  /**
   * Add non-deleted filter to where clause
   */
  static addNonDeletedFilter<T extends { deletedAt?: Date | null }>(
    where?: T,
  ): T & { deletedAt: null } {
    return {
      ...(where ?? ({} as T)),
      deletedAt: null,
    } as T & { deletedAt: null };
  }

  /**
   * Build pagination options
   */
  static buildPaginationOptions(
    pageIndex?: number,
    pageSize?: number,
  ): { skip?: number; take?: number } {
    if (!pageSize) return {};

    return {
      take: pageSize,
      skip: pageIndex !== undefined ? pageIndex * pageSize : undefined,
    };
  }

  /**
   * Execute batch operations in chunks to avoid query size limits
   */
  static async executeBatch<T, R>(
    items: T[],
    batchSize: number,
    operation: (batch: T[]) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const result = await operation(batch);
      results.push(result);
    }

    return results;
  }

  /**
   * Build optimistic locking where clause
   */
  static buildOptimisticLockingWhere<T extends { id: string; version: number }>(
    entity: T,
  ): { id: string; version: number } {
    return {
      id: entity.id,
      version: entity.version,
    };
  }

  /**
   * Handle optimistic locking error
   */
  static isOptimisticLockingError(error: any): boolean {
    return (
      isPrismaKnownRequestError(error) &&
      error.code === "P2025" // Record not found (version mismatch)
    );
  }

  /**
   * Build include with dynamic relations
   */
  static buildDynamicInclude<T extends Record<string, any>>(
    baseInclude: T,
    additionalIncludes?: Partial<T>,
  ): T {
    if (!additionalIncludes) return baseInclude;

    return {
      ...baseInclude,
      ...additionalIncludes,
    };
  }

  /**
   * Build order by with multiple fields
   */
  static buildMultiFieldOrderBy<T>(
    fields: Array<{ field: keyof T; direction: "asc" | "desc" }>,
  ): Record<string, "asc" | "desc">[] {
    return fields.map(({ field, direction }) => ({
      [field as string]: direction,
    }));
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 100,
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on known non-retriable errors
        if (isPrismaValidationError(error)) {
          throw error;
        }

        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
