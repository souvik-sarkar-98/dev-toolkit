import { describe, expect, it } from 'vitest';
import type { FormDefinition } from '@ssdev-toolkit/forms-core';
import type {
  BulkEditPageConfig,
  FilteredListCreateConfig,
  FilteredListPageConfig,
  ListDetailPageConfig,
  ListFilterCriteria,
} from '../index.js';
import type { ListDashboardConfig } from '../config/list-dashboard.config.js';
import {
  compileListDashboardConfig,
  resolveListDashboardConfig,
} from './list-config.runtime.js';

interface Entity {
  id: string;
}

interface Criteria extends ListFilterCriteria {
  status?: string;
}

const form: FormDefinition = {
  id: 'form',
  key: 'form',
  label: 'Form',
  description: null,
  fields: [],
};

describe('compileListDashboardConfig', () => {
  it('folds list, detail, create, bulk, permissions, and metadata into dashboard config', async () => {
    const list = {
      pageSize: 25,
      mapToListRow: (entity: Entity) => ({ id: entity.id, title: entity.id }),
    } as unknown as ListDashboardConfig<Entity, Criteria>['list'];
    const detail = {
      getTitle: (entity: Entity) => entity.id,
      edit: {
        buildEditForm: () => ({ ...form, id: 'fallback-detail' }),
      },
    } as unknown as ListDetailPageConfig<Entity>;
    const create = {
      route: {},
      canOpen: () => true,
      buildCreateForm: () => ({ ...form, id: 'fallback-create' }),
      form: { source: 'shared' },
    } as FilteredListCreateConfig & { form: { source: string } };
    const bulkEdit = {
      buildEditForm: () => ({ ...form, id: 'fallback-bulk' }),
      form: { source: 'shared' },
    } as unknown as BulkEditPageConfig<Entity> & { form: { source: string } };
    const definition: ListDashboardConfig<Entity, Criteria> = {
      list,
      detail: { ...detail, editForm: { source: 'shared' } },
      create,
      bulkEdit,
      operations: {
        archive: () => 'archived',
      },
      meta: {
        id: 'members',
        pageName: 'Members',
        searchPlaceholder: 'Search members',
        detailRouteSync: { idParam: 'memberId' },
      },
      permissions: {
        resolve: () => ({ showCreateFab: true }),
      },
      behavior: {
        selectableWhen: context => context.activeChip === 'all',
        canUpdateEntity: context => context.activeChip === 'editable',
      },
      forms: {
        shared: { kind: 'local', definition: form },
      },
    };

    const resolved = await resolveListDashboardConfig(definition, {
      dashboardId: 'members', experienceId: 'members',
    });
    const dashboard = compileListDashboardConfig(resolved);

    expect(dashboard.list).not.toHaveProperty('mapToListRow');
    expect(dashboard.list.pageSize).toBe(25);
    expect(dashboard.detail.getTitle({ id: 'm1' })).toBe('m1');
    expect(dashboard.detail.edit.buildEditForm({} as never)).toBe(form);
    expect(dashboard.create?.buildCreateForm?.({}, {})).toBe(form);
    expect(dashboard.bulkEdit?.buildEditForm({ id: 'm1' }, {}, [])).toBe(form);
    expect(dashboard.resolvePermissions?.()).toEqual({ showCreateFab: true });
    expect(dashboard.selectableWhen?.({
      activeChip: 'all',
      permissions: {},
    })).toBe(true);
    expect(dashboard.canUpdateEntity?.({
      activeChip: 'editable',
      permissions: {},
    })).toBe(true);
    expect(dashboard.pageName).toBe('Members');
    expect(dashboard.searchPlaceholder).toBe('Search members');
    expect(dashboard.detailRouteSync).toEqual({ idParam: 'memberId' });
    expect(dashboard.create).not.toHaveProperty('form');
    expect(dashboard.bulkEdit).not.toHaveProperty('form');
  });

  it('keeps existing builders when no form binding is provided', () => {
    const list = {
      mapToListRow: (entity: Entity) => ({ id: entity.id, title: entity.id }),
    } as unknown as ListDashboardConfig<Entity, Criteria>['list'];
    const detailBuilder = () => form;
    const detail = {
      edit: { buildEditForm: detailBuilder },
    } as unknown as ListDetailPageConfig<Entity>;
    const definition: ListDashboardConfig<Entity, Criteria> = {
      list,
      detail,
      meta: { id: 'minimal' },
    };

    const dashboard = compileListDashboardConfig({
      definition,
      forms: {},
    });

    expect(dashboard.detail.edit.buildEditForm).toBe(detailBuilder);
    expect(dashboard.create).toBeUndefined();
    expect(dashboard.bulkEdit).toBeUndefined();
  });
});
