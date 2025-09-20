// src/pages/masters/Products.jsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchProducts, createProduct, updateProduct, deleteProduct } from '../../services/products.service';
import { fmtCurrency } from '../../lib/format';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function ToolbarButton(props) {
  return (
    <button
      {...props}
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '8px 10px',
        background: '#fff',
        ...props.style,
      }}
    />
  );
}

function ProductForm({ initial, onCancel, onSubmit }) {
  const [f, setF] = useState(() => ({
    id: initial?.id ?? undefined,
    sku: initial?.sku ?? '',
    name: initial?.name ?? '',
    uom: initial?.uom ?? '',
    tipo: initial?.tipo ?? 'simple',
    costoStd: initial?.costoStd ?? 0,
    precioLista: initial?.precioLista ?? 0,
    activo: initial?.activo ?? true,
  }));

  useEffect(() => {
    setF({
      id: initial?.id ?? undefined,
      sku: initial?.sku ?? '',
      name: initial?.name ?? '',
      uom: initial?.uom ?? '',
      tipo: initial?.tipo ?? 'simple',
      costoStd: initial?.costoStd ?? 0,
      precioLista: initial?.precioLista ?? 0,
      activo: initial?.activo ?? true,
    });
  }, [initial]);

  const canSave = f.name.trim().length > 0;

  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const number = (v) => (Number.isFinite(+v) ? +v : 0);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 160px 160px 120px', gap: 10, alignItems: 'end' }}>
        <div>
          <Label>Nombre *</Label>
          <input value={f.name} onChange={(e) => set({ name: e.target.value })}
                 placeholder="Ej: Hamburguesa vegana 200g"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>SKU</Label>
          <input value={f.sku} onChange={(e) => set({ sku: e.target.value })}
                 placeholder="SKU / código"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>UoM</Label>
          <input value={f.uom} onChange={(e) => set({ uom: e.target.value })}
                 placeholder="kg / un / caja"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>Tipo</Label>
          <select value={f.tipo} onChange={(e) => set({ tipo: e.target.value })}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}>
            <option value="simple">Simple</option>
            <option value="rellena">Rellena</option>
          </select>
        </div>
        <div>
          <Label>Costo std.</Label>
          <input type="number" inputMode="decimal" step="any" min="0"
                 value={f.costoStd} onChange={(e) => set({ costoStd: number(e.target.value) })}
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%', textAlign: 'right' }} />
        </div>
        <div>
          <Label>Precio lista</Label>
          <input type="number" inputMode="decimal" step="any" min="0"
                 value={f.precioLista} onChange={(e) => set({ precioLista: number(e.target.value) })}
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%', textAlign: 'right' }} />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#334155' }}>
            <input type="checkbox" checked={!!f.activo} onChange={(e) => set({ activo: e.target.checked })} />
            Activo
          </label>
          <div style={{ flex: 1 }} />
          <ToolbarButton onClick={onCancel}>Cancelar</ToolbarButton>
          <ToolbarButton onClick={() => onSubmit(f)} disabled={!canSave}
                         style={{ background: canSave ? '#fff' : '#f1f5f9', cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
            Guardar
          </ToolbarButton>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const q     = sp.get('q') || '';
  const sort  = sp.get('sort') || 'name';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const qKey = useMemo(() => ['products.search', { page, limit, q, sort }], [page, limit, q, sort]);
  const { data, isLoading, isError } = useQuery({
    queryKey: qKey,
    queryFn: () => searchProducts({ page, limit, q, sort }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  const [editing, setEditing] = useState(null); // null | {} (nuevo) | product

  const mutSave = useMutation({
    mutationFn: async (form) => (form.id ? updateProduct(form.id, form) : createProduct(form)),
    onSuccess: async () => { setEditing(null); await qc.invalidateQueries({ queryKey: ['products.search'] }); },
    onError: (e) => alert(e?.message || 'No se pudo guardar'),
  });

  const mutDelete = useMutation({
    mutationFn: async (id) => {
      if (!confirm('¿Eliminar producto? Esta acción no se puede deshacer.')) return;
      return deleteProduct(id);
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['products.search'] }); },
    onError: (e) => alert(e?.message || 'No se pudo eliminar'),
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Productos / Insumos</h1>
        <Link to="/masters" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>← Maestros</Link>
        <ToolbarButton onClick={() => setEditing({})}>+ Nuevo</ToolbarButton>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 160px 160px', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Buscar</Label>
          <input value={q} onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
                 placeholder="Nombre / SKU…"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>Orden</Label>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value, { resetPage: true })}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}>
            <option value="name">Nombre</option>
            <option value="-name">Nombre desc.</option>
            <option value="sku">SKU</option>
            <option value="-sku">SKU desc.</option>
          </select>
        </div>
        <div>
          <Label>Tamaño página</Label>
          <select value={String(limit)} onChange={(e) => setParam('limit', e.target.value, { resetPage: true })}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}>
            <option value="10">10 filas</option>
            <option value="20">20 filas</option>
            <option value="50">50 filas</option>
          </select>
        </div>
      </div>

      {/* Form Alta/Edición */}
      {editing && (
        <div style={{ marginBottom: 12 }}>
          <ProductForm
            initial={editing?.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSubmit={(f) => mutSave.mutate(f)}
          />
        </div>
      )}

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando productos.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>SKU</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>Nombre</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>UoM</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>Tipo</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Costo</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Precio</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Activo</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>{p.sku || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{p.name}</td>
                <td style={{ padding: '10px 8px' }}>{p.uom || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{p.tipo}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(p.costoStd)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(p.precioLista)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: p.activo ? '#dcfce7' : '#fee2e2',
                    fontSize: 12,
                  }}>
                    {p.activo ? 'Sí' : 'No'}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ToolbarButton onClick={() => setEditing(p)}>Editar</ToolbarButton>
                  <ToolbarButton onClick={() => mutDelete.mutate(p.id)} style={{ borderColor: '#ef4444' }}>
                    Eliminar
                  </ToolbarButton>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 16, color: '#64748b' }}>Sin resultados.</td></tr>
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
          <ToolbarButton
            onClick={() => setParam('page', String(page - 1))}
            disabled={page <= 1}
            style={{ background: page <= 1 ? '#f1f5f9' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Anterior
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setParam('page', String(page + 1))}
            disabled={!hasNext}
            style={{ background: !hasNext ? '#f1f5f9' : '#fff', cursor: !hasNext ? 'not-allowed' : 'pointer' }}
          >
            Siguiente →
          </ToolbarButton>
        </div>
      </div>
    </div>
  );
}