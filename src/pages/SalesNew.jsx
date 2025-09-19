// src/pages/SalesNew.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listClients, listProducts, createSaleTx } from '../services/sales.service';
import { fmtCurrency } from '../lib/format';

function todayYMD() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function SalesNew() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayYMD());
  const [clientId, setClientId] = useState('');
  const [pm, setPm] = useState('Contado'); // Contado|Transferencia|Cheque|CuentaCorriente
  const [items, setItems] = useState([
    { productId: '', qty: 1, price: 0 }
  ]);
  const [note, setNote] = useState('');

  // Carga de maestros
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients', 100],
    queryFn: () => listClients(100),
    staleTime: 60_000,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', 100],
    queryFn: () => listProducts(100),
    staleTime: 60_000,
  });

  // Mapa productId -> producto para precio sugerido
  const prodMap = useMemo(() => {
    const m = new Map();
    products.forEach(p => m.set(String(p.id), p));
    return m;
  }, [products]);

  // Totales
  const subtotal = items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const total = subtotal; // por ahora, sin IVA

  function setItem(index, patch) {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addRow() {
    setItems(prev => [...prev, { productId: '', qty: 1, price: 0 }]);
  }

  function removeRow(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  // Cuando cambie el productId, sugerimos price (precioLista si existe)
  useEffect(() => {
    setItems(prev =>
      prev.map(it => {
        if (!it.productId) return it;
        const p = prodMap.get(String(it.productId));
        if (!p) return it;
        // usa p.precioLista o p.price o p.costoStd como fallback
        const suggested = p.precioLista ?? p.price ?? p.costoStd ?? it.price ?? 0;
        return { ...it, price: it.price > 0 ? it.price : suggested };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prodMap]);

  // Validación simple
  const issues = [];
  if (!date) issues.push('Fecha requerida');
  if (!clientId) issues.push('Cliente requerido');
  if (items.length === 0) issues.push('Debe cargar al menos un renglón');
  if (items.some(it => !it.productId || !(Number(it.qty) > 0))) issues.push('Items: producto y cantidad > 0');
  if (items.some(it => !(Number(it.price) >= 0))) issues.push('Items: precio inválido');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createSaleTx,
  });

  async function onSubmit(e) {
    e.preventDefault();
    if (issues.length) return;

    const payload = {
      date,                               // 'YYYY-MM-DD'
      clientId: Number(clientId),
      pm,                                 // Contado|Transferencia|Cheque|CuentaCorriente
      note: note || undefined,
      items: items
        .filter(it => it.productId && Number(it.qty) > 0)
        .map(it => ({
          productId: Number(it.productId),
          qty: Number(it.qty),
          price: Number(it.price),
        })),
    };

    try {
      await mutateAsync(payload);
      // éxito: volvemos al listado
      navigate('/sales', { replace: true });
    } catch (err) {
      console.error('createSaleTx error', err);
      alert('No se pudo guardar la venta.\n' + (err?.response?.data?.message || err.message || ''));
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Nueva venta</h1>
      </div>

      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                   style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', width: '100%' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
                    disabled={loadingClients}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', width: '100%' }}>
              <option value="">Seleccionar…</option>
              {(clients || []).map(c => (
                <option key={c.id} value={c.id}>{c.nombre || c.name || c.razonSocial || `#${c.id}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Medio de pago</label>
            <select value={pm} onChange={e => setPm(e.target.value)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', width: '100%' }}>
              <option>Contado</option>
              <option>Transferencia</option>
              <option>Cheque</option>
              <option>CuentaCorriente</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Observaciones</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
                    rows={2}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', width: '100%' }} />
        </div>

        {/* Items */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Producto</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid #e2e8f0', width: 120 }}>Cantidad</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid #e2e8f0', width: 160 }}>Precio</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid #e2e8f0', width: 160 }}>Importe</th>
                <th style={{ width: 60, borderBottom: '1px solid #e2e8f0' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const imp = (Number(it.qty) || 0) * (Number(it.price) || 0);
                return (
                  <tr key={idx}>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>
                      <select
                        value={it.productId}
                        onChange={e => setItem(idx, { productId: e.target.value })}
                        disabled={loadingProducts}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', width: '100%' }}
                      >
                        <option value="">Seleccionar…</option>
                        {(products || []).map(p => (
                          <option key={p.id} value={p.id}>{p.name || p.nombre || p.sku || `#${p.id}`}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <input type="number" min="0" step="1" value={it.qty}
                             onChange={e => setItem(idx, { qty: e.target.value })}
                             style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', width: '100%', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <input type="number" min="0" step="0.01" value={it.price}
                             onChange={e => setItem(idx, { price: e.target.value })}
                             style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', width: '100%', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      {fmtCurrency(imp)}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <button type="button"
                              onClick={() => removeRow(idx)}
                              title="Eliminar renglón"
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white' }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ padding: 8 }}>
                  <button type="button" onClick={addRow}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc' }}>
                    + Agregar renglón
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 12, fontSize: 16 }}>
          <div><strong>Total:</strong> {fmtCurrency(total)}</div>
        </div>

        {/* Errores y acciones */}
        {issues.length > 0 && (
          <div style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
            {issues.join(' • ')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="submit" disabled={isPending || issues.length > 0}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#0ea5e9', color: 'white' }}>
            {isPending ? 'Guardando…' : 'Guardar venta'}
          </button>
          <button type="button" onClick={() => navigate('/sales')}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}