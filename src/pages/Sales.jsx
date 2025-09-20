// src/pages/Sales.jsx
import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '../services/orders.service';
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

  // === Parámetros desde la URL (con defaults) ===
  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort  = sp.get('sort') || '-date';    // -date | date | -total | total
  const q     = sp.get('q') || '';
  const from  = sp.get('from') || '';         // YYYY-MM-DD
  const to    = sp.get('to')   || '';         // YYYY-MM-DD

  const queryKey = useMemo(
    () => ['orders.search', { page, limit, sort, q, from, to }],
    [page, limit, sort, q, from, to]
  );

  // Helper para setear params (y opcionalmente resetear page a 1)
  const setParam = (key, value, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchOrders({ page, limit, sort, q, from, to }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];

  // Info de paginación si el backend la provee
  const total     = Number.isFinite(data?.total) ? Number(data.total) : undefined;
  const pages     = Number.isFinite(data?.pages) ? Number(data.pages) : (total ? Math.max(1, Math.ceil(total / limit)) : undefined);
  const hasPrev   = page > 1;
  const hasNext   = pages ? page < pages : (items.length === limit); // heurística cuando no hay pages/total
  const rangeFrom = (page - 1) * limit + (items.length ? 1 : 0);
  const rangeTo   = (page - 1) * limit + items.length;

  // Handlers de navegación
  const goFirst = () => setParam('page', '1');
  const goPrev  = () => setParam('page', String(page - 1));
  const goNext  = () => setParam('page', String(page + 1));
  const goLast  = () => { if (pages) setParam('page', String(pages)); };

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
          }}
        >
          + Nueva venta
        </Link>
      </div>

      {/* Controles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 140px 160px 160px',
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
      </div>

      {/* Acciones auxiliares */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          onClick={() => {
            const next = new URLSearchParams();
            next.set('page', '1');
            next.set('limit', String(limit));
            next.set('sort', '-date');
            setSp(next, { replace: true });
          }}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
        >
          Limpiar filtros
        </button>
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
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Cliente</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Total</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>#{o.id}</td>
                <td style={{ padding: '10px 8px' }}>
                  {new Date(o.date).toLocaleDateString('es-AR')}
                </td>
                <td style={{ padding: '10px 8px' }}>{o.client}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                  {fmtCurrency(o.total)}
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
                <td colSpan={5} style={{ padding: 16, color: '#64748b' }}>
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Footer de resultados */}
      <div style={{ marginTop: 8, fontSize: 12, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          {total
            ? `Mostrando ${rangeFrom || 0}–${rangeTo || 0} de ${total}`
            : `Página ${page} · ${items.length} de ${limit}`}
        </div>

        {/* Paginación */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={goFirst}
            disabled={!hasPrev || !pages}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: !hasPrev || !pages ? '#f1f5f9' : '#fff',
              cursor: !hasPrev || !pages ? 'not-allowed' : 'pointer',
            }}
            title="Primera"
          >
            «
          </button>
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: !hasPrev ? '#f1f5f9' : '#fff',
              cursor: !hasPrev ? 'not-allowed' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={goNext}
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
          <button
            onClick={goLast}
            disabled={!pages || page >= pages}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: !pages || page >= pages ? '#f1f5f9' : '#fff',
              cursor: !pages || page >= pages ? 'not-allowed' : 'pointer',
            }}
            title={pages ? `Ir a ${pages}` : 'Última (desconocida)'}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}