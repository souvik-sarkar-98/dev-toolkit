import type { PrismaClientLike } from "./base-prisma.service";

/**
 * Narrow contract for persistence layers. Exposes only the audited (possibly
 * extended) Prisma client — not the raw factory client or lifecycle hooks.
 *
 * Repositories should depend on this interface (via {@link BasePrismaService})
 * rather than injecting {@link PRISMA_CLIENT} or a bare `PrismaClient`.
 */
export interface AuditedDatabaseClient<
  TClient extends PrismaClientLike = PrismaClientLike,
> {
  readonly client: TClient;
}
