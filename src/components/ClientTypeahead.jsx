import { useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../lib/http';
import { toList } from '../lib/normalizeList';

export default function ClientTypeahead({
  value,
  selectedId,
  onChange,
  onSelect,
  limit = 8,
}) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);
  const boxRef = useRef(null);

  const q = (value ?? '').trim();
  const debKey = useMemo(() => q, [q]);

  useEffect(() => {
    if (!q) { setOpts([]); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      try {
        // Intento 1: /clients/search
        let data;
        try {
          const r1 = await http.get(`/clients/search`, { params: { q, limit } });
          data = r1.data;
        } catch (e1) {
          // Fallback: /clients
          try {
            const r2 = await http.get(`/clients`, { params: { q, limit } });
            data = r2.data;
          } catch (e2) {
            data = [];
          }
        }
        if (cancel) return;
        const list = toList(data).map((c) => {
          const id = c.id ?? c.clientId ?? c._id ?? null;
          const name = c.name ?? c.nombre ?? c.client ?? c.razonSocial ?? c.label ?? '(s/nombre)';
          const extra = c.cuit ? ` • CUIT ${c.cuit}` : '';
          return { id, label: `${name}${extra}` };
        });
        setOpts(list);
        setOpen(true);
      } catch {
        if (!cancel) { setOpts([]); setOpen(false); }
      }
    }, 250);

    return () => { cancel = true; clearTimeout(t); };
  }, [debKey, limit]);

  useEffect(() => {
    function clickAway(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', clickAway);
    return () => document.removeEventListener('mousedown', clickAway);
  }, []);

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => q && opts.length > 0 && setOpen(true)}
        placeholder="Nombre, CUIT…"
        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
      />
      {open && opts.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          border: '1px solid #e2e8f0', background: '#fff', zIndex: 20,
          borderRadius: 8, marginTop: 4, maxHeight: 240, overflowY: 'auto'
        }}>
          {opts.map(o => (
            <div key={`${o.id}-${o.label}`}
              onMouseDown={(e) => { e.preventDefault(); onSelect?.(o.id, o.label); setOpen(false); }}
              style={{ padding: '8px 10px', cursor: 'pointer' }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
      {selectedId && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
          Seleccionado: #{selectedId}
        </div>
      )}
    </div>
  );
}