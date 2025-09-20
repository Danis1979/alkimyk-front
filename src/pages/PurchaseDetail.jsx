// src/pages/PurchaseDetail.jsx
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPurchaseById } from '../services/purchases.service';
import { fmtCurrency } from '../lib/format';

export default function PurchaseDetail() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase.detail', id],
    queryFn: () => fetchPurchaseById(id),
  });

  const header = data || {};
  const items = header.items || [];

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Compra #{id}</h1>
        <Link to="/purchases" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
          ← Volver a compras
        </Link>
      </div>

      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando compra.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {!isLoading && (
        <>
          {/* Header */}
          <div style={{
            border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginBottom: 12,
            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 12
          }}>
            <div><div style={{ fontSize: 12, color: '#64748b' }}>Proveedor</div><div>{header.supplier || '—'}</div></div>
            <div><div style={{ fontSize: 12, color: '#64748b' }}>Fecha</div><div>{header.fecha ? new Date(header.fecha).toLocaleDateString('es-AR') : '—'}</div></div>
            <div><div style={{ fontSize: 12, color: '#64748b' }}>Medio de pago</div><div>{header.pm || '—'}</div></div>
            <div><div style={{ fontSize: 12, color: '#64748b' }}>Estado</div><div>{header.estado || '—'}</div></div>
          </div>

          {/* Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>Insumo / Producto</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Cantidad</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Precio</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 8px' }}>{it.product || ('#' + (it.productId ?? ''))}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>{it.qty}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>{fmtCurrency(it.price)}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>{fmtCurrency(it.lineTotal ?? (it.qty * it.price))}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 16, color: '#64748b' }}>Sin ítems.</td></tr>
              )}
            </tbody>
          </table>

          {/* Totales */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
            <div />
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#475569' }}>Subtotal</span><strong>{fmtCurrency(header.subtotal ?? 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#475569' }}>IVA</span><strong>{fmtCurrency(header.iva ?? 0)}</strong>
              </div>
              <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Total</span>
                <strong style={{ fontSize: 18 }}>{fmtCurrency(header.total ?? 0)}</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}