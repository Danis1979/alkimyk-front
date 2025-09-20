// src/pages/SalesNew.jsx
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtCurrency } from '../lib/format';
import { createSale } from '../services/sales.service';
import ClientTypeahead from '../components/ClientTypeahead';
import ProductTypeahead from '../components/ProductTypeahead';

const PM_OPTS = [
  { value: 'Contado',         label: 'Contado' },
  { value: 'Transferencia',   label: 'Transferencia' },
  { value: 'Cheque',          label: 'Cheque' },
  { value: 'CuentaCorriente', label: 'Cuenta Corriente' },
];

function todayYMD() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

export default function SalesNew() {
  const navigate = useNavigate();

  // Cabecera
  const [date, setDate] = useState(todayYMD());
  const [pm, setPm] = useState('Contado');

  // Cliente (puede ser ID o texto — si no hay endpoint de clientes, se envía el texto)
  const [clientId, setClientId] = useState(null);
  const [clientLabel, setClientLabel] = useState('');

  // Ítems
  const [items, setItems] = useState([{ key: 1, productId: null, productLabel: '', qty: 1, price: 0 }]);

  // Estado UI
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, it) => acc + num(it.qty) * num(it.price), 0);
    const iva = 0; // si después se necesita, lo calculamos acá
    return { subtotal, iva, total: subtotal + iva };
  }, [items]);

  const canSave = useMemo(() => {
    const hasClient = !!clientId || clientLabel.trim().length > 0;
    if (!hasClient || !date) return false;
    const valid = items.filter(it => (it.productId || it.productLabel.trim()) && num(it.qty) > 0);
    return valid.length > 0;
  }, [clientId, clientLabel, date, items]);

  const addItem = () => {
    const maxKey = items.reduce((m, it) => Math.max(m, it.key), 0);
    setItems([...items, { key: maxKey + 1, productId: null, productLabel: '', qty: 1, price: 0 }]);
  };
  const removeItem = (key) => setItems(items.filter(it => it.key !== key));
  const updateItem = (key, patch) => setItems(items.map(it => (it.key === key ? { ...it, ...patch } : it)));

  const onSubmit = async () => {
    setErrorMsg('');
    setSubmitting(true);

    const payload = {
      // Modelo acordado
      clientId: clientId ?? null,
      // mandamos también “client” textual si el usuario tipea (el backend puede ignorarlo si usa clientId)
      client: clientLabel.trim() || null,

      fecha: new Date(date).toISOString(),
      pm,
      estado: 'Confirmada',

      items: items
        .filter(it => (it.productId || it.productLabel.trim()) && num(it.qty) > 0)
        .map(it => ({
          productId: it.productId ?? null,
          // field libre por si el backend permite renglón manual; si no, lo ignorará
          product: it.productLabel.trim() || null,
          qty: num(it.qty),
          price: num(it.price),
        })),

      subtotal: totals.subtotal,
      iva: totals.iva,
      total: totals.total,

      // AFIP opcional (si el backend factura luego, se completará más tarde)
      afip: null,
    };

    try {
      const data = await createSale(payload);
      // Navegamos al detalle si viene id, sino a listado
      if (data?.id) {
        navigate(`/orders/${data.id}`, { replace: true });
      } else {
        navigate('/sales', { replace: true });
      }
    } catch (err) {
      // Si el endpoint /sales todavía no está arriba, mostramos el JSON que se intentó enviar
      console.warn('POST /sales failed', err, payload);
      setErrorMsg('No se pudo guardar la venta. Verificá el backend /sales.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Nueva venta</h1>
        <Link
          to="/sales"
          style={{
            textDecoration: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 14,
            background: '#fff',
          }}
        >
          ← Volver
        </Link>
      </div>

      {/* Cabecera */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 220px', gap: 12, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Cliente</label>
          <ClientTypeahead
            value={clientLabel}
            selectedId={clientId}
            onChange={(txt) => setClientLabel(txt)}
            onSelect={(id, label) => { setClientId(id); setClientLabel(label ?? ''); }}
          />
          {clientId && <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>Seleccionado: #{clientId}</div>}
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Medio de pago</label>
          <select
            value={pm}
            onChange={(e) => setPm(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            {PM_OPTS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ítems */}
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Ítems</div>
        <button
          onClick={addItem}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
        >
          + Agregar ítem
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>Producto</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Cantidad</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Precio</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Importe</th>
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }} />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const line = num(it.qty) * num(it.price);
            return (
              <tr key={it.key} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 8px' }}>
                  <ProductTypeahead
                    value={it.productLabel}
                    selectedId={it.productId}
                    onChange={(txt) => updateItem(it.key, { productLabel: txt })}
                    onSelect={(id, label, price) => {
                      const patch = { productId: id, productLabel: label ?? '' };
                      if (!num(it.price) && num(price) > 0) patch.price = Number(price);
                      updateItem(it.key, patch);
                    }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={it.qty}
                    onChange={(e) => updateItem(it.key, { qty: e.target.value })}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: 110, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={it.price}
                    onChange={(e) => updateItem(it.key, { price: e.target.value })}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: 130, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {fmtCurrency(line)}
                </td>
                <td style={{ padding: '8px 8px' }}>
                  <button
                    onClick={() => removeItem(it.key)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, color: '#64748b' }}>
                Sin renglones. Agregá uno con “+ Agregar ítem”.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
        <div />
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#475569' }}>Subtotal</span>
            <strong>{fmtCurrency(totals.subtotal)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#475569' }}>IVA</span>
            <strong>{fmtCurrency(totals.iva)}</strong>
          </div>
          <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>Total</span>
            <strong style={{ fontSize: 18 }}>{fmtCurrency(totals.total)}</strong>
          </div>

          {errorMsg && (
            <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>
              {errorMsg}
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={!canSave || submitting}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              background: canSave && !submitting ? '#ffffff' : '#f1f5f9',
              cursor: canSave && !submitting ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
          {!canSave && (
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              Completá cliente y al menos un ítem con cantidad &gt; 0.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}