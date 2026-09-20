import type { FormDefinition } from '@ssdev-toolkit/forms-core';
import type { FilteredListDashboardConfig } from '../config/filtered-list-dashboard.config.js';
import type { ListFilterCriteria } from '../models/infinite-list.model.js';
import type {
  ListDashboardConfig,
  ListDashboardOperations,
  ListFormBinding,
  ResolvedListDashboardConfig,
} from '../config/list-dashboard.config.js';
import {
  ListFormResolver,
  type ListFormResolverContext,
  type ResolvedListForm,
} from './list-form.runtime.js';
import { ListPreparationRunner } from './list-preparation.runtime.js';

function boundForm(
  binding: ListFormBinding,
  forms: Readonly<Record<string, ResolvedListForm>>,
): FormDefinition {
  const resolved = forms[binding.source];
  if (!resolved) {
    throw new Error(`List form source was not resolved: ${binding.source}`);
  }
  return binding.transform
    ? binding.transform(resolved.definition)
    : resolved.definition;
}

export function compileListDashboardConfig<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
>(
  resolved: ResolvedListDashboardConfig<TEntity, TCriteria, TContext, TOperations>,
): FilteredListDashboardConfig<TEntity, TCriteria> {
  const { definition, forms } = resolved;
  const { editForm, ...detail } = definition.detail;
  const create = definition.create;
  const bulkEdit = definition.bulkEdit;
  const { mapToListRow: _mapToListRow, ...list } = definition.list;

  return {
    list,
    detail: {
      ...detail,
      edit: {
        ...detail.edit,
        buildEditForm: editForm
          ? () => boundForm(editForm, forms)
          : detail.edit.buildEditForm,
      },
    },
    create: create
      ? (() => {
          const { form, ...config } = create;
          return {
            ...config,
            buildCreateForm: form
              ? () => boundForm(form, forms)
              : config.buildCreateForm,
          };
        })()
      : undefined,
    bulkEdit: bulkEdit
      ? (() => {
          const { form, ...config } = bulkEdit;
          return {
            ...config,
            buildEditForm: form
              ? () => boundForm(form, forms)
              : config.buildEditForm,
          };
        })()
      : undefined,
    resolvePermissions: definition.permissions?.resolve,
    selectableWhen: definition.behavior?.selectableWhen,
    canUpdateEntity: definition.behavior?.canUpdateEntity,
    refDataLoaders: definition.behavior?.refDataLoaders,
    searchPlaceholder: definition.meta.searchPlaceholder,
    filterSheetTitle: definition.meta.filterSheetTitle,
    emptyMessage: definition.meta.emptyMessage,
    detailRouteSync: definition.meta.detailRouteSync,
    pageName: definition.meta.pageName,
  };
}

export async function resolveListDashboardConfig<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
>(
  definition: ListDashboardConfig<TEntity, TCriteria, TContext, TOperations>,
  context: ListFormResolverContext,
  resolver = new ListFormResolver(),
): Promise<ResolvedListDashboardConfig<TEntity, TCriteria, TContext, TOperations>> {
  const entries = await Promise.all(
    Object.entries(definition.forms ?? {}).map(async ([id, source]) => {
      const resolved = await resolver.resolve(id, source, context);
      return [id, resolved] as const;
    }),
  );
  return { definition, forms: Object.fromEntries(entries) };
}

export class ListDashboardRuntime<TContext = unknown> {
  readonly forms = new ListFormResolver();

  async compile<
    TEntity,
    TCriteria extends ListFilterCriteria,
    TOperations extends ListDashboardOperations = ListDashboardOperations,
  >(
    definition: ListDashboardConfig<TEntity, TCriteria, TContext, TOperations>,
    context: ListFormResolverContext,
  ): Promise<FilteredListDashboardConfig<TEntity, TCriteria>> {
    const resolved = await resolveListDashboardConfig(
      definition,
      context,
      this.forms,
    );
    return compileListDashboardConfig(resolved);
  }

  preparation<TEntity, TCriteria extends ListFilterCriteria>(
    definition: ListDashboardConfig<TEntity, TCriteria, TContext>,
  ): ListPreparationRunner<TContext> | undefined {
    return definition.preparation
      ? new ListPreparationRunner(
          definition.preparation.tasks,
          definition.preparation.triggers,
        )
      : undefined;
  }

  invalidateForms(id?: string): void {
    this.forms.invalidate(id);
  }
}
