// src/pages/SalesNew.jsx
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtCurrency } from '../lib/format';
import { http } from '../lib/http';

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

function number(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export default function SalesNew() {
  const navigate = useNavigate();

  // Datos de cabecera
  const [date, setDate] = useState(todayYMD());
  const [clientName, setClientName] = useState('');
  const [pm, setPm] = useState('Contado'); // medio de pago
  // (Futuro: clientId y productId via typeahead. Hoy: nombre libre)

  // Ítems
  const [items, setItems] = useState([
    { key: 1, product: '', qty: 1, price: 0 },
  ]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, it) => acc + number(it.qty) * number(it.price), 0);
    const iva = 0; // Simplificado por ahora (se puede parametrizar)
    const total = subtotal + iva;
    return { subtotal, iva, total };
  }, [items]);

  const canSave = useMemo(() => {
    if (!clientName.trim()) return false;
    if (!date) return false;
    const validLines = items.filter(
      it => it.product.trim() && number(it.qty) > 0 && number(it.price) >= 0
    );
    return validLines.length > 0;
  }, [clientName, date, items]);

  const addItem = () => {
    const maxKey = items.reduce((m, it) => Math.max(m, it.key), 0);
    setItems([...items, { key: maxKey + 1, product: '', qty: 1, price: 0 }]);
  };

  const removeItem = (key) => {
    setItems(items.filter(it => it.key !== key));
  };

  const updateItem = (key, field, value) => {
    setItems(items.map(it => (it.key === key ? { ...it, [field]: value } : it)));
  };

  const onSubmit = async () => {
    const payload = {
      // Modelo compatible con lo que definiste (con IDs a futuro)
      clientId: null,               // (futuro: seleccionar cliente y setear id)
      client: clientName.trim(),    // guardamos nombre libre por ahora
      fecha: new Date(date).toISOString(),
      pm,
      estado: 'Confirmada',
      items: items
        .filter(it => it.product.trim() && number(it.qty) > 0)
        .map(it => ({
          productId: null,          // (futuro: usar id)
          product: it.product.trim(),
          qty: number(it.qty),
          price: number(it.price),
        })),
      subtotal: totals.subtotal,
      iva: totals.iva,
      total: totals.total,
      afip: null,                   // (futuro)
    };

    try {
      // Si existe tu endpoint real:
      const { data } = await http.post('/sales', payload);
      // Si devuelve id, podríamos ir a detalle:
      if (data?.id) {
        navigate(`/orders/${data.id}`, { replace: true });
        return;
      }
      // Si no hay id, volver al listado
      navigate('/sales', { replace: true });
    } catch (err) {
      // Modo “seguro”: si el backend no está listo, mostramos preview del JSON
      console.warn('POST /sales falló o no existe. Preview del payload:', payload, err);
      alert(
        'No se pudo enviar al backend (¿endpoint /sales listo?). ' +
        'Te muestro el JSON que se enviaría:\n\n' +
        JSON.stringify(payload, null, 2)
      );
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
          }}
        >
          ← Volver
        </Link>
      </div>

      {/* Cabecera */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 220px 220px',
          gap: 12,
          alignItems: 'end',
          marginBottom: 14,
        }}
      >
        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>
            Cliente
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ej: Green & Co"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>
            Medio de pago
          </label>
          <select
            value={pm}
            onChange={(e) => setPm(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            {PM_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Producto</th>
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
                  <input
                    type="text"
                    placeholder="Producto"
                    value={it.product}
                    onChange={(e) => updateItem(it.key, 'product', e.target.value)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: '100%' }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <input
                    type="number" inputMode="decimal" step="any" min="0"
                    value={it.qty}
                    onChange={(e) => updateItem(it.key, 'qty', e.target.value)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: 110, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <input
                    type="number" inputMode="decimal" step="any" min="0"
                    value={it.price}
                    onChange={(e) => updateItem(it.key, 'price', e.target.value)}
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

      {/* Totales + Guardar */}
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

          <button
            onClick={onSubmit}
            disabled={!canSave}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              background: canSave ? '#ffffff' : '#f1f5f9',
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >
            Guardar
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