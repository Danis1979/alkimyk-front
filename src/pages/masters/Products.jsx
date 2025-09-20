// src/pages/masters/Products.jsx
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../services/products.service';
import { fmtCurrency } from '../../lib/format';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function number(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

export default function Products() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  // Query params
  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort  = sp.get('sort') || 'nombre'; // nombre | -nombre | sku | -sku | precioLista | -precioLista
  const q     = sp.get('q') || '';
  const onlyActive = sp.get('onlyActive') === 'true' ? true : (sp.get('onlyActive') === 'false' ? false : undefined);

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k);
    else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(() => ['products.search', { page, limit, sort, q, onlyActive }], [page, limit, sort, q, onlyActive]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchProducts({ page, limit, sort, q, onlyActive }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  // UI: creación / edición
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState({
    nombre: '', sku: '', uom: '', tipo: 'simple', costoStd: 0, precioLista: 0, activo: true,
  });
  const [editing, setEditing] = useState(null); // {id, ...campos}

  const resetNew = () => setCreating({ nombre: '', sku: '', uom: '', tipo: 'simple', costoStd: 0, precioLista: 0, activo: true });

  async function onCreate() {
    try {
      const payload = {
        nombre: creating.nombre.trim(),
        sku: creating.sku.trim(),
        uom: creating.uom.trim(),
        tipo: creating.tipo || 'simple',
        costoStd: number(creating.costoStd),
        precioLista: number(creating.precioLista),
        activo: !!creating.activo,
      };
      if (!payload.nombre) { alert('Completá el nombre.'); return; }
      await createProduct(payload);
      resetNew();
      setShowNew(false);
      await qc.invalidateQueries({ queryKey: ['products.search'] });
    } catch (e) {
      alert(`No se pudo crear el producto: ${e?.message || 'Error'}`);
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    try {
      const payload = {
        nombre: editing.nombre?.trim() || '',
        sku: (editing.sku || '').trim(),
        uom: (editing.uom || '').trim(),
        tipo: editing.tipo || 'simple',
        costoStd: number(editing.costoStd),
        precioLista: number(editing.precioLista),
        activo: !!editing.activo,
      };
      if (!payload.nombre) { alert('Completá el nombre.'); return; }
      await updateProduct(editing.id, payload);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['products.search'] });
    } catch (e) {
      alert(`No se pudo guardar: ${e?.message || 'Error'}`);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('¿Eliminar producto? Esta acción no se puede deshacer.')) return;
    try {
      await deleteProduct(id);
      await qc.invalidateQueries({ queryKey: ['products.search'] });
    } catch (e) {
      alert(`No se pudo eliminar: ${e?.message || 'Error'}`);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Productos / Insumos</h1>
        <button
          onClick={() => setShowNew(v => !v)}
          style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
        >
          {showNew ? '× Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.8fr 0.8fr', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Buscar (nombre / SKU)</Label>
          <input
            type="text"
            value={q}
            onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
            placeholder="Ej: Harina 000 / A12-BC"
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
            <option value="nombre">Nombre asc.</option>
            <option value="-nombre">Nombre desc.</option>
            <option value="sku">SKU asc.</option>
            <option value="-sku">SKU desc.</option>
            <option value="precioLista">Precio asc.</option>
            <option value="-precioLista">Precio desc.</option>
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
          <Label>Solo activos</Label>
          <select
            value={onlyActive === undefined ? '' : String(onlyActive)}
            onChange={(e) => setParam('onlyActive', e.target.value === '' ? undefined : e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <Label>Acciones</Label>
          <button
            onClick={() => {
              const next = new URLSearchParams();
              next.set('page', '1');
              next.set('limit', String(limit));
              next.set('sort', 'nombre');
              setSp(next, { replace: true });
            }}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%', background: '#fff' }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando productos.</div>}
      {data?.error && (
        <div style={{ color: '#b45309', background:'#fffbeb', border:'1px solid #f59e0b', padding:'8px 10px', borderRadius:8, marginBottom:10 }}>
          API de productos no disponible ({data.error}). La grilla muestra vacío hasta que el backend exponga <code>/products/search</code> o <code>/products</code>.
        </div>
      )}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Alta rápida */}
      {showNew && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.6fr 0.6fr 0.7fr 0.5fr', gap: 8 }}>
            <div>
              <Label>Nombre</Label>
              <input
                value={creating.nombre}
                onChange={(e) => setCreating(s => ({ ...s, nombre: e.target.value }))}
                placeholder="Nombre del producto"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>SKU</Label>
              <input
                value={creating.sku}
                onChange={(e) => setCreating(s => ({ ...s, sku: e.target.value }))}
                placeholder="SKU"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>UoM</Label>
              <input
                value={creating.uom}
                onChange={(e) => setCreating(s => ({ ...s, uom: e.target.value }))}
                placeholder="kg / un / caja"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                value={creating.tipo}
                onChange={(e) => setCreating(s => ({ ...s, tipo: e.target.value }))}
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              >
                <option value="simple">Simple</option>
                <option value="rellena">Rellena</option>
              </select>
            </div>
            <div>
              <Label>Precio lista</Label>
              <input
                type="number" inputMode="decimal" step="any" min="0"
                value={creating.precioLista}
                onChange={(e) => setCreating(s => ({ ...s, precioLista: e.target.value }))}
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%', textAlign:'right' }}
              />
            </div>
            <div>
              <Label>Activo</Label>
              <select
                value={String(creating.activo)}
                onChange={(e) => setCreating(s => ({ ...s, activo: e.target.value === 'true' }))}
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={onCreate} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 12px', background:'#fff', fontWeight:600 }}>
              Guardar
            </button>
            <button onClick={() => { resetNew(); setShowNew(false); }} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 12px', background:'#fff' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>SKU</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Nombre</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>UoM</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Precio lista</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Activo</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const isEditing = editing && editing.id === p.id;
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px' }}>#{p.id}</td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <input
                        value={editing.sku ?? ''}
                        onChange={(e) => setEditing(s => ({ ...s, sku: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 130 }}
                      />
                    ) : p.sku || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <input
                        value={editing.nombre ?? ''}
                        onChange={(e) => setEditing(s => ({ ...s, nombre: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 260 }}
                      />
                    ) : p.nombre || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <input
                        value={editing.uom ?? ''}
                        onChange={(e) => setEditing(s => ({ ...s, uom: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 110 }}
                      />
                    ) : p.uom || '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace:'nowrap' }}>
                    {isEditing ? (
                      <input
                        type="number" inputMode="decimal" step="any" min="0"
                        value={editing.precioLista ?? 0}
                        onChange={(e) => setEditing(s => ({ ...s, precioLista: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 120, textAlign:'right' }}
                      />
                    ) : fmtCurrency(p.precioLista)}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <select
                        value={String(editing.activo ?? true)}
                        onChange={(e) => setEditing(s => ({ ...s, activo: e.target.value === 'true' }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px' }}
                      >
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: p.activo ? '#dcfce7' : '#fee2e2',
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                      }}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', display:'flex', gap:8, flexWrap:'wrap' }}>
                    {!isEditing ? (
                      <>
                        <button onClick={() => setEditing({ ...p })} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 10px', background:'#fff' }}>
                          Editar
                        </button>
                        <button onClick={() => onDelete(p.id)} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 10px', background:'#fff' }}>
                          Eliminar
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={onSaveEdit} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 10px', background:'#fff', fontWeight:600 }}>
                          Guardar
                        </button>
                        <button onClick={() => setEditing(null)} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 10px', background:'#fff' }}>
                          Cancelar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 16, color: '#64748b' }}>Sin resultados.</td></tr>
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
                     background: page <= 1 ? '#f1f5f9' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => setParam('page', String(page + 1))}
            disabled={!hasNext}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px',
                     background: !hasNext ? '#f1f5f9' : '#fff', cursor: !hasNext ? 'not-allowed' : 'pointer' }}
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Volver a Maestros */}
      <div style={{ marginTop: 14 }}>
        <Link to="/masters" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', display: 'inline-block' }}>
          ← Volver a Maestros
        </Link>
      </div>
    </div>
  );
}