// src/pages/Purchases.jsx
import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchPurchases } from '../services/purchases.service';
import { fmtCurrency } from '../lib/format';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

export default function Purchases() {
  const [sp, setSp] = useSearchParams();

  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;

  const sort  = sp.get('sort') || '-fecha';   // -fecha | fecha | -total | total
  const from  = sp.get('from') || '';
  const to    = sp.get('to')   || '';
  const q     = sp.get('q')    || '';         // búsqueda libre (proveedor / id)

  const setParam = (key, value, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, String(value));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(
    () => ['purchases.search', { page, limit, sort, from, to, q }],
    [page, limit, sort, from, to, q]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchPurchases({ page, limit, sort, from, to, q }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit; // heurística si no hay total/pages

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Compras</h1>
        <Link
          to="/purchases/new"
          style={{
            textDecoration: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 14,
          }}
        >
          + Nueva compra
        </Link>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 160px 160px 160px 140px',
          gap: 12,
          alignItems: 'end',
          marginBottom: 12,
        }}
      >
        <div>
          <Label>Buscar (proveedor / id)</Label>
          <input
            type="text"
            value={q}
            onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
            placeholder="Ej: Proveed SA"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>

        <div>
          <Label>Desde</Label>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setParam('from', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>

        <div>
          <Label>Hasta</Label>
          <input
            type="date"
            value={to}
            min={from || undefined}
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
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando compras.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Proveedor</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Total</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>#{p.id}</td>
                <td style={{ padding: '10px 8px' }}>{p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR') : '—'}</td>
                <td style={{ padding: '10px 8px' }}>{p.supplier || '—'}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(p.total)}</td>
                <td style={{ padding: '10px 8px' }}>
                  {/* Cuando haya detalle de compra: cambiar a /purchases/:id */}
                  <Link to={`/orders/${p.id}`} style={{ textDecoration: 'none' }}>Ver detalle →</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 16, color: '#64748b' }}>Sin resultados.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

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