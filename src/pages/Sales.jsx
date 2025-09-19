import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fmtCurrency } from '../lib/format.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-AR', { timeZone: 'UTC' });
  } catch {
    return iso;
  }
}

export default function Sales() {
  // Por ahora listamos las últimas 50 “ventas” desde orders/search (fallback)
  const url = useMemo(() =>
    `${API}/orders/search?limit=50&page=1&sort=-date`,
  []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales.list', { url }],
    queryFn: async () => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch_failed');
      return res.json();
    },
    staleTime: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Ventas</h1>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          fuente: <code>/orders/search</code> (fallback hasta tener <code>/sales</code>)
        </span>
        <div style={{ marginLeft: 'auto' }}>
          {/* Botón placeholder para “Nueva venta” */}
          <button
            type="button"
            disabled
            title="Próximamente"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#f1f5f9',
              color: '#475569',
              cursor: 'not-allowed',
            }}
          >
            + Nueva venta
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>
      )}
      {isError && (
        <div style={{ color: '#b91c1c', marginBottom: 8 }}>
          No se pudieron cargar las ventas.
        </div>
      )}

      {(!isLoading && items.length === 0) ? (
        <div style={{ color: '#64748b' }}>No hay ventas para mostrar.</div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            overflow: 'hidden',
            fontSize: 14,
          }}
        >
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Cliente</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Total</th>
              <th style={{ width: 80, borderBottom: '1px solid #e2e8f0' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>
                  {fmtDate(o.date)}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>
                  {o.client || '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                  {fmtCurrency(o.total)}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <Link to={`/orders/${o.id}`} style={{ color: '#2563eb' }}>
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}