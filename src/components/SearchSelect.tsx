import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
}

interface Props {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
}

export function SearchSelect({ options, value, onChange, placeholder = 'Select…', clearable }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.meta ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const selected = options.find((o) => o.value === value);

  return (
    <div className="search-select" ref={ref}>
      <div className="search-select__control" onClick={() => setOpen(!open)}>
        <span className="search-select__value">
          {selected ? selected.label : <span className="search-select__placeholder">{placeholder}</span>}
        </span>
        {clearable && value && (
          <button className="search-select__clear" onClick={(e) => { e.stopPropagation(); onChange(null); }}>×</button>
        )}
      </div>
      {open && (
        <div className="search-select__dropdown">
          <input
            className="search-select__input"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <ul className="search-select__list">
            {filtered.length === 0 && <li className="search-select__empty">No results</li>}
            {filtered.map((o) => (
              <li
                key={o.value}
                className={`search-select__option ${o.value === value ? 'search-select__option--selected' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
              >
                {o.label}
                {o.meta && <span className="search-select__meta">{o.meta}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
