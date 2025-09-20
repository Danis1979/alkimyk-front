// src/pages/Production.jsx
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchProductionOrders, startProductionOrder, closeProductionOrder, cancelProductionOrder } from '../services/production.service';
import ProductTypeahead from '../components/ProductTypeahead';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function todayYMD() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function Production() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort   = sp.get('sort')   || '-fecha';
  const estado = sp.get('estado') || ''; // Planificada|EnProceso|Cerrada
  const from   = sp.get('from')   || '';
  const to     = sp.get('to')     || '';
  const productId = sp.get('productId') ? parseInt(sp.get('productId'), 10) : null;
  const productLabel = sp.get('product') || '';
  const q = sp.get('q') || '';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(
    () => ['production.search', { page, limit, sort, estado, from, to, productId, q }],
    [page, limit, sort, estado, from, to, productId, q]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchProductionOrders({ page, limit, sort, estado, from, to, productId, q }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  const doAction = async (fn, id) => {
    try { await fn(id); await qc.invalidateQueries({ queryKey: ['production.search'] }); }
    catch (e) { alert((e && e.message) || 'Acción no disponible'); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Producción (OP)</h1>
        <Link to="/production/new" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
          + Nueva OP
        </Link>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Producto</Label>
          <ProductTypeahead
            value={productLabel}
            selectedId={productId}
            onChange={(txt) => setParam('product', txt, { resetPage: true })}
            onSelect={(id, label) => { setParam('productId', id, { resetPage: true }); setParam('product', label || '', { resetPage: false }); }}
            placeholder="SKU / nombre…"
          />
        </div>
        <div>
          <Label>Estado</Label>
          <select
            value={estado}
            onChange={(e) => setParam('estado', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="">Todos</option>
            <option value="Planificada">Planificada</option>
            <option value="EnProceso">En Proceso</option>
            <option value="Cerrada">Cerrada</option>
          </select>
        </div>
        <div>
          <Label>Desde</Label>
          <input type="date" value={from} max={to || todayYMD()} onChange={(e) => setParam('from', e.target.value, { resetPage: true })}
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>Hasta</Label>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setParam('to', e.target.value, { resetPage: true })}
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>Buscar</Label>
          <input type="text" value={q} onChange={(e) => setParam('q', e.target.value, { resetPage: true })} placeholder="Texto libre…"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
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
            <option value="-id">ID desc.</option>
            <option value="id">ID asc.</option>
          </select>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => { const next = new URLSearchParams(); next.set('page', '1'); next.set('limit', String(limit)); next.set('sort', '-fecha'); setSp(next, { replace: true }); }}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
        >
          Limpiar filtros
        </button>
      </div>

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando OPs.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Fecha</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Estado</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Productos</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Consumos</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((op) => (
              <tr key={op.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>#{op.id}</td>
                <td style={{ padding: '10px 8px' }}>{op.fecha ? new Date(op.fecha).toLocaleDateString('es-AR') : '—'}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 999,
                    background: op.estado === 'Cerrada' ? '#dcfce7' : op.estado === 'EnProceso' ? '#dbeafe' : '#f1f5f9',
                    border: '1px solid #cbd5e1', fontSize: 12,
                  }}>{op.estado}</span>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  {op.itemsProd?.length
                    ? op.itemsProd.map(i => `${i.product || ('#' + (i.productId ?? ''))}×${i.qty}`).join(', ')
                    : '—'}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  {op.consumos?.length
                    ? op.consumos.map(i => `${i.insumo || ('#' + (i.insumoId ?? ''))}×${i.qty}`).join(', ')
                    : '—'}
                </td>
                <td style={{ padding: '10px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to={`/production/${op.id}`} style={{ textDecoration: 'none' }}>Ver</Link>
                  {op.estado === 'Planificada' && (
                    <>
                      <button onClick={() => doAction(startProductionOrder, op.id)}
                              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                        Iniciar
                      </button>
                      <button onClick={() => doAction(cancelProductionOrder, op.id)}
                              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                        Anular
                      </button>
                    </>
                  )}
                  {op.estado === 'EnProceso' && (
                    <button onClick={() => doAction(closeProductionOrder, op.id)}
                            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                      Cerrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 16, color: '#64748b' }}>Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#475569' }}>Página {page} · {items.length} de {limit}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setParam('page', String(page - 1))}
            disabled={page <= 1}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px',
                     background: page <= 1 ? '#f1f5f9' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
            ← Anterior
          </button>
          <button
            onClick={() => setParam('page', String(page + 1))}
            disabled={!hasNext}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px',
                     background: !hasNext ? '#f1f5f9' : '#fff', cursor: !hasNext ? 'not-allowed' : 'pointer' }}>
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}