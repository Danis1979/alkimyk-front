// src/pages/ProductionNew.jsx
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductTypeahead from '../components/ProductTypeahead';
import { createProductionOrder, fetchRecipe } from '../services/production.service';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function todayYMD() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function number(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

export default function ProductionNew() {
  const nav = useNavigate();

  const [fecha, setFecha] = useState(todayYMD());
  const [itemsProd, setItemsProd] = useState([{ key: 1, productId: null, productLabel: '', qty: 1 }]);
  const [consumos, setConsumos]   = useState([]); // opcional

  const canSave = useMemo(() => {
    if (!fecha) return false;
    const outs = itemsProd.filter(r => (r.productId || r.productLabel.trim()) && number(r.qty) > 0);
    return outs.length > 0;
  }, [fecha, itemsProd]);

  const addProd = () => {
    const k = itemsProd.reduce((m, it) => Math.max(m, it.key), 0) + 1;
    setItemsProd([...itemsProd, { key: k, productId: null, productLabel: '', qty: 1 }]);
  };
  const delProd = (key) => setItemsProd(itemsProd.filter(it => it.key !== key));
  const upProd  = (key, patch) => setItemsProd(itemsProd.map(it => it.key === key ? { ...it, ...patch } : it));

  const addInsumo = () => {
    const k = (consumos.reduce((m, it) => Math.max(m, it.key), 0) || 0) + 1;
    setConsumos([...(consumos || []), { key: k, insumoId: null, insumoLabel: '', qty: 1 }]);
  };
  const delInsumo = (key) => setConsumos(consumos.filter(it => it.key !== key));
  const upInsumo  = (key, patch) => setConsumos(consumos.map(it => it.key === key ? { ...it, ...patch } : it));

  const loadRecipe = async (row) => {
    const id = row.productId;
    if (!id) return;
    const r = await fetchRecipe(id);
    if (!r?.componentes?.length) { alert('Receta no encontrada para ese producto'); return; }
    // qty total = qty requerida * receta.qtyPorUnidad
    const scaled = r.componentes.map(c => ({ key: crypto.randomUUID(), insumoId: c.insumoId, insumoLabel: c.insumo, qty: (number(row.qty) || 1) * number(c.qtyPorUnidad) }));
    setConsumos(scaled);
  };

  const onSubmit = async () => {
    const payload = {
      fecha: new Date(fecha).toISOString(),
      estado: 'Planificada',
      itemsProd: itemsProd
        .filter(r => (r.productId || r.productLabel.trim()) && number(r.qty) > 0)
        .map(r => ({ productId: r.productId, product: r.productLabel || null, qty: number(r.qty) })),
      consumos: (consumos || [])
        .filter(r => (r.insumoId || r.insumoLabel?.trim()) && number(r.qty) > 0)
        .map(r => ({ insumoId: r.insumoId, insumo: r.insumoLabel || null, qty: number(r.qty) })),
    };
    try {
      const data = await createProductionOrder(payload);
      if (data?.id) nav('/production', { replace: true }); else nav('/production', { replace: true });
    } catch (e) {
      console.warn('POST /production_orders falló', e);
      alert('No se pudo crear la OP. Revisá backend.\n\n' + JSON.stringify(payload, null, 2));
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Nueva OP</h1>
        <Link to="/production" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>← Volver</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <Label>Fecha</Label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
      </div>

      {/* Productos (salida) */}
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Productos a producir</div>
        <button onClick={addProd} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}>+ Agregar</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>Producto</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Cantidad</th>
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}></th>
          </tr>
        </thead>
        <tbody>
          {itemsProd.map((r) => (
            <tr key={r.key} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 8px' }}>
                <ProductTypeahead
                  value={r.productLabel}
                  selectedId={r.productId}
                  onChange={(txt) => upProd(r.key, { productLabel: txt })}
                  onSelect={(id, label) => upProd(r.key, { productId: id, productLabel: label ?? '' })}
                />
              </td>
              <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                <input type="number" step="any" min="0" value={r.qty}
                       onChange={(e) => upProd(r.key, { qty: e.target.value })}
                       style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: 120, textAlign: 'right' }} />
              </td>
              <td style={{ padding: '8px 8px', display: 'flex', gap: 8 }}>
                <button onClick={() => loadRecipe(r)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}>
                  Cargar receta
                </button>
                <button onClick={() => delProd(r.key)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {itemsProd.length === 0 && (
            <tr><td colSpan={3} style={{ padding: 16, color: '#64748b' }}>Agregá al menos un producto a producir.</td></tr>
          )}
        </tbody>
      </table>

      {/* Consumos (opcional / receta) */}
      <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Consumos (insumos)</div>
        <button onClick={addInsumo} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}>+ Agregar</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>Insumo</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Cantidad</th>
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}></th>
          </tr>
        </thead>
        <tbody>
          {(consumos || []).map((r) => (
            <tr key={r.key} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 8px' }}>
                <ProductTypeahead
                  value={r.insumoLabel}
                  selectedId={r.insumoId}
                  onChange={(txt) => upInsumo(r.key, { insumoLabel: txt })}
                  onSelect={(id, label) => upInsumo(r.key, { insumoId: id, insumoLabel: label ?? '' })}
                />
              </td>
              <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                <input type="number" step="any" min="0" value={r.qty}
                       onChange={(e) => upInsumo(r.key, { qty: e.target.value })}
                       style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: 120, textAlign: 'right' }} />
              </td>
              <td style={{ padding: '8px 8px' }}>
                <button onClick={() => delInsumo(r.key)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {(consumos || []).length === 0 && (
            <tr><td colSpan={3} style={{ padding: 16, color: '#64748b' }}>Podés cargar manual o usar “Cargar receta”.</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginTop: 16 }}>
        <div />
        <div>
          <button
            onClick={onSubmit}
            disabled={!canSave}
            style={{
              width: '100%', padding: '10px 12px',
              border: '1px solid #cbd5e1', borderRadius: 10,
              background: canSave ? '#ffffff' : '#f1f5f9',
              cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 600,
            }}
          >
            Guardar OP (Planificada)
          </button>
          {!canSave && <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>Completá fecha y al menos un producto con cantidad &gt; 0.</div>}
        </div>
      </div>
    </div>
  );
}