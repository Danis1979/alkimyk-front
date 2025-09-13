import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchOrders } from '../services/orders.service';
import { fmtCurrency } from '../lib/format';

export default function Orders() {
  // UI state
  const [q, setQ]         = useState('');
  const [from, setFrom]   = useState(''); // YYYY-MM
  const [to, setTo]       = useState(''); // YYYY-MM
  const [limit, setLimit] = useState(10);
  const [page, setPage]   = useState(1);

  const queryKey = useMemo(() => ['orders', { q, from, to, limit, page }], [q, from, to, limit, page]);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: ({ queryKey, signal }) => {
      const [, p] = queryKey;
      return fetchOrders({ ...p, signal });
    },
    keepPreviousData: true,
    staleTime: 20_000,
    gcTime: 60_000,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;

  const onSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Pedidos</h1>
        {isFetching && <small style={{ color: '#6b7280' }}>(actualizando…)</small>}
      </header>

      {/* Filtros */}
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', marginBottom: 12 }}>
        <div style={{ display: 'grid' }}>
          <label style={{ fontSize: 12, color: '#6b7280' }}>Buscar</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="cliente, número, id…"
            style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8, minWidth: 220 }}
          />
        </div>

        <div style={{ display: 'grid' }}>
          <label style={{ fontSize: 12, color: '#6b7280' }}>Desde (YYYY-MM)</label>
          <input
            type="month"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </div>

        <div style={{ display: 'grid' }}>
          <label style={{ fontSize: 12, color: '#6b7280' }}>Hasta (YYYY-MM)</label>
          <input
            type="month"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </div>

        <div style={{ display: 'grid' }}>
          <label style={{ fontSize: 12, color: '#6b7280' }}>Por página</label>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>

        <button type="submit" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' }}>
          Aplicar
        </button>
      </form>

      {/* Tabla */}
      {isLoading ? (
        <div>Cargando pedidos…</div>
      ) : isError ? (
        <div style={{ color: 'crimson' }}>Error: {String(error?.message || 'desconocido')}</div>
      ) : items.length === 0 ? (
        <div style={{ color: '#6b7280' }}>(No hay resultados con esos filtros)</div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Fecha</th>
                <th style={th}>Cliente</th>
                <th style={th}>Total</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}>{o.id}</td>
                  <td style={td}>{o.date ? new Date(o.date).toLocaleDateString('es-AR') : '—'}</td>
                  <td style={td}>{o.client ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtCurrency(o.total ?? 0)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Link to={`/orders/${o.id}`} style={{ textDecoration: 'none' }}>Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <small style={{ color: '#6b7280' }}>
          Total: {total} • Página {page}/{pages}
        </small>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={btn}
          >Anterior</button>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            style={btn}
          >Siguiente</button>
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: 10, fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e5e7eb' };
const td = { padding: 10, fontSize: 14 };
const btn = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' };
