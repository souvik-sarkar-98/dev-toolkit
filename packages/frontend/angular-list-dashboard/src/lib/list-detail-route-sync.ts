import { ActivatedRoute, Router } from '@angular/router';

export type ListDetailRouteMode = 'view' | 'edit';

export interface ListDetailRouteSyncConfig {
  /** Primary query param for the selected item id, e.g. `donationId`. */
  idParam: string;
  /** Optional aliases checked when the primary param is absent, e.g. `['id']`. */
  idParamAliases?: string[];
  /** Query param toggling edit mode. Defaults to `edit`. */
  editParam?: string;
}

export interface ListDetailRoutePending {
  itemId: string;
  edit: boolean;
}

/**
 * Keeps a mobile list-detail bottom sheet in sync with URL query params.
 *
 * Domain dashboards own fetch/open/close logic; this helper only reads and
 * writes `?itemId=…&edit=true` while preserving other params (chip, filters).
 */
export class ListDetailRouteSync {
  private suppressed = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly config: ListDetailRouteSyncConfig,
  ) {}

  /** Read a pending deep-link open request from the current route snapshot. */
  readPendingFromRoute(): ListDetailRoutePending | undefined {
    const params = this.route.snapshot.queryParamMap;
    const aliases = this.config.idParamAliases ?? [];

    let itemId = params.get(this.config.idParam);
    for (const alias of aliases) {
      if (!itemId) {
        itemId = params.get(alias);
      }
    }

    if (!itemId?.trim()) {
      return undefined;
    }

    const editParam = params.get(this.config.editParam ?? 'edit');
    return {
      itemId: itemId.trim(),
      edit: editParam === 'true' || editParam === '1',
    };
  }

  /** Write the open sheet state into the URL (merge; replace history entry). */
  sync(itemId: string | undefined, mode: ListDetailRouteMode = 'view'): void {
    if (this.suppressed || !itemId) {
      return;
    }

    const editParam = this.config.editParam ?? 'edit';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        [this.config.idParam]: itemId,
        [editParam]: mode === 'edit' ? true : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Remove detail params from the URL while keeping list context params. */
  clear(): void {
    if (this.suppressed) {
      return;
    }

    const editParam = this.config.editParam ?? 'edit';
    const queryParams: Record<string, null> = {
      [this.config.idParam]: null,
      [editParam]: null,
    };

    for (const alias of this.config.idParamAliases ?? []) {
      queryParams[alias] = null;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Temporarily disable URL updates (e.g. during bulk programmatic navigation). */
  setSuppressed(suppressed: boolean): void {
    this.suppressed = suppressed;
  }
}
