// src/pages/SalesNew.jsx
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { fmtCurrency } from '../lib/format';
import { http } from '../lib/http';
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
function number(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

export default function SalesNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Cabecera
  const [date, setDate] = useState(todayYMD());
  const [pm, setPm] = useState('Contado');

  // Cliente (ID obligatorio para respetar backend)
  const [clientId, setClientId] = useState(null);
  const [clientLabel, setClientLabel] = useState('');

  // Ítems (productId obligatorio)
  const [items, setItems] = useState([
    { key: 1, productId: null, productLabel: '', qty: 1, price: 0 },
  ]);

  // Campos opcionales para UI (no obligatorios para backend)
  // Cuenta Corriente: dejar que backend determine vencimiento según condicionesPago
  const [vence, setVence] = useState('');

  // Cheque (por si querés registrar datos; backend puede ignorarlo si no lo usa)
  const [chBanco, setChBanco]   = useState('');
  const [chNumero, setChNumero] = useState('');
  const [chPago, setChPago]     = useState('');
  const [chImporte, setChImporte] = useState('');

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, it) => acc + number(it.qty) * number(it.price), 0);
    const iva = 0; // por ahora
    return { subtotal, iva, total: subtotal + iva };
  }, [items]);

  // Validaciones estrictas según modelo
  const validItems = useMemo(
    () => items.filter(it => it.productId && number(it.qty) > 0 && number(it.price) >= 0),
    [items]
  );
  const itemsAllValid = validItems.length === items.length && items.length > 0;
  const canSave = Boolean(clientId) && Boolean(date) && itemsAllValid;

  const addItem = () => {
    const maxKey = items.reduce((m, it) => Math.max(m, it.key), 0);
    setItems([...items, { key: maxKey + 1, productId: null, productLabel: '', qty: 1, price: 0 }]);
  };
  const removeItem = (key) => setItems(items.filter(it => it.key !== key));
  const updateItem = (key, patch) => setItems(items.map(it => (it.key === key ? { ...it, ...patch } : it)));

  async function onSubmit() {
    // Payload que respeta el modelo de sales del backend
    const payload = {
      clientId,
      fecha: new Date(date).toISOString(),
      pm,
      estado: 'Confirmada',
      items: items.map(it => ({
        productId: it.productId,
        qty: number(it.qty),
        price: number(it.price),
      })),
      subtotal: totals.subtotal,
      iva: totals.iva,
      total: totals.total,
    };

    // Opcional: si querés enviar metadatos de CC o Cheque (el backend puede ignorarlos)
    if (pm === 'CuentaCorriente' && vence) {
      payload.vence = vence; // si tu backend lo soporta, lo aprovechará para receivable
    }
    if (pm === 'Cheque') {
      const obj = {
        banco: chBanco || undefined,
        numero: chNumero || undefined,
        pago: chPago ? new Date(chPago).toISOString() : undefined,
        importe: chImporte ? number(chImporte) : totals.total,
      };
      // solo adjuntamos si hay algo cargado
      if (obj.banco || obj.numero || obj.pago || obj.importe) {
        payload.cheque = obj;
      }
    }

    try {
      const { data } = await http.post('/sales', payload);
      // Invalida listas para que aparezca la nueva venta en /sales
      qc.invalidateQueries({ predicate: (q) => {
        const k = Array.isArray(q.queryKey) ? q.queryKey[0] : '';
        return typeof k === 'string' && (k.includes('sales') || k.includes('orders'));
      }});

      // Redirige a detalle si devuelve id, sino a listado
      if (data?.id) {
        navigate(`/orders/${data.id}`, { replace: true });
      } else {
        navigate('/sales', { replace: true });
      }
    } catch (err) {
      console.warn('POST /sales falló', err);
      alert('No se pudo guardar la venta. Verificá que cliente y productos tengan ID válido.\n' +
            'Si aún no están publicados los endpoints de búsqueda, no es posible registrar ventas válidas.');
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Nueva venta</h1>
        <Link
          to="/sales"
          style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
        >
          ← Volver
        </Link>
      </div>

      {/* Cabecera */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 220px', gap: 12, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Cliente (requiere ID)</label>
          <ClientTypeahead
            value={clientLabel}
            selectedId={clientId}
            onChange={(txt) => setClientLabel(txt)}
            onSelect={(id, label) => { setClientId(id); setClientLabel(label ?? ''); }}
          />
          {!clientId && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c' }}>
              Seleccioná un cliente válido (con ID) para poder guardar.
            </div>
          )}
          {clientId && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
              Seleccionado: #{clientId} {clientLabel ? `· ${clientLabel}` : ''}
            </div>
          )}
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
            {PM_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* PM campos condicionales (no obligan al backend) */}
      {pm === 'CuentaCorriente' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12, alignItems: 'end', marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>
              Vencimiento (opcional)
            </label>
            <input
              type="date"
              value={vence}
              onChange={(e) => setVence(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
            />
          </div>
          <div style={{ color: '#64748b', fontSize: 12 }}>
            Si lo dejás vacío, el backend puede calcularlo según condiciones de pago del cliente.
          </div>
        </div>
      )}

      {pm === 'Cheque' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 170px 170px', gap: 12, alignItems: 'end', marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Banco (opcional)</label>
            <input
              type="text"
              value={chBanco}
              onChange={(e) => setChBanco(e.target.value)}
              placeholder="Banco…"
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Número (opcional)</label>
            <input
              type="text"
              value={chNumero}
              onChange={(e) => setChNumero(e.target.value)}
              placeholder="00000000"
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Fecha de pago (opcional)</label>
            <input
              type="date"
              value={chPago}
              onChange={(e) => setChPago(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Importe</label>
            <input
              type="number" inputMode="decimal" step="any" min="0"
              value={chImporte}
              onChange={(e) => setChImporte(e.target.value)}
              placeholder={String(totals.total)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%', textAlign: 'right' }}
            />
          </div>
        </div>
      )}

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
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>Producto (requiere ID)</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Cantidad</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Precio</th>
            <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Importe</th>
            <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const line = number(it.qty) * number(it.price);
            const invalid = !it.productId || !(number(it.qty) > 0) || !(number(it.price) >= 0);
            return (
              <tr key={it.key} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 8px' }}>
                  <ProductTypeahead
                    value={it.productLabel}
                    selectedId={it.productId}
                    onChange={(txt) => updateItem(it.key, { productLabel: txt })}
                    onSelect={(id, label, price) => {
                      const patch = { productId: id, productLabel: label ?? '' };
                      if (!number(it.price) && Number.isFinite(price) && number(price) > 0) {
                        patch.price = Number(price);
                      }
                      updateItem(it.key, patch);
                    }}
                  />
                  {!it.productId && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c' }}>
                      Elegí un producto válido (con ID).
                    </div>
                  )}
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
            <tr><td colSpan={5} style={{ padding: 16, color: '#64748b' }}>Sin renglones. Agregá uno con “+ Agregar ítem”.</td></tr>
          )}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
        <div />
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#475569' }}>Subtotal</span><strong>{fmtCurrency(totals.subtotal)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#475569' }}>IVA</span><strong>{fmtCurrency(totals.iva)}</strong>
          </div>
          <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>Total</span>
            <strong style={{ fontSize: 18 }}>{fmtCurrency(totals.total)}</strong>
          </div>

          <button
            onClick={onSubmit}
            disabled={!canSave}
            style={{
              marginTop: 12, width: '100%', padding: '10px 12px',
              border: '1px solid #cbd5e1', borderRadius: 10,
              background: canSave ? '#ffffff' : '#f1f5f9',
              cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 600
            }}
          >
            Guardar
          </button>

          {!canSave && (
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              Requisitos: cliente con ID + al menos un ítem con producto (ID), cantidad &gt; 0 y precio ≥ 0.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}