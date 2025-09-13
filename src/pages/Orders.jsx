// src/pages/Orders.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http';
import { fmtCurrency, fmtDate } from '../lib/format';
import RangeControls from '../components/RangeControls';

const PAGE_SIZE_DEFAULT = 5;

export default function Orders() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page') || 1));
  const limit = Math.max(1, Number(sp.get('limit') || PAGE_SIZE_DEFAULT));

  // filtro opcional de rango (YYYY-MM) como en Dashboard
  const [range, setRange] = useState({ from: '', to: '' });

  const qk = useMemo(
    () => ['orders', { page, limit, from: range.from || null, to: range.to || null }],
    [page, limit, range],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: qk,
    queryFn: async ({ queryKey }) => {
      const [, { page, limit, from, to }] = queryKey;
      const params = { page, limit };
      if (from) params.from = from;
      if (to)   params.to   = to;
      const r = await http.get('/orders/search', { params });
      return r.data;
    },
    keepPreviousData: true,
    staleTime: 15_000,
    gcTime: 60_000,
  });

  const total   = data?.total ?? 0;
  const items   = data?.items ?? [];
  const hasPrev = page > 1;
  const hasNext = page * limit < total;

  const go = (nextPage) => {
    setSp(prev => {
      const p = new URLSearchParams(prev);
      p.set('page', String(nextPage));
      p.set('limit', String(limit));
      return p;
    });
    // React Query ya re-fetch por cambio de key; esto es por si querés forzar:
    // refetch();
  };

  // si cambian from/to, reseteo a página 1
  useEffect(() => {
    setSp(prev => {
      const p = new URLSearchParams(prev);
      p.set('page', '1');
      p.set('limit', String(limit));
      return p;
    });
  }, [range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Órdenes</h1>
        <small style={{ color: '#6b7280' }}>page={page} • limit={limit} {isFetching && '• actualizando…'}</small>
      </header>

      <section style={{ marginBottom: 12 }}>
        <RangeControls
          onChange={(r) => { setRange(r); refetch(); }}
        />
        <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
          {range.from || range.to
            ? <>Rango: <code>{range.from || '(auto)'}</code> → <code>{range.to || '(auto)'}</code></>
            : <>Sin rango (usa valores por defecto del API)</>}
        </div>
      </section>

      {isLoading && <div>Cargando órdenes…</div>}
      {isError && <div style={{ color: 'crimson' }}>Error: {String(error?.message || 'desconocido')}</div>}

      {!isLoading && items.length === 0 && (
        <div style={{ color: '#6b7280', marginTop: 8 }}>(No hay órdenes para el criterio actual)</div>
      )}

      {items.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <thead style={{ background: '#f3f4f6' }}>
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
                <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{o.id}</td>
                  <td style={td}>{fmtDate(o.date)}</td>
                  <td style={td}>{o.client || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtCurrency(o.total || 0)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Link to={`/orders/${o.id}`} style={{ textDecoration: 'none' }}>Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <small style={{ color: '#6b7280' }}>
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
            </small>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => go(page - 1)} disabled={!hasPrev}>Anterior</button>
              <button onClick={() => go(page + 1)} disabled={!hasNext}>Siguiente</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 14, color: '#374151' };
const td = { padding: '10px 12px', fontSize: 14, color: '#111827' };