import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { http } from '../lib/http.js';
import { fmtCurrency } from '../lib/format.js';

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR');
}

async function fetchSalesFn({ queryKey }) {
  const [_key, { from, to, sort }] = queryKey;
  const params = { page: 1, limit: 50 };
  if (sort) params.sort = sort;
  if (from) params.from = from;
  if (to)   params.to = to;

  // 1) Intento contra /sales/search (si existiera)
  try {
    const { data } = await http.get('/sales/search', { params });
    return data?.items ?? data ?? [];
  } catch (_e) {
    // 2) Fallback contra /orders/search (ya probado que existe)
    const { data } = await http.get('/orders/search', { params });
    return data?.items ?? data ?? [];
  }
}

export default function Sales() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [sort, setSort] = useState('-date');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sales.search', { from, to, sort }],
    queryFn: fetchSalesFn,
  });

  const items = data ?? [];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Ventas</h1>
        <Link
          to="/sales/new"
          style={{
            background: '#0ea5e9',
            color: '#fff',
            padding: '8px 10px',
            borderRadius: 6,
            textDecoration: 'none'
          }}
        >
          + Nueva venta
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#475569' }}>Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#475569' }}>Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#475569' }}>Orden</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px' }}
          >
            <option value="-date">Fecha ↓</option>
            <option value="date">Fecha ↑</option>
            <option value="-total">Total ↓</option>
            <option value="total">Total ↑</option>
          </select>
        </div>
      </div>

      {isError && (
        <div style={{ color: '#b91c1c', marginBottom: 8 }}>
          Error cargando ventas{error?.message ? `: ${error.message}` : ''}.
        </div>
      )}

      {isLoading ? (
        <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: '#64748b' }}>Sin ventas para el filtro seleccionado.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>ID</th>
              <th style={{ padding: '8px 6px' }}>Fecha</th>
              <th style={{ padding: '8px 6px' }}>Cliente</th>
              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 6px' }}>{'saleNumber' in o ? o.saleNumber : o.id}</td>
                <td style={{ padding: '8px 6px' }}>{fmtDate(o.date)}</td>
                <td style={{ padding: '8px 6px' }}>{o.client?.name || o.client || o.clientId || '-'}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                  {fmtCurrency(o.total ?? o.subtotal ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
