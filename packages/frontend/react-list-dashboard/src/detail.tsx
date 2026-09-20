import type { ListDetailSection, ListRowItem } from '@ssdev-toolkit/list-dashboard-core';

export function ListRowSubtitle({ row }: { row: ListRowItem }) {
  if (row.subtitleParts?.length) {
    const sep = row.subtitleSeparator ?? ' · ';
    return (
      <span className="list-dashboard__subtitle">
        {row.subtitleParts.map((part, index) => (
          <span key={`${part.text}-${index}`}>
            {index > 0 ? sep : null}
            <span className={part.emphasis ? 'list-dashboard__subtitle-em' : undefined}>{part.text}</span>
          </span>
        ))}
      </span>
    );
  }
  if (!row.subtitle) return null;
  return <span className="list-dashboard__subtitle">{row.subtitle}</span>;
}

export function ListDetailSections({ sections }: { sections: ListDetailSection[] }) {
  return (
    <div className="list-dashboard__detail-body">
      {sections.map((section) => {
        if (section.type === 'key_value') {
          return (
            <section key={section.id} className="list-dashboard__section">
              <h3>{section.title}</h3>
              <dl>
                {section.fields.map((field) => (
                  <div key={`${section.id}-${field.label}`}>
                    <dt>{field.label}</dt>
                    <dd>
                      {field.format === 'html' ? (
                        <span dangerouslySetInnerHTML={{ __html: field.value }} />
                      ) : (
                        field.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        }
        if (section.type === 'content') {
          return (
            <section key={section.id} className="list-dashboard__section">
              {section.title ? <h3>{section.title}</h3> : null}
              <div dangerouslySetInnerHTML={{ __html: section.html }} />
            </section>
          );
        }
        if (section.type === 'item_list') {
          return (
            <section key={section.id} className="list-dashboard__section">
              <h3>{section.title}</h3>
              {section.items.length === 0 ? (
                <p>{section.emptyMessage ?? 'None'}</p>
              ) : (
                <ul className="list-dashboard__item-list">
                  {section.items.map((item, index) => (
                    <li key={item.id ?? `${section.id}-${index}`}>
                      <strong>{item.title}</strong>
                      {item.subtitle ? <div>{item.subtitle}</div> : null}
                      <div>
                        {item.metaLeft}
                        {item.metaRight ? ` · ${item.metaRight}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        }
        return (
          <section key={section.id} className="list-dashboard__section">
            <h3>{section.title}</h3>
            {section.loading ? <p>Loading documents…</p> : null}
            <ul>
              {section.documents.map((doc) => (
                <li key={doc.id}>{doc.fileName}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
