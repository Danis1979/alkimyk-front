import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtCurrency } from '../lib/format';
import { http } from '../lib/http';
import SupplierTypeahead from '../components/SupplierTypeahead';
import ProductTypeahead from '../components/ProductTypeahead';

const PM_OPTS = [
  { value: 'Contado',        label: 'Contado' },
  { value: 'Transferencia',  label: 'Transferencia' },
  { value: 'Cheque',         label: 'Cheque' },
  { value: 'CuentaCorriente',label: 'Cuenta Corriente' },
];

function todayYMD() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function number(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

export default function PurchasesNew() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayYMD());
  const [pm, setPm] = useState('Contado');

  // Proveedor
  const [supplierId, setSupplierId] = useState(null);
  const [supplierLabel, setSupplierLabel] = useState('');

  // Ítems: usaremos productId (el backend acepta insumoId|productId)
  const [items, setItems] = useState([
    { key: 1, productId: null, productLabel: '', qty: 1, price: 0 },
  ]);

  const totals = useMemo(() => {
    const total = items.reduce((acc, it) => acc + number(it.qty) * number(it.price), 0);
    return { total };
  }, [items]);

  const canSave = useMemo(() => {
    const hasSupplier = !!supplierId || supplierLabel.trim().length > 0;
    if (!hasSupplier || !date) return false;
    const valid = items.filter(it => (it.productLabel.trim() || it.productId) && number(it.qty) > 0);
    return valid.length > 0;
  }, [supplierId, supplierLabel, date, items]);

  const addItem = () => {
    const maxKey = items.reduce((m, it) => Math.max(m, it.key), 0);
    setItems([...items, { key: maxKey + 1, productId: null, productLabel: '', qty: 1, price: 0 }]);
  };
  const removeItem = (key) => setItems(items.filter(it => it.key !== key));
  const updateItem = (key, patch) => setItems(items.map(it => (it.key === key ? { ...it, ...patch } : it)));

  const onSubmit = async () => {
    const payload = {
      supplierId,
      supplier: supplierLabel.trim() || null,
      fecha: new Date(date).toISOString(),
      pm,
      estado: 'Confirmada',
      items: items
        .filter(it => (it.productId || it.productLabel.trim()) && number(it.qty) > 0)
        .map(it => ({
          productId: it.productId,                 // el backend acepta insumoId|productId
          product: it.productLabel.trim() || null, // nombre libre si no hay id
          qty: number(it.qty),
          price: number(it.price),
        })),
      total: totals.total,
    };
    try {
      const { data } = await http.post('/purchases', payload);
      if (data?.id) { navigate('/purchases', { replace: true }); return; }
      navigate('/purchases', { replace: true });
    } catch (err) {
      console.warn('POST /purchases no disponible. Preview:', payload, err);
      alert('No se pudo enviar (¿/purchases listo?). JSON:\n\n' + JSON.stringify(payload, null, 2));
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Nueva compra</h1>
        <Link to="/purchases" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}>← Volver</Link>
      </div>

      {/* Cabecera */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 220px', gap: 12, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Proveedor</label>
          <SupplierTypeahead
            value={supplierLabel}
            selectedId={supplierId}
            onChange={(txt) => setSupplierLabel(txt)}
            onSelect={(id, label) => { setSupplierId(id); setSupplierLabel(label ?? ''); }}
          />
          {supplierId && <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>Seleccionado: #{supplierId}</div>}
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Medio de pago</label>
          <select value={pm} onChange={(e) => setPm(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}>
            {PM_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Ítems */}
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Ítems</div>
        <button onClick={addItem} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}>+ Agregar ítem</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Insumo / Producto</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Cantidad</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Precio</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Importe</th>
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const line = number(it.qty) * number(it.price);
            return (
              <tr key={it.key} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 8px' }}>
                  <ProductTypeahead
                    placeholder="Insumo o producto…"
                    value={it.productLabel}
                    selectedId={it.productId}
                    onChange={(txt) => updateItem(it.key, { productLabel: txt })}
                    onSelect={(id, label, price) => {
                      const patch = { productId: id, productLabel: label ?? '' };
                      if (!number(it.price) && Number.isFinite(+price) && +price > 0) patch.price = +price;
                      updateItem(it.key, patch);
                    }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <input
                    type="number" inputMode="decimal" step="any" min="0"
                    value={it.qty}
                    onChange={(e) => updateItem(it.key, { qty: e.target.value })}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: 110, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <input
                    type="number" inputMode="decimal" step="any" min="0"
                    value={it.price}
                    onChange={(e) => updateItem(it.key, { price: e.target.value })}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: 130, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCurrency(line)}</td>
                <td style={{ padding: '8px 8px' }}>
                  <button onClick={() => removeItem(it.key)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}>Eliminar</button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 16, color: '#64748b' }}>Sin renglones. Agregá uno con “+ Agregar ítem”.</td></tr>
          )}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
        <div />
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>Total</span><strong style={{ fontSize: 18 }}>{fmtCurrency(totals.total)}</strong>
          </div>
          <button onClick={onSubmit} disabled={!canSave} style={{ marginTop: 12, width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: canSave ? '#ffffff' : '#f1f5f9', cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
            Guardar
          </button>
          {!canSave && <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>Completá proveedor y al menos un ítem con cantidad &gt; 0.</div>}
        </div>
      </div>
    </div>
  );
}
