import { Directive, TemplateRef } from '@angular/core';
import type {
  ListDashboardOperations,
  ListFilterCriteria,
  ListRowItem,
} from '@ssdev-toolkit/list-dashboard-core';
import type { ListDashboardRuntime } from './list-dashboard.runtime';

export interface ListRowTemplateContext<TEntity> {
  $implicit: ListRowItem<TEntity>;
  entity: TEntity | undefined;
}

export interface ListActionsTemplateContext<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  $implicit: readonly TEntity[];
  controller: ListDashboardRuntime<TEntity, TCriteria, TContext, TOperations>;
}

export interface ListDetailActionsTemplateContext<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  $implicit: TEntity | undefined;
  controller: ListDashboardRuntime<TEntity, TCriteria, TContext, TOperations>;
}

export interface ListOverlayTemplateContext<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  $implicit: ListDashboardRuntime<TEntity, TCriteria, TContext, TOperations>;
}

@Directive({ selector: 'ng-template[listRow]', standalone: true })
export class ListRowTemplateDirective<TEntity> {
  constructor(readonly template: TemplateRef<ListRowTemplateContext<TEntity>>) {}
  static ngTemplateContextGuard<T>(
    _directive: ListRowTemplateDirective<T>,
    _context: unknown,
  ): _context is ListRowTemplateContext<T> {
    return true;
  }
}

@Directive({
  selector: 'ng-template[listFloatingActions]',
  standalone: true,
})
export class ListFloatingActionsDirective<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  constructor(
    readonly template: TemplateRef<ListActionsTemplateContext<TEntity, TCriteria, TContext, TOperations>>,
  ) {}
}

@Directive({
  selector: 'ng-template[listBulkActions]',
  standalone: true,
})
export class ListBulkActionsDirective<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  constructor(
    readonly template: TemplateRef<ListActionsTemplateContext<TEntity, TCriteria, TContext, TOperations>>,
  ) {}
}

@Directive({
  selector: 'ng-template[listDetailFooterActions]',
  standalone: true,
})
export class ListDetailFooterActionsDirective<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  constructor(
    readonly template: TemplateRef<ListDetailActionsTemplateContext<TEntity, TCriteria, TContext, TOperations>>,
  ) {}
}

/** Rendered above the detail body in view mode (avatar, badges, summary chips). */
@Directive({
  selector: 'ng-template[listDetailHero]',
  standalone: true,
})
export class ListDetailHeroDirective<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  constructor(
    readonly template: TemplateRef<ListDetailActionsTemplateContext<TEntity, TCriteria, TContext, TOperations>>,
  ) {}
}

/** Rendered below detail sections in view mode (comments, related panels, etc.). */
@Directive({
  selector: 'ng-template[listDetailViewExtras]',
  standalone: true,
})
export class ListDetailViewExtrasDirective<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  constructor(
    readonly template: TemplateRef<ListDetailActionsTemplateContext<TEntity, TCriteria, TContext, TOperations>>,
  ) {}
}

@Directive({
  selector: 'ng-template[listOverlay]',
  standalone: true,
})
export class ListOverlayDirective<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  constructor(
    readonly template: TemplateRef<ListOverlayTemplateContext<TEntity, TCriteria, TContext, TOperations>>,
  ) {}
}
