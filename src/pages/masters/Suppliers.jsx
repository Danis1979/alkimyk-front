// src/pages/masters/Suppliers.jsx
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  searchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../../services/suppliers.service';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

export default function Suppliers() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  // Query params
  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort  = sp.get('sort') || 'nombre'; // nombre | -nombre | cuit | -cuit
  const q     = sp.get('q') || '';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k);
    else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(() => ['suppliers.search', { page, limit, sort, q }], [page, limit, sort, q]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchSuppliers({ page, limit, sort, q }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  // UI: creación / edición
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState({
    nombre: '', cuit: '', direccion: '', email: '', telefono: '',
  });
  const [editing, setEditing] = useState(null); // {id, ...campos}

  const resetNew = () => setCreating({ nombre: '', cuit: '', direccion: '', email: '', telefono: '' });

  async function onCreate() {
    try {
      const payload = {
        nombre: (creating.nombre || '').trim(),
        cuit: (creating.cuit || '').trim(),
        direccion: (creating.direccion || '').trim(),
        email: (creating.email || '').trim(),
        telefono: (creating.telefono || '').trim(),
      };
      if (!payload.nombre) { alert('Completá el nombre.'); return; }
      await createSupplier(payload);
      resetNew();
      setShowNew(false);
      await qc.invalidateQueries({ queryKey: ['suppliers.search'] });
    } catch (e) {
      alert(`No se pudo crear el proveedor: ${e?.message || 'Error'}`);
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    try {
      const payload = {
        nombre: (editing.nombre || '').trim(),
        cuit: (editing.cuit || '').trim(),
        direccion: (editing.direccion || '').trim(),
        email: (editing.email || '').trim(),
        telefono: (editing.telefono || '').trim(),
      };
      if (!payload.nombre) { alert('Completá el nombre.'); return; }
      await updateSupplier(editing.id, payload);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['suppliers.search'] });
    } catch (e) {
      alert(`No se pudo guardar: ${e?.message || 'Error'}`);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('¿Eliminar proveedor? Esta acción no se puede deshacer.')) return;
    try {
      await deleteSupplier(id);
      await qc.invalidateQueries({ queryKey: ['suppliers.search'] });
    } catch (e) {
      alert(`No se pudo eliminar: ${e?.message || 'Error'}`);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Proveedores</h1>
        <button
          onClick={() => setShowNew(v => !v)}
          style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
        >
          {showNew ? '× Cancelar' : '+ Nuevo proveedor'}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr 0.9fr 0.9fr', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Buscar (nombre / CUIT)</Label>
          <input
            type="text"
            value={q}
            onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
            placeholder="Ej: Juan & Cía / 20-12345678-9"
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
            <option value="cuit">CUIT asc.</option>
            <option value="-cuit">CUIT desc.</option>
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
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando proveedores.</div>}
      {data?.error && (
        <div style={{ color: '#b45309', background:'#fffbeb', border:'1px solid #f59e0b', padding:'8px 10px', borderRadius:8, marginBottom:10 }}>
          API de proveedores no disponible ({data.error}). La grilla mostrará vacío hasta que el backend exponga <code>/suppliers/search</code> o <code>/suppliers</code>.
        </div>
      )}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Alta rápida */}
      {showNew && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.6fr 1fr 0.8fr 0.8fr', gap: 8 }}>
            <div>
              <Label>Nombre</Label>
              <input
                value={creating.nombre}
                onChange={(e) => setCreating(s => ({ ...s, nombre: e.target.value }))}
                placeholder="Nombre / Razón social"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>CUIT</Label>
              <input
                value={creating.cuit}
                onChange={(e) => setCreating(s => ({ ...s, cuit: e.target.value }))}
                placeholder="20-12345678-9"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <input
                value={creating.direccion}
                onChange={(e) => setCreating(s => ({ ...s, direccion: e.target.value }))}
                placeholder="Calle 123, CABA"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>Email</Label>
              <input
                type="email"
                value={creating.email}
                onChange={(e) => setCreating(s => ({ ...s, email: e.target.value }))}
                placeholder="proveedor@mail.com"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <input
                value={creating.telefono}
                onChange={(e) => setCreating(s => ({ ...s, telefono: e.target.value }))}
                placeholder="+54 11 1234-5678"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
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
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Nombre</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>CUIT</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Dirección</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Email</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Teléfono</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const isEditing = editing && editing.id === s.id;
              return (
                <tr key={s.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px' }}>#{s.id}</td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <input
                        value={editing.nombre ?? ''}
                        onChange={(e) => setEditing(v => ({ ...v, nombre: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 260 }}
                      />
                    ) : s.nombre || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <input
                        value={editing.cuit ?? ''}
                        onChange={(e) => setEditing(v => ({ ...v, cuit: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 160 }}
                      />
                    ) : s.cuit || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <input
                        value={editing.direccion ?? ''}
                        onChange={(e) => setEditing(v => ({ ...v, direccion: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 240 }}
                      />
                    ) : s.direccion || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editing.email ?? ''}
                        onChange={(e) => setEditing(v => ({ ...v, email: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 200 }}
                      />
                    ) : s.email || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {isEditing ? (
                      <input
                        value={editing.telefono ?? ''}
                        onChange={(e) => setEditing(v => ({ ...v, telefono: e.target.value }))}
                        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', width: 160 }}
                      />
                    ) : s.telefono || '—'}
                  </td>
                  <td style={{ padding: '10px 8px', display:'flex', gap:8, flexWrap:'wrap' }}>
                    {!isEditing ? (
                      <>
                        <button onClick={() => setEditing({ ...s })} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 10px', background:'#fff' }}>
                          Editar
                        </button>
                        <button onClick={() => onDelete(s.id)} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 10px', background:'#fff' }}>
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