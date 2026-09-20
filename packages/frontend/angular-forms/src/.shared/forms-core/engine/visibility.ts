import type {
  CustomFieldValueParsed,
  FormFieldDefinition,
  FormValues,
} from '../models/types.js';
import { evaluateCondition } from './condition.js';

export function canSeeFormField(field: FormFieldDefinition, userPermissions: string[]): boolean {
  const perms = field.viewPermissions ?? [];
  if (perms.length === 0) return true;
  const userPermSet = new Set(userPermissions);
  return perms.some((p) => userPermSet.has(p));
}

export function isFieldVisible(
  def: FormFieldDefinition,
  defByKey: Map<string, FormFieldDefinition>,
  values: FormValues,
  userPermissions: string[] = [],
): boolean {
  if (!def.enabled || def.isHidden) return false;
  if (!canSeeFormField(def, userPermissions)) return false;
  return isConditionSatisfied(def, defByKey, values, new Set([def.key]));
}

/**
 * Condition-hidden fields keep their values, so a child must also follow the
 * whole ancestor chain — otherwise it stays visible on a stale parent value.
 * `isHidden` / permission-hidden parents do not propagate: those carry values
 * on purpose.
 */
function isConditionSatisfied(
  def: FormFieldDefinition,
  defByKey: Map<string, FormFieldDefinition>,
  values: FormValues,
  chain: Set<string>,
): boolean {
  if (!def.condition) return true;

  const parentDef = defByKey.get(def.condition.dependsOnKey);
  if (!parentDef) return false;
  if (!evaluateCondition(def.condition, values[parentDef.key] ?? null)) return false;
  if (chain.has(parentDef.key)) return true;

  chain.add(parentDef.key);
  return isConditionSatisfied(parentDef, defByKey, values, chain);
}

export function buildDefByKey(fields: FormFieldDefinition[]): Map<string, FormFieldDefinition> {
  return new Map(fields.map((f) => [f.key, f]));
}

export function getParentStringValue(
  values: FormValues,
  parentKey: string,
): string | null {
  const raw = values[parentKey];
  if (raw === null || raw === undefined || raw === '') return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return String(raw);
}

export type { CustomFieldValueParsed };
