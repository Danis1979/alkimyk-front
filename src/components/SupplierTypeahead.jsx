// src/components/SupplierTypeahead.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../lib/http';
import normalizeList from '../lib/normalizeList';

export default function SupplierTypeahead({ value, selectedId, onChange, onSelect, placeholder='Proveedor…' }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);
  const acRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounce + fetch
  useEffect(() => {
    if (!value || String(value).trim().length < 1) { setOpts([]); return; }
    const ac = new AbortController();
    acRef.current = ac;

    const run = async () => {
      const q = String(value).trim();
      const tryUrls = [
        `/suppliers/search?q=${encodeURIComponent(q)}&limit=5`,
        `/suppliers?q=${encodeURIComponent(q)}&limit=5`,
        `/suppliers/list?q=${encodeURIComponent(q)}&limit=5`,
      ];
      for (const url of tryUrls) {
        try {
          const { data } = await http.get(url, { signal: ac.signal });
          const arr = normalizeList(data);
          const mapped = arr.map((r) => ({
            id: r.id ?? r.supplierId ?? r.codigo ?? r.code ?? null,
            label: r.nombre ?? r.name ?? r.razonSocial ?? r.supplier ?? '',
          })).filter(x => x.id || x.label);
          setOpts(mapped.slice(0, 5));
          setOpen(true);
          return;
        } catch (_) { /* intento siguiente */ }
      }
      setOpts([]);
      setOpen(true);
    };

    const t = setTimeout(run, 220);
    return () => { clearTimeout(t); ac.abort(); };
  }, [value]);

  const display = useMemo(() => value ?? '', [value]);

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={display}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => { if (opts.length) setOpen(true); }}
        placeholder={placeholder}
        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
      />
      {open && opts.length > 0 && (
        <div
          style={{
            position: 'absolute', zIndex: 20, background: '#fff',
            border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, width: '100%',
            boxShadow: '0 8px 24px rgba(15,23,42,0.08)', overflow: 'hidden',
          }}
        >
          {opts.map((o) => (
            <div
              key={`${o.id}-${o.label}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect?.(o.id, o.label); setOpen(false); }}
              style={{ padding: '8px 10px', cursor: 'pointer' }}
            >
              <strong>{o.label}</strong>{' '}
              {o.id ? <span style={{ color: '#64748b' }}>· #{o.id}</span> : null}
            </div>
          ))}
        </div>
      )}
      {selectedId && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>Seleccionado: #{selectedId}</div>
      )}
    </div>
  );
}