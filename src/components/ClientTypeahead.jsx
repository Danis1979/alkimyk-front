// src/components/ClientTypeahead.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../lib/http';
import { normalizeList } from '../lib/normalizeList';

export default function ClientTypeahead({
  value,
  selectedId,
  onChange,
  onSelect,
  placeholder = 'Nombre de cliente…',
  minLength = 2,
  limit = 8,
}) {
  const [q, setQ] = useState(value ?? '');
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchDisabled, setSearchDisabled] = useState(false); // fallback libre si la API no existe
  const rootRef = useRef(null);

  // Sincroniza texto externo
  useEffect(() => {
    setQ(value ?? '');
  }, [value]);

  // Cierra dropdown si clic fuera
  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Intentos de endpoints (si fallan todos → searchDisabled = true)
  const endpoints = useMemo(
    () => [
      (qq) => `/clients/search?q=${encodeURIComponent(qq)}&limit=${limit}`,
      (qq) => `/clients?q=${encodeURIComponent(qq)}&limit=${limit}`,
      (qq) => `/clients/list?q=${encodeURIComponent(qq)}&limit=${limit}`,
      (qq) => `/clients/find?q=${encodeURIComponent(qq)}&limit=${limit}`,
      (qq) => `/clients/autocomplete?q=${encodeURIComponent(qq)}&limit=${limit}`,
    ],
    [limit]
  );

  async function queryClients(qq) {
    for (const build of endpoints) {
      try {
        const url = build(qq);
        const { data } = await http.get(url);
        const arr = normalizeList(data, 'client');
        // Si el endpoint responde OK, aunque devuelva vacío, ya sabemos que existe
        setSearchDisabled(false);
        return arr;
      } catch (err) {
        // seguimos probando…
      }
    }
    // No hay endpoints válidos → modo libre
    setSearchDisabled(true);
    return [];
  }

  // Debounce de búsqueda
  useEffect(() => {
    if (searchDisabled) return; // modo libre
    if (!q || q.trim().length < minLength) {
      setList([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const arr = await queryClients(q.trim());
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
                key={opt.id ?? opt.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(opt.label);
                  onChange?.(opt.label);
                  onSelect?.(opt.id ?? null, opt.label ?? '');
                  setOpen(false);
                }}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
                {opt.id != null && (
                  <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 12 }}>
                    #{opt.id}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}