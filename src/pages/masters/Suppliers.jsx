// src/pages/masters/Suppliers.jsx
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../services/suppliers.service';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}
function Btn(props) {
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

function Form({ initial, onCancel, onSubmit }) {
  const [f, setF] = useState(() => ({
    id: initial?.id,
    nombre: initial?.nombre ?? '',
    cuit: initial?.cuit ?? '',
    direccion: initial?.direccion ?? '',
    email: initial?.email ?? '',
    telefono: initial?.telefono ?? '',
    activo: initial?.activo ?? true,
  }));
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const canSave = f.nombre.trim().length > 0;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff', marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
        <div>
          <Label>Nombre *</Label>
          <input value={f.nombre} onChange={(e) => set({ nombre: e.target.value })}
                 placeholder="Razón social / Nombre"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>CUIT</Label>
          <input value={f.cuit} onChange={(e) => set({ cuit: e.target.value })}
                 placeholder="CUIT"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <input value={f.telefono} onChange={(e) => set({ telefono: e.target.value })}
                 placeholder="Ej: +54 11 ..."
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>

        <div>
          <Label>Dirección</Label>
          <input value={f.direccion} onChange={(e) => set({ direccion: e.target.value })}
                 placeholder="Calle 123, CABA"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>Email</Label>
          <input value={f.email} onChange={(e) => set({ email: e.target.value })}
                 placeholder="contacto@proveedor.com"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#334155' }}>
            <input type="checkbox" checked={!!f.activo} onChange={(e) => set({ activo: e.target.checked })} />
            Activo
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onCancel}>Cancelar</Btn>
          <Btn onClick={() => onSubmit(f)} disabled={!canSave}
               style={{ background: canSave ? '#fff' : '#f1f5f9', cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
            Guardar
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10,20,50].includes(parseInt(sp.get('limit')||'20',10)) ? parseInt(sp.get('limit')||'20',10) : 20;
  const q     = sp.get('q') || '';
  const sort  = sp.get('sort') || 'nombre';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const qKey = useMemo(() => ['suppliers.search', { page, limit, q, sort }], [page, limit, q, sort]);
  const { data, isLoading, isError } = useQuery({
    queryKey: qKey,
    queryFn: () => searchSuppliers({ page, limit, q, sort }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  const [editing, setEditing] = useState(null);

  const mutSave = useMutation({
    mutationFn: async (form) => (form.id ? updateSupplier(form.id, form) : createSupplier(form)),
    onSuccess: async () => { setEditing(null); await qc.invalidateQueries({ queryKey: ['suppliers.search'] }); },
    onError: (e) => alert(e?.message || 'No se pudo guardar'),
  });

  const mutDelete = useMutation({
    mutationFn: async (id) => { if (!confirm('¿Eliminar proveedor?')) return; return deleteSupplier(id); },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['suppliers.search'] }); },
    onError: (e) => alert(e?.message || 'No se pudo eliminar'),
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Proveedores</h1>
        <Link to="/masters" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>← Maestros</Link>
        <Btn onClick={() => setEditing({})}>+ Nuevo</Btn>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 160px 160px', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Buscar</Label>
          <input value={q} onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
                 placeholder="Nombre / CUIT / email…"
                 style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }} />
        </div>
        <div>
          <Label>Orden</Label>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value, { resetPage: true })}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}>
            <option value="nombre">Nombre</option>
            <option value="-nombre">Nombre desc.</option>
            <option value="cuit">CUIT</option>
            <option value="-cuit">CUIT desc.</option>
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

      {/* Form */}
      {editing && (
        <Form
          initial={editing?.id ? editing : null}
          onCancel={() => setEditing(null)}
          onSubmit={(f) => mutSave.mutate(f)}
        />
      )}

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando proveedores.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>CUIT</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Dirección</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Teléfono</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Activo</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>{s.nombre}</td>
                <td style={{ padding: '10px 8px' }}>{s.cuit || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{s.direccion || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{s.email || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{s.telefono || '—'}</td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid #cbd5e1', background: s.activo ? '#dcfce7' : '#fee2e2', fontSize: 12 }}>
                    {s.activo ? 'Sí' : 'No'}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Btn onClick={() => setEditing(s)}>Editar</Btn>
                  <Btn onClick={() => mutDelete.mutate(s.id)} style={{ borderColor: '#ef4444' }}>Eliminar</Btn>
                </td>
              </tr>
            ))}
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
          <Btn onClick={() => setParam('page', String(page - 1))} disabled={page <= 1}
               style={{ background: page <= 1 ? '#f1f5f9' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
            ← Anterior
          </Btn>
          <Btn onClick={() => setParam('page', String(page + 1))} disabled={!hasNext}
               style={{ background: !hasNext ? '#f1f5f9' : '#fff', cursor: !hasNext ? 'not-allowed' : 'pointer' }}>
            Siguiente →
          </Btn>
        </div>
      </div>
    </div>
  );
}