import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ListCreateRouteSync,
  ListCreateRouteSyncConfig,
} from './list-create-route-sync';

export interface ListCreatePageInitOptions {
  route: ActivatedRoute;
  router: Router;
  config: ListCreateRouteSyncConfig;
  canOpen: () => boolean;
  /** Await async preparation before create is opened from a deep link. */
  prepareRouteOpen?: () => boolean | Promise<boolean>;
  /** Extra preset keys read from route outside create-route bindings (e.g. forEventId). */
  extraPresetReaders?: Array<(params: ParamMap, presets: Record<string, unknown>) => void>;
  onBeforeOpen?: () => void;
}

/**
 * Orchestrates create sheet open/close + route sync (mirrors list/detail controllers).
 */
export class ListCreatePageController {
  open = false;
  presets: Record<string, unknown> = {};

  private route!: ActivatedRoute;
  private routeSync!: ListCreateRouteSync;
  private canOpen!: () => boolean;
  private prepareRouteOpen?: () => boolean | Promise<boolean>;
  private extraPresetReaders: ListCreatePageInitOptions['extraPresetReaders'] = [];
  private onBeforeOpen?: () => void;
  private pendingOpen = false;
  private preparingRouteOpen = false;
  private routeSub = new Subscription();

  init(options: ListCreatePageInitOptions): void {
    this.route = options.route;
    this.routeSync = new ListCreateRouteSync(options.route, options.router, options.config);
    this.canOpen = options.canOpen;
    this.prepareRouteOpen = options.prepareRouteOpen;
    this.extraPresetReaders = options.extraPresetReaders ?? [];
    this.onBeforeOpen = options.onBeforeOpen;
    this.applyPresetsFromRoute(this.route.snapshot.queryParamMap);
    this.queuePendingFromRoute();
    this.routeSub.add(
      this.route.queryParamMap.subscribe(params => this.syncFromRouteParams(params)),
    );
  }

  destroy(): void {
    this.routeSub.unsubscribe();
  }

  queuePendingFromRoute(): void {
    if (!this.routeSync.readPendingFromRoute()) {
      return;
    }
    this.applyPresetsFromRoute(this.route.snapshot.queryParamMap);
    this.pendingOpen = true;
  }

  tryOpenPending(): void {
    if (!this.pendingOpen || this.open || !this.canOpen()) {
      return;
    }
    void this.openPendingFromRoute();
  }

  openSheet(options: { syncRoute: boolean } = { syncRoute: true }): void {
    if (!this.canOpen()) {
      return;
    }

    this.pendingOpen = false;
    this.onBeforeOpen?.();
    this.open = true;

    if (options.syncRoute) {
      this.routeSync.sync(this.presets);
    }
  }

  close(): void {
    this.open = false;
    this.routeSync.clear();
  }

  syncFromRouteParams(params: ParamMap): void {
    const shouldOpen = this.routeSync.isOpen(params);

    if (shouldOpen && !this.open) {
      this.applyPresetsFromRoute(params);
      this.pendingOpen = true;
      void this.openPendingFromRoute();
      return;
    }

    if (!shouldOpen && this.open) {
      this.open = false;
    }
    if (!shouldOpen) {
      this.pendingOpen = false;
    }
  }

  applyPresetsFromRoute(params: ParamMap = this.route.snapshot.queryParamMap): void {
    const pending = this.routeSync.readPendingFromRoute(params);
    const nextPresets: Record<string, unknown> = { ...(pending?.presets ?? {}) };

    for (const reader of this.extraPresetReaders ?? []) {
      reader(params, nextPresets);
    }

    this.presets = { ...this.presets, ...nextPresets };
  }

  presetString(key: string): string | undefined {
    const value = this.presets[key];
    return typeof value === 'string' ? value : undefined;
  }

  private async openPendingFromRoute(): Promise<void> {
    if (this.preparingRouteOpen || this.open || !this.pendingOpen || !this.canOpen()) {
      return;
    }

    this.preparingRouteOpen = true;
    try {
      const prepared = await this.prepareRouteOpen?.();
      if (prepared === false || this.open || !this.routeSync.isOpen() || !this.canOpen()) {
        return;
      }
      this.pendingOpen = false;
      this.openSheet({ syncRoute: false });
    } finally {
      this.preparingRouteOpen = false;
    }
  }
}
