import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  getValue?: (row: T) => string | number;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  pageSize?: number;
  actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  searchable = true,
  pageSize = 25,
  actions,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  const getValue = (row: T, col: Column<T>): string | number => {
    if (col.getValue) return col.getValue(row);
    const v = row[col.key];
    return v == null ? '' : v;
  };

  const filtered = useMemo(() => {
    let items = data;

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((row) =>
        columns.some((col) =>
          String(getValue(row, col)).toLowerCase().includes(q),
        ),
      );
    }

    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      const col = columns.find((c) => c.key === key);
      if (!col) continue;
      const q = val.toLowerCase();
      items = items.filter((row) =>
        String(getValue(row, col)).toLowerCase().includes(q),
      );
    }

    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        items = [...items].sort((a, b) => {
          const va = getValue(a, col);
          const vb = getValue(b, col);
          const cmp = typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb));
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }

    return items;
  }, [data, search, filters, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="datatable">
      {searchable && (
        <div className="datatable__toolbar">
          <input
            className="datatable__search"
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      )}
      <div className="datatable__scroll">
        <table className="datatable__table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  <div className="datatable__th-inner">
                    <span
                      className={col.sortable !== false ? 'datatable__sortable' : ''}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                    </span>
                    {col.filterable !== false && (
                      <input
                        className="datatable__filter"
                        placeholder="Filter"
                        value={filters[col.key] ?? ''}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, [col.key]: e.target.value }));
                          setPage(0);
                        }}
                      />
                    )}
                  </div>
                </th>
              ))}
              {actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="datatable__empty">
                  No data
                </td>
              </tr>
            )}
            {paged.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'datatable__row--clickable' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : String(getValue(row, col) ?? '')}
                  </td>
                ))}
                {actions && <td onClick={(e) => e.stopPropagation()}>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="datatable__pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Prev</button>
          <span>{page + 1} / {pageCount}</span>
          <button disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Next ›</button>
        </div>
      )}
    </div>
  );
}
