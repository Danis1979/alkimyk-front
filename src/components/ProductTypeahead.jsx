import { useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../lib/http';
import { toList } from '../lib/normalizeList';

export default function ProductTypeahead({
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
        // Intento 1: /products/search
        let data;
        try {
          const r1 = await http.get(`/products/search`, { params: { q, limit } });
          data = r1.data;
        } catch (e1) {
          // Fallback: /products
          try {
            const r2 = await http.get(`/products`, { params: { q, limit } });
            data = r2.data;
          } catch (e2) {
            data = [];
          }
        }
        if (cancel) return;
        const list = toList(data).map((p) => {
          const id = p.id ?? p.productId ?? p._id ?? null;
          const name = p.name ?? p.nombre ?? p.sku ?? p.label ?? '(s/nombre)';
          const price = p.price ?? p.precio ?? p.precioLista ?? p.costoStd ?? 0;
          return { id, label: name, price: Number(price) || 0 };
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
        placeholder="Producto/SKU…"
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
              onMouseDown={(e) => { e.preventDefault(); onSelect?.(o.id, o.label, o.price); setOpen(false); }}
              style={{ padding: '8px 10px', cursor: 'pointer', display:'flex', justifyContent:'space-between', gap:8 }}
            >
              <span>{o.label}</span>
              {Number.isFinite(o.price) && o.price > 0 && (
                <span style={{ color:'#64748b', fontSize:12 }}>{o.price.toLocaleString('es-AR')}</span>
              )}
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