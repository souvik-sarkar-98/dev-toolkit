import { Logger } from "@nestjs/common";
import {
  getTraceId,
  getUserContext,
} from "@ssdev-toolkit/nestjs-core";

const logger = new Logger("PrismaAudit");

/**
 * Prisma model names for the audit table (shared schema: AuditEntityChangeLog).
 * Extension handlers bypass these models to avoid recursive audit logging.
 */
const AUDIT_MODEL_NAMES = new Set(["AuditEntityChangeLog", "AuditLog"]);

function isAuditModel(model: string): boolean {
  return AUDIT_MODEL_NAMES.has(model);
}

export interface AuditExtensionOptions {
  failOnError?: boolean;
  /** Models for which UPDATE audits include pre-fetched old values. Default: none. */
  auditCaptureOldValuesModels?: string[];
}

/**
 * Creates a Prisma extension that logs create/update/upsert/delete operations
 * on the specified models to an `AuditEntityChangeLog` table.
 *
 * Pass the list of model names you want to audit via DatabaseModule.forRoot({ auditedModels }).
 */
export function createAuditExtension(
  auditedModels: string[],
  options: AuditExtensionOptions = {},
) {
  const auditedModelSet = new Set(auditedModels);
  const auditCaptureOldValuesModelSet = new Set(
    options.auditCaptureOldValuesModels ?? [],
  );

  return (client: any) => {
    return client.$extends({
      query: {
        $allModels: {
          async create({ model, args, query }: any) {
            if (isAuditModel(model)) return query(args);
            const result = await query(args);
            if (auditedModelSet.has(model)) {
              await logAudit(
                client,
                model,
                resolveEntityId(result),
                "CREATE",
                null,
                args.data,
                options,
              );
            }
            return result;
          },
          async update({ model, args, query }: any) {
            if (isAuditModel(model)) return query(args);
            const oldValues =
              auditedModelSet.has(model) &&
                auditCaptureOldValuesModelSet.has(model)
                ? await findExistingRecord(
                  client,
                  model,
                  args.where,
                  args.data,
                )
                : null;
            const result = await query(args);
            if (auditedModelSet.has(model)) {
              const entityId =
                resolveEntityId(args.where) ?? resolveEntityId(result);
              await logAudit(
                client,
                model,
                entityId,
                "UPDATE",
                oldValues,
                args.data,
                options,
              );
            }
            return result;
          },
          async upsert({ model, args, query }: any) {
            if (isAuditModel(model)) return query(args);
            const oldValues = auditedModelSet.has(model)
              ? await findExistingRecord(
                client,
                model,
                args.where,
                args.update,
              )
              : null;
            const result = await query(args);
            if (auditedModelSet.has(model)) {
              const entityId = resolveEntityId(result);
              const action = oldValues ? "UPDATE" : "CREATE";
              await logAudit(
                client,
                model,
                entityId,
                action,
                oldValues,
                action === "CREATE" ? args.create : args.update,
                options,
              );
            }
            return result;
          },
          async delete({ model, args, query }: any) {
            if (isAuditModel(model)) return query(args);
            const result = await query(args);
            if (auditedModelSet.has(model)) {
              const entityId =
                resolveEntityId(args.where) ?? resolveEntityId(result);
              await logAudit(
                client,
                model,
                entityId,
                "DELETE",
                (result as Record<string, unknown>) ?? null,
                null,
                options,
              );
            }
            return result;
          },
          async createMany({ model, args, query }: any) {
            if (isAuditModel(model)) return query(args);
            const result = await query(args);
            if (auditedModelSet.has(model)) {
              await logAudit(
                client,
                model,
                "bulk",
                "CREATE_MANY",
                null,
                { data: args.data, count: (result)?.count },
                options,
              );
            }
            return result;
          },
          async updateMany({ model, args, query }: any) {
            if (isAuditModel(model)) return query(args);
            const result = await query(args);
            // One audit row per bulk operation — not one row per affected record.
            if (auditedModelSet.has(model)) {
              await logAudit(
                client,
                model,
                "bulk",
                "UPDATE_MANY",
                { where: args.where },
                { data: args.data, count: (result)?.count },
                options,
              );
            }
            return result;
          },
          async deleteMany({ model, args, query }: any) {
            if (isAuditModel(model)) return query(args);
            const result = await query(args);
            // One audit row per bulk operation — not one row per affected record.
            if (auditedModelSet.has(model)) {
              await logAudit(
                client,
                model,
                "bulk",
                "DELETE_MANY",
                { where: args.where },
                { count: (result)?.count },
                options,
              );
            }
            return result;
          },
        },
      },
    });
  };
}

/**
 * Resolves an entity identifier from a Prisma `where`/result object. Supports a
 * simple `id`, and falls back to serialising composite/non-`id` primary keys so
 * the audit log records something meaningful instead of "unknown".
 */
function resolveEntityId(source: unknown): string | undefined {
  if (!source || typeof source !== "object") return undefined;
  const obj = source as Record<string, unknown>;
  if (obj.id !== undefined && obj.id !== null) return String(obj.id);
  const keys = Object.keys(obj);
  if (keys.length === 0) return undefined;
  // Composite/alternate key — serialise the identifying fields deterministically.
  try {
    return JSON.stringify(obj);
  } catch {
    return undefined;
  }
}

async function logAudit(
  client: any,
  model: string,
  entityId: string | undefined,
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  options: AuditExtensionOptions,
) {
  const userContext = getUserContext();
  const traceId = getTraceId();
  try {
    const auditDelegate = getAuditDelegate(client);
    if (!auditDelegate?.create) {
      throw new Error("Audit Prisma delegate not found on client");
    }
    await auditDelegate.create({
      data: {
        entityType: model,
        entityId: entityId || "unknown",
        action,
        userId: userContext?.userId || "system",
        userName: userContext?.userName || "System",
        oldValues: oldValues || {},
        newValues: newValues || {},
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        traceId,
      },
    });
  } catch (error) {
    logger.error(`Failed to create audit log for ${model}`, error);
    if (options.failOnError) {
      throw error;
    }
  }
}

async function findExistingRecord(
  client: any,
  model: string,
  where: Record<string, unknown> | undefined,
  dataFields?: Record<string, unknown> | undefined,
): Promise<Record<string, unknown> | null> {
  const delegate = getModelDelegate(client, model);
  if (!delegate?.findUnique || !where) {
    return null;
  }

  const select = buildSelectForOldValues(where, dataFields);
  return delegate.findUnique(
    select ? { where, select } : { where },
  );
}

/**
 * Builds a Prisma `select` for pre-update/upsert reads — only `where` key fields
 * plus fields being changed, to minimise payload while preserving audit context.
 */
function buildSelectForOldValues(
  where: Record<string, unknown> | undefined,
  dataFields?: Record<string, unknown> | undefined,
): Record<string, boolean> | undefined {
  const fields = new Set<string>();

  if (where) {
    for (const key of Object.keys(where)) {
      fields.add(key);
    }
  }

  if (dataFields) {
    for (const key of Object.keys(dataFields)) {
      fields.add(key);
    }
  }

  if (fields.size === 0) {
    return undefined;
  }

  const select: Record<string, boolean> = {};
  for (const field of fields) {
    select[field] = true;
  }
  return select;
}

function getAuditDelegate(client: any): any {
  return client.auditEntityChangeLog ?? client.auditLog;
}

function getModelDelegate(client: any, model: string): any {
  const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
  return client[delegateName];
}
