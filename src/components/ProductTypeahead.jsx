// src/components/ProductTypeahead.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../lib/http';
import { normalizeList } from '../lib/normalizeList';

export default function ProductTypeahead({
  value,
  selectedId,
  onChange,
  onSelect, // onSelect(id, label, price?)
  placeholder = 'Producto…',
  minLength = 2,
  limit = 10,
}) {
  const [q, setQ] = useState(value ?? '');
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchDisabled, setSearchDisabled] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    setQ(value ?? '');
  }, [value]);

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const endpoints = useMemo(
    () => [
      (qq) => `/products/search?q=${encodeURIComponent(qq)}&limit=${limit}`,
      (qq) => `/products?q=${encodeURIComponent(qq)}&limit=${limit}`,
      (qq) => `/products/list?q=${encodeURIComponent(qq)}&limit=${limit}`,
      (qq) => `/products/find?q=${encodeURIComponent(qq)}&limit=${limit}`,
      (qq) => `/products/autocomplete?q=${encodeURIComponent(qq)}&limit=${limit}`,
    ],
    [limit]
  );

  async function queryProducts(qq) {
    for (const build of endpoints) {
      try {
        const url = build(qq);
        const { data } = await http.get(url);
        const arr = normalizeList(data, 'product');
        setSearchDisabled(false);
        return arr;
      } catch (err) {
        // seguimos probando…
      }
    }
    setSearchDisabled(true);
    return [];
  }

  useEffect(() => {
    if (searchDisabled) return;
    if (!q || q.trim().length < minLength) {
      setList([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const arr = await queryProducts(q.trim());
      if (!alive) return;
      setList(arr);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, minLength, searchDisabled]);

  const showDropdown = open && !searchDisabled && (loading || list.length > 0);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange?.(e.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: '8px 10px',
          width: '100%',
        }}
      />

      {searchDisabled && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
          Búsqueda deshabilitada (no hay endpoint en el backend). Podés escribir libremente.
        </div>
      )}

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            zIndex: 30,
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {loading && (
            <div style={{ padding: 10, color: '#64748b', fontSize: 13 }}>Buscando…</div>
          )}
          {!loading && list.length === 0 && (
            <div style={{ padding: 10, color: '#64748b', fontSize: 13 }}>
              Sin coincidencias
            </div>
          )}
          {!loading &&
            list.map((opt) => (
              <div
                key={(opt.id ?? '') + '::' + opt.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const price =
                    Number.isFinite(opt.price) ? Number(opt.price) : undefined;
                  setQ(opt.label);
                  onChange?.(opt.label);
                  onSelect?.(opt.id ?? null, opt.label ?? '', price);
                  setOpen(false);
                }}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span>
                  {opt.label}
                  {opt.sku && (
                    <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 12 }}>
                      ({opt.sku})
                    </span>
                  )}
                </span>
                {opt.price != null && (
                  <span style={{ color: '#334155', fontSize: 12 }}>
                    $ {Number(opt.price).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}