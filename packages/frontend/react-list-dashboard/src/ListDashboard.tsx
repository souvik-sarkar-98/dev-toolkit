'use client';

import { CustomForm } from '@ssdev-toolkit/react-forms';
import type { ListActionDef, ListFilterCriteria, ListRowItem } from '@ssdev-toolkit/list-dashboard-core';
import { ListDetailSections, ListRowSubtitle } from './detail.js';
import type { ListDashboardProps } from './types.js';
import { useListDashboard } from './useListDashboard.js';

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function ListDashboard<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext = unknown,
>(props: ListDashboardProps<TEntity, TCriteria, TContext>) {
  const dashboard = useListDashboard(props);
  const names = props.classNames ?? {};

  return (
    <section
      className={cx('list-dashboard', names.root)}
      aria-busy={dashboard.loading || dashboard.compiling}
    >
      {dashboard.compiling || dashboard.loading ? (
        <div className="list-dashboard__state" role="status">
          Loading…
        </div>
      ) : null}
      {dashboard.error && !dashboard.loading ? (
        <div className={cx('list-dashboard__state', 'list-dashboard__state--error', names.error)} role="alert">
          {dashboard.error}
        </div>
      ) : null}

      <header className={cx('list-dashboard__toolbar', names.toolbar)}>
        {dashboard.title ? <h2>{dashboard.title}</h2> : null}
        <input
          className={cx('list-dashboard__search', names.search)}
          type="search"
          value={dashboard.searchText}
          placeholder={dashboard.searchPlaceholder}
          onChange={(event) => dashboard.setSearchText(event.target.value)}
          aria-label={dashboard.searchPlaceholder}
        />
        <button type="button" onClick={dashboard.openFilter}>
          Filters{dashboard.filterCount ? ` (${dashboard.filterCount})` : ''}
        </button>
      </header>

      <div className={cx('list-dashboard__chips', names.chips)} role="tablist">
        {dashboard.chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={chip.id === dashboard.chipId}
            className={cx(
              'list-dashboard__chip',
              names.chip,
              chip.id === dashboard.chipId && names.chipActive,
            )}
            onClick={() => dashboard.selectChip(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {dashboard.appliedFilters.length > 0 ? (
        <div className={cx('list-dashboard__pills', names.pills)}>
          {dashboard.appliedFilters.map((pill) => (
            <button
              key={pill.id}
              type="button"
              className={cx('list-dashboard__pill', names.pill)}
              onClick={() => dashboard.removeFilter(pill.id)}
            >
              {pill.label} ×
            </button>
          ))}
        </div>
      ) : null}

      {dashboard.bulkActions.length > 0 && dashboard.selectedIds.size > 0 ? (
        <div className="list-dashboard__bulk">
          {dashboard.bulkActions.map((action) => (
            <button key={action.id} type="button" onClick={() => void dashboard.runAction(action)}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <ul className={cx('list-dashboard__list', names.list)}>
        {dashboard.items.map((row) => (
          <ListRow
            key={row.id}
            row={row}
            selected={dashboard.selectedIds.has(row.id)}
            className={cx(names.row, dashboard.selectedRow?.id === row.id && names.rowSelected)}
            menu={dashboard.rowMenuActions(row)}
            onOpen={() => void dashboard.openDetail(row)}
            onToggle={() => dashboard.toggleSelected(row.id)}
            onAction={(action) => void dashboard.runAction(action, row.payload as TEntity)}
          />
        ))}
      </ul>

      {!dashboard.loading && dashboard.items.length === 0 ? (
        <p className={cx('list-dashboard__empty', names.empty)}>{dashboard.emptyMessage}</p>
      ) : null}

      {dashboard.hasMore ? (
        <button type="button" onClick={dashboard.loadMore} disabled={dashboard.loadingMore}>
          {dashboard.loadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}

      {dashboard.floatingActions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={cx(
            'list-dashboard__fab',
            names.fab,
            action.appearance === 'fab' && 'list-dashboard__fab--round',
          )}
          onClick={() => void dashboard.runAction(action)}
        >
          {action.label}
        </button>
      ))}

      {dashboard.filterOpen ? (
        <aside className={cx('list-dashboard__panel', names.panel)} aria-label={dashboard.filterSheetTitle}>
          <header>
            <h2>{dashboard.filterSheetTitle}</h2>
            <button type="button" onClick={dashboard.closeFilter}>
              Close
            </button>
          </header>
          {dashboard.filterForm ? (
            <CustomForm
              definition={dashboard.filterForm}
              initialValues={dashboard.filterValues}
              components={props.formComponents ?? {}}
              classNames={props.formClassNames}
              submitLabel="Apply"
              onSubmit={async (values) => dashboard.applyFilter(values)}
            />
          ) : null}
        </aside>
      ) : null}

      {dashboard.createOpen ? (
        <aside className={cx('list-dashboard__panel', names.panel)} aria-label="Create">
          <header>
            <h2>Create</h2>
            <button type="button" onClick={dashboard.closeCreate}>
              Close
            </button>
          </header>
          {dashboard.createForm ? (
            <CustomForm
              definition={dashboard.createForm}
              initialValues={dashboard.createValues}
              components={props.formComponents ?? {}}
              classNames={props.formClassNames}
              submitLabel={dashboard.compiled?.create?.saveLabel ?? 'Create'}
              onSubmit={dashboard.submitCreate}
            />
          ) : null}
        </aside>
      ) : null}

      {dashboard.detailOpen ? (
        <aside className={cx('list-dashboard__panel', names.panel)} aria-label={dashboard.detailTitle ?? 'Detail'}>
          <header>
            <h2>{dashboard.detailTitle}</h2>
            <button type="button" onClick={dashboard.closeDetail}>
              Close
            </button>
          </header>
          <ListDetailSections sections={dashboard.detailSections} />
          {dashboard.detailFooterActions.length > 0 ? (
            <footer>
              {dashboard.detailFooterActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void dashboard.runAction(action, dashboard.selectedEntity)}
                >
                  {action.label}
                </button>
              ))}
            </footer>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}

function ListRow<TEntity>({
  row,
  selected,
  className,
  menu,
  onOpen,
  onToggle,
  onAction,
}: {
  row: ListRowItem<TEntity>;
  selected: boolean;
  className?: string;
  menu: ListActionDef[];
  onOpen: () => void;
  onToggle: () => void;
  onAction: (action: ListActionDef) => void;
}) {
  return (
    <li className={cx('list-dashboard__row', className)}>
      <label className="list-dashboard__select">
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${row.title}`} />
      </label>
      <button type="button" className="list-dashboard__row-main" onClick={onOpen}>
        <span className="list-dashboard__title">{row.title}</span>
        <ListRowSubtitle row={row} />
        <span className="list-dashboard__meta">
          {row.metaLeft}
          {row.metaRight ? ` · ${row.metaRight}` : ''}
        </span>
        {row.badge ? (
          <span className={`list-dashboard__badge list-dashboard__badge--${row.badge.tone ?? 'neutral'}`}>
            {row.badge.label}
          </span>
        ) : null}
      </button>
      {menu.length > 0 ? (
        <div className="list-dashboard__row-menu">
          {menu.map((action) => (
            <button key={action.id} type="button" onClick={() => onAction(action)}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
