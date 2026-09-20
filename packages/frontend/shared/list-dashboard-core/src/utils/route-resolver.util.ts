import type { RefDataMap } from '../types/ref-data.js';

/** Read reference-data resolver payload from the active route snapshot. */
export function readRouteRefData(route: { snapshot: { data: Record<string, unknown> } }): RefDataMap {
  return (route.snapshot.data['ref_data'] as RefDataMap | undefined) ?? {};
}
