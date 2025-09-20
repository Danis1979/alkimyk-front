// src/pages/Inventory.jsx
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchInventoryMoves, fetchStockLatest } from '../services/inventory.service';
import ProductTypeahead from '../components/ProductTypeahead';
import { fmtCurrency } from '../lib/format'; // por si querés valuar; no usado de base

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

// YYYY-MM-DD hoy
function todayYMD() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function Inventory() {
  const [sp, setSp] = useSearchParams();

  // Params
  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50, 100].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort  = sp.get('sort') || '-fecha';
  const q     = sp.get('q') || '';
  const direction = sp.get('direction') || ''; // IN|OUT|''
  const motivo    = sp.get('motivo') || '';    // compra|venta|produccion-in|produccion-out|ajuste|''
  const from      = sp.get('from') || '';
  const to        = sp.get('to') || '';
  const productId = sp.get('productId') ? parseInt(sp.get('productId'), 10) : null;
  const productLabel = sp.get('product') || '';

  const setParam = (key, value, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, String(value));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(
    () => ['inventory.moves', { page, limit, sort, q, direction, motivo, from, to, productId }],
    [page, limit, sort, q, direction, motivo, from, to, productId]
  );

  const movesQ = useQuery({
    queryKey,
    queryFn: () => searchInventoryMoves({ page, limit, sort, q, direction, motivo, from, to, productId }),
    keepPreviousData: true,
  });

  const onHandQ = useQuery({
    queryKey: ['stock.latest', { productId }],
    queryFn: () => fetchStockLatest(productId),
    enabled: !!productId,
    staleTime: 30_000,
  });

  const items = movesQ.data?.items ?? [];
  const hasNext = items.length === limit;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Inventario · Kárdex</h1>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Producto</Label>
          <ProductTypeahead
            value={productLabel}
            selectedId={productId}
            onChange={(txt) => setParam('product', txt, { resetPage: true })}
            onSelect={(id, label) => { setParam('productId', id, { resetPage: true }); setParam('product', label || '', { resetPage: false }); }}
            placeholder="Buscar SKU / nombre…"
          />
        </div>

        <div>
          <Label>Dirección</Label>
          <select
            value={direction}
            onChange={(e) => setParam('direction', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="">Todas</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>

        <div>
          <Label>Motivo</Label>
          <select
            value={motivo}
            onChange={(e) => setParam('motivo', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="">Todos</option>
            <option value="compra">compra</option>
            <option value="venta">venta</option>
            <option value="produccion-in">produccion-in</option>
            <option value="produccion-out">produccion-out</option>
            <option value="ajuste">ajuste</option>
          </select>
        </div>

        <div>
          <Label>Desde</Label>
          <input
            type="date"
            value={from}
            max={to || todayYMD()}
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
            <option value="-qty">Cantidad desc.</option>
            <option value="qty">Cantidad asc.</option>
          </select>
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={() => {
            const next = new URLSearchParams();
            next.set('page', '1'); next.set('limit', String(limit)); next.set('sort', '-fecha');
            setSp(next, { replace: true });
          }}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
        >
          Limpiar filtros
        </button>

        {!!productId && (
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#334155' }}>
            {onHandQ.isLoading ? 'Cargando onHand…' :
             onHandQ.data ? <>Stock actual: <strong>{onHandQ.data.onHand}</strong></> :
             '—'}
          </div>
        )}
      </div>

      {/* Estado */}
      {movesQ.isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando movimientos.</div>}
      {movesQ.isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!movesQ.isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Fecha</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Producto</th>
              <th style={{ textAlign: 'center',padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Dir</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Cantidad</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Motivo</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Ref</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => {
              const sign = m.direction === 'OUT' ? -1 : 1;
              return (
                <tr key={m.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px' }}>{m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR') : '—'}</td>
                  <td style={{ padding: '10px 8px' }}>{m.product || `#${m.productId ?? '—'}`}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>{m.direction || '—'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: sign < 0 ? '#b91c1c' : '#065f46' }}>
                    {sign < 0 ? '−' : '+'}{Math.abs(Number(m.qty) || 0)}
                  </td>
                  <td style={{ padding: '10px 8px' }}>{m.motivo || '—'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    {m.ref?.type ? `${m.ref.type}${m.ref.id ? ` #${m.ref.id}` : ''}` : '—'}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 16, color: '#64748b' }}>Sin resultados.</td></tr>
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