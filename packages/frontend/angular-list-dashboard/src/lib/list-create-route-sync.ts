import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { parseBooleanQueryParam, parseStringQueryParam } from '@ssdev-toolkit/list-dashboard-core';

export type ListCreateRoutePresetType = 'string' | 'boolean';

/** Maps URL query params to create-flow preset state on the dashboard. */
export interface ListCreateRoutePresetBinding {
  param: string;
  stateKey: string;
  type: ListCreateRoutePresetType;
}

export interface ListCreateRouteSyncConfig {
  /** Query param that opens create mode. Defaults to `create`. */
  actionParam?: string;
  presets?: ListCreateRoutePresetBinding[];
}

export interface ListCreateRoutePending {
  presets: Record<string, unknown>;
}

export function isCreateActionOpen(value: string | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/** Build query params for a deep link that opens create mode with optional presets. */
export function buildCreateRouteQuery(
  presets: Record<string, string | undefined> = {},
  actionParam = 'create',
): Record<string, string> {
  const query: Record<string, string> = { [actionParam]: 'true' };
  for (const [param, value] of Object.entries(presets)) {
    const trimmed = value?.trim();
    if (trimmed) {
      query[param] = trimmed;
    }
  }
  return query;
}

/**
 * Keeps a mobile create bottom sheet in sync with URL query params.
 *
 * Example: `?create=true&forEventId=act-123`
 * Domain dashboards own open/close logic; this helper reads/writes the URL.
 */
export class ListCreateRouteSync {
  private suppressed = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly config: ListCreateRouteSyncConfig,
  ) {}

  readPendingFromRoute(params: ParamMap = this.route.snapshot.queryParamMap): ListCreateRoutePending | undefined {
    const actionParam = this.config.actionParam ?? 'create';
    if (!isCreateActionOpen(params.get(actionParam))) {
      return undefined;
    }

    return {
      presets: this.readPresets(params),
    };
  }

  isOpen(params: ParamMap = this.route.snapshot.queryParamMap): boolean {
    const actionParam = this.config.actionParam ?? 'create';
    return isCreateActionOpen(params.get(actionParam));
  }

  /** Open create mode in the URL (merge; preserves list/detail params). */
  sync(presets: Record<string, unknown> = {}): void {
    if (this.suppressed) {
      return;
    }

    const actionParam = this.config.actionParam ?? 'create';
    const queryParams: Record<string, string | boolean | null> = {
      [actionParam]: true,
      ...this.buildPresetQueryParams(presets),
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Close create mode in the URL. Preset params are kept for list context. */
  clear(): void {
    if (this.suppressed) {
      return;
    }

    const actionParam = this.config.actionParam ?? 'create';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [actionParam]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setSuppressed(suppressed: boolean): void {
    this.suppressed = suppressed;
  }

  private readPresets(params: ParamMap): Record<string, unknown> {
    const presets: Record<string, unknown> = {};

    for (const binding of this.config.presets ?? []) {
      const raw = params.get(binding.param);
      switch (binding.type) {
        case 'string':
          presets[binding.stateKey] = parseStringQueryParam(raw);
          break;
        case 'boolean':
          presets[binding.stateKey] = raw === null ? undefined : parseBooleanQueryParam(raw);
          break;
      }
    }

    return presets;
  }

  private buildPresetQueryParams(presets: Record<string, unknown>): Record<string, string | boolean | null> {
    const queryParams: Record<string, string | boolean | null> = {};

    for (const binding of this.config.presets ?? []) {
      const value = presets[binding.stateKey];
      switch (binding.type) {
        case 'string':
          queryParams[binding.param] = typeof value === 'string' && value.trim() ? value.trim() : null;
          break;
        case 'boolean':
          queryParams[binding.param] = value ? true : null;
          break;
      }
    }

    return queryParams;
  }
}
