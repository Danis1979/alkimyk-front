// src/pages/Sales.jsx
import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSales } from '../services/sales.service';
import { fmtCurrency } from '../lib/format';

const API = import.meta.env.VITE_API_BASE_URL || '';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function toneForPm(pm) {
  const k = String(pm || '').toLowerCase();
  if (k.includes('contado')) return 'green';
  if (k.includes('transfer')) return 'blue';
  if (k.includes('cheque')) return 'amber';
  if (k.includes('corriente')) return 'violet';
  return 'slate';
}

function Badge({ children, tone = 'slate' }) {
  const palette = {
    slate:  { bg: '#f1f5f9', fg: '#334155', br: '#e2e8f0' },
    green:  { bg: '#ecfdf5', fg: '#065f46', br: '#a7f3d0' },
    blue:   { bg: '#eff6ff', fg: '#1e3a8a', br: '#bfdbfe' },
    amber:  { bg: '#fffbeb', fg: '#92400e', br: '#fde68a' },
    violet: { bg: '#f5f3ff', fg: '#4c1d95', br: '#ddd6fe' },
  }[tone] || { bg: '#f1f5f9', fg: '#334155', br: '#e2e8f0' };

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 12,
        padding: '2px 8px',
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.br}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export default function Sales() {
  const [sp, setSp] = useSearchParams();

  // Defaults + lectura desde URL
  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort  = sp.get('sort') || '-fecha'; // -fecha | fecha | -total | total
  const q     = sp.get('q') || '';
  const from  = sp.get('from') || '';       // YYYY-MM-DD
  const to    = sp.get('to') || '';

  const queryKey = useMemo(
    () => ['sales.search', { page, limit, sort, q, from, to }],
    [page, limit, sort, q, from, to]
  );

  // Helpers para escribir params y resetear page cuando cambian filtros
  const setParam = (key, value, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchSales({ page, limit, sort, q, from, to }),
    keepPreviousData: true,
  });

  const items   = data?.items ?? [];
  const total   = data?.total;
  const pages   = data?.pages;
  const hasNext = (typeof pages === 'number') ? (page < pages) : (items.length === limit);

  // Rango mostrado (1-indexed)
  const startIdx = (page - 1) * limit + (items.length ? 1 : 0);
  const endIdx   = (page - 1) * limit + items.length;

  // CSV: usamos /reports/orders.csv (compatible para ventas)
  const csvQS = new URLSearchParams();
  if (from) csvQS.set('from', from);
  if (to)   csvQS.set('to', to);
  if (q)    csvQS.set('q', q);
  if (sort) csvQS.set('sort', sort === 'fecha' ? 'date' : (sort === '-fecha' ? '-date' : sort));
  const csvHref = `${API}/reports/orders.csv${csvQS.toString() ? `?${csvQS}` : ''}`;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Ventas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={csvHref}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
          >
            ⬇︎ Exportar CSV
          </a>
          <Link
            to="/sales/new"
            style={{
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 14,
            }}
          >
            + Nueva venta
          </Link>
        </div>
      </div>

      {/* Controles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 140px 160px 140px',
          gap: 12,
          alignItems: 'end',
          marginBottom: 12,
        }}
      >
        <div>
          <Label>Buscar (cliente / id)</Label>
          <input
            type="text"
            value={q}
            onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
            placeholder="Ej: Green & Co"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>

        <div>
          <Label>Desde</Label>
          <input
            type="date"
            value={from}
            onChange={(e) => setParam('from', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>

        <div>
          <Label>Hasta</Label>
          <input
            type="date"
            value={to}
            onChange={(e) => setParam('to', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>

        <div>
          <Label>Orden</Label>
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="-fecha">Fecha desc.</option>
            <option value="fecha">Fecha asc.</option>
            <option value="-total">Total desc.</option>
            <option value="total">Total asc.</option>
          </select>
        </div>

        <div>
          <Label>Tamaño página</Label>
          <select
            value={String(limit)}
            onChange={(e) => setParam('limit', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="10">10 filas</option>
            <option value="20">20 filas</option>
            <option value="50">50 filas</option>
          </select>
        </div>
      </div>

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando ventas.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Fecha</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Cliente</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Pago</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Total</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const pm = o.raw?.pm ?? o.raw?.paymentMethod ?? o.pm ?? '';
              const tone = toneForPm(pm);
              return (
                <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px' }}>#{o.id}</td>
                  <td style={{ padding: '10px 8px' }}>{o.fecha ? new Date(o.fecha).toLocaleDateString('es-AR') : '-'}</td>
                  <td style={{ padding: '10px 8px' }}>{o.client}</td>
                  <td style={{ padding: '10px 8px' }}>
                    {pm ? <Badge tone={tone}>{pm}</Badge> : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(o.total)}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <Link to={`/orders/${o.id}`} style={{ textDecoration: 'none' }}>
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: '#64748b' }}>
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Paginación + resumen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#475569' }}>
          {total != null
            ? `Mostrando ${startIdx || 0}–${endIdx || 0} de ${total} · Página ${page}${pages ? ` / ${pages}` : ''}`
            : `Página ${page} · ${items.length} de ${limit}`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setParam('page', String(page - 1))}
            disabled={page <= 1}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: page <= 1 ? '#f1f5f9' : '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => setParam('page', String(page + 1))}
            disabled={!hasNext}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: !hasNext ? '#f1f5f9' : '#fff',
              cursor: !hasNext ? 'not-allowed' : 'pointer',
            }}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}