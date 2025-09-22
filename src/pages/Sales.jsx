// src/pages/Sales.jsx
import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchSales } from '../services/sales.service';
import { fmtCurrency } from '../lib/format';
function Label({ children }) {
  return (
    <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>
      {children}
    </span>
  );
}

export default function Sales() {
  const [sp, setSp] = useSearchParams();

  // URL → estado
  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort  = sp.get('sort') || '-date'; // -date | date | -total | total
  const q     = sp.get('q') || '';
  const onlyFinal = sp.get('onlyFinal') === '1'; // nuevo filtro (front only)

  // filtros de fecha/estado
  const from   = sp.get('from') || '';
  const to     = sp.get('to') || '';
  const status = sp.get('status') || '';

  const queryKey = useMemo(
    () => ['sales.search', { page, limit, sort, q, from, to, status }],
    [page, limit, sort, q, from, to, status]
  );

  // Helpers params
  const setParam = (key, value, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  // Helper YYYY-MM-DD
  const ymd = (d) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt)) return '';
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${mm}-${dd}`;
  };

  // Rango rápido (hoy, 7d, 30d)
  const setRangeDays = (days) => {
    const today = new Date();
    const next = new URLSearchParams(sp);
    next.set('from', ymd(new Date(today.getTime() - (days - 1) * 86400000)));
    next.set('to', ymd(today));
    next.set('page', '1');
    setSp(next, { replace: true });
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => searchSales({ page, limit, sort, q, from, to, status }),
    keepPreviousData: true,
  });

  // Datos + filtro “solo finales” (no rompe backend)
  const baseItems = data?.items ?? [];
  const items = onlyFinal ? baseItems.filter(x => x._origin === 'sales') : baseItems;

  const pageTotal = useMemo(
    () => (items || []).reduce((acc, it) => acc + (Number(it.total) || 0), 0),
    [items]
  );

  // Heurística de paginación si no hay total/páginas
  const hasNext = items.length === limit;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Ventas</h1>
        <Link
          to="/sales/new"
          style={{
            textDecoration: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 14,
            background: '#fff',
          }}
        >
          + Nueva venta
        </Link>
        <button
          onClick={() => refetch()}
          style={{
            textDecoration: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 14,
            background: '#fff',
          }}
          title="Refrescar datos"
        >
          ↻ Refrescar
        </button>
      </div>

      {/* Controles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 140px 150px 140px 140px 160px',
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
          <Label>Estado</Label>
          <select
            value={status}
            onChange={(e) => setParam('status', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="">(todos)</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="CONFIRMADO">CONFIRMADO</option>
            <option value="FACTURADO">FACTURADO</option>
            <option value="CANCELADO">CANCELADO</option>
          </select>
        </div>

        <div>
          <Label>Orden</Label>
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="-date">Fecha desc.</option>
            <option value="date">Fecha asc.</option>
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

        <div>
          <Label>Origen</Label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={onlyFinal}
              onChange={(e) => setParam('onlyFinal', e.target.checked ? '1' : '', { resetPage: true })}
            />
            Solo finales (/sales)
          </label>
        </div>

        <div>
          <Label>Acciones</Label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setRangeDays(1)}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 10px',
                background: '#fff',
                flex: '1 1 45%',
              }}
              title="Rango: hoy"
            >
              Hoy
            </button>
            <button
              onClick={() => setRangeDays(7)}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 10px',
                background: '#fff',
                flex: '1 1 45%',
              }}
              title="Rango: últimos 7 días"
            >
              7 días
            </button>
            <button
              onClick={() => setRangeDays(30)}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 10px',
                background: '#fff',
                flex: '1 1 100%',
              }}
              title="Rango: últimos 30 días"
            >
              30 días
            </button>
            <button
              onClick={() => {
                const next = new URLSearchParams();
                next.set('page', '1');
                next.set('limit', String(limit));
                next.set('sort', '-date');
                setSp(next, { replace: true });
              }}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 10px',
                width: '100%',
                background: '#fff',
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando ventas.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Fecha</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Cliente</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Estado</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Total</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Origen</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>#{o.id}</td>
                <td style={{ padding: '10px 8px' }}>
                  {o.date ? new Date(o.date).toLocaleDateString('es-AR') : '—'}
                </td>
                <td style={{ padding: '10px 8px' }}>{o.client || '—'}</td>
                <td style={{ padding: '10px 8px' }}>
                  {o.status ? (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid #e2e8f0',
                        background:
                          o.status === 'FACTURADO' ? '#f0fdf4'
                          : o.status === 'CONFIRMADO' ? '#ecfeff'
                          : o.status === 'PENDIENTE' ? '#fff7ed'
                          : '#f8fafc',
                        color:
                          o.status === 'FACTURADO' ? '#166534'
                          : o.status === 'CONFIRMADO' ? '#0e7490'
                          : o.status === 'PENDIENTE' ? '#b45309'
                          : '#64748b',
                        fontSize: 12,
                      }}
                    >
                      {o.status}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(o.total)}</td>
                <td style={{ padding: '10px 8px' }}>
                  {o._origin === 'sales' ? (
                    <span
                      title="Viene de /sales/search (modelo final)"
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid #bbf7d0',
                        background: '#f0fdf4',
                        color: '#166534',
                        fontSize: 12,
                      }}
                    >
                      final
                    </span>
                  ) : (
                    <span
                      title="Viene de /orders/search (legacy/semilla)"
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#64748b',
                        fontSize: 12,
                      }}
                    >
                      legacy
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <Link to={`/orders/${o.id}`} style={{ textDecoration: 'none' }}>
                    Ver detalle →
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16, color: '#64748b' }}>
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, color: '#0f172a' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Total página: {fmtCurrency(pageTotal)}
        </div>
      </div>

      {/* Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#475569' }}>
          Página {page} · {items.length} de {limit}
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