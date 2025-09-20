// src/pages/masters/Clients.jsx
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  searchClients,
  createClient,
  updateClient,
  deleteClient,
} from '../../services/clients.service';

function Label({ children }) {
  return (
    <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>
      {children}
    </span>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '8px 10px',
        width: '100%',
        ...(props.style || {}),
      }}
    />
  );
}

export default function Clients() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  // URL state
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort = sp.get('sort') || 'nombre'; // nombre|-nombre|id|-id
  const q = sp.get('q') || '';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k);
    else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(
    () => ['clients.search', { page, limit, sort, q }],
    [page, limit, sort, q],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchClients({ page, limit, sort, q }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  // Crear
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: '',
    cuit: '',
    direccion: '',
    condicionesPago: '',
    listasPrecio: '',
    email: '',
    telefono: '',
  });
  const canSaveCreate = createForm.nombre.trim().length > 0;

  const onCreate = async () => {
    const payload = {
      ...createForm,
      nombre: createForm.nombre.trim(),
      name: createForm.nombre.trim(), // por compatibilidad
    };
    try {
      await createClient(payload);
      setShowCreate(false);
      setCreateForm({
        nombre: '',
        cuit: '',
        direccion: '',
        condicionesPago: '',
        listasPrecio: '',
        email: '',
        telefono: '',
      });
      await qc.invalidateQueries({ queryKey: ['clients.search'] });
    } catch (e) {
      alert('No se pudo crear el cliente (¿endpoint listo?).');
    }
  };

  // Editar
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const startEdit = (row) => {
    setEditId(row.id);
    setEditForm({
      nombre: row.nombre ?? row.name ?? '',
      cuit: row.cuit ?? '',
      direccion: row.direccion ?? row.address ?? '',
      condicionesPago: row.condicionesPago ?? '',
      listasPrecio: row.listasPrecio ?? '',
      email: row.email ?? '',
      telefono: row.telefono ?? '',
    });
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };
  const onUpdate = async (id) => {
    const payload = {
      ...editForm,
      nombre: (editForm.nombre || '').trim(),
      name: (editForm.nombre || '').trim(), // compat
    };
    try {
      await updateClient(id, payload);
      setEditId(null);
      setEditForm({});
      await qc.invalidateQueries({ queryKey: ['clients.search'] });
    } catch (e) {
      alert('No se pudo actualizar (¿endpoint listo?).');
    }
  };

  // Eliminar
  const onDelete = async (id) => {
    if (!confirm('¿Eliminar cliente? Esta acción no se puede deshacer.')) return;
    try {
      await deleteClient(id);
      await qc.invalidateQueries({ queryKey: ['clients.search'] });
    } catch (e) {
      alert('No se pudo eliminar (¿endpoint listo?).');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Clientes</h1>
        <button
          onClick={() => setShowCreate((s) => !s)}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 10px',
            background: '#fff',
          }}
        >
          {showCreate ? '× Cancelar' : '+ Nuevo cliente'}
        </button>
      </div>

      {/* Barra de filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 180px 180px 140px',
          gap: 12,
          alignItems: 'end',
          marginBottom: 12,
        }}
      >
        <div>
          <Label>Buscar (nombre / CUIT)</Label>
          <TextInput
            value={q}
            placeholder="Ej: Green & Co o 30-..."
            onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
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
            <option value="id">ID asc.</option>
            <option value="-id">ID desc.</option>
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

      {/* Form de creación (toggle) */}
      {showCreate && (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Nuevo cliente</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
              gap: 12,
              alignItems: 'end',
              marginBottom: 8,
            }}
          >
            <div>
              <Label>Nombre *</Label>
              <TextInput
                value={createForm.nombre}
                onChange={(e) => setCreateForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Razón social o fantasía"
              />
            </div>
            <div>
              <Label>CUIT</Label>
              <TextInput
                value={createForm.cuit}
                onChange={(e) => setCreateForm((f) => ({ ...f, cuit: e.target.value }))}
                placeholder="30-..."
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <TextInput
                value={createForm.telefono}
                onChange={(e) => setCreateForm((f) => ({ ...f, telefono: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <TextInput
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="facturacion@empresa.com"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <TextInput
                value={createForm.direccion}
                onChange={(e) => setCreateForm((f) => ({ ...f, direccion: e.target.value }))}
              />
            </div>
            <div>
              <Label>Condiciones de pago</Label>
              <TextInput
                value={createForm.condicionesPago}
                onChange={(e) => setCreateForm((f) => ({ ...f, condicionesPago: e.target.value }))}
                placeholder="Contado / CC 30d / etc."
              />
            </div>
            <div>
              <Label>Listas de precio</Label>
              <TextInput
                value={createForm.listasPrecio}
                onChange={(e) => setCreateForm((f) => ({ ...f, listasPrecio: e.target.value }))}
                placeholder="General / Mayorista / ..."
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onCreate}
              disabled={!canSaveCreate}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 12px',
                background: canSaveCreate ? '#fff' : '#f1f5f9',
                cursor: canSaveCreate ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setCreateForm({
                  nombre: '',
                  cuit: '',
                  direccion: '',
                  condicionesPago: '',
                  listasPrecio: '',
                  email: '',
                  telefono: '',
                });
              }}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', background: '#fff' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando clientes.</div>}
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
            background: '#fff',
          }}
        >
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Nombre</th>
              <th style={th}>CUIT</th>
              <th style={th}>Email</th>
              <th style={th}>Teléfono</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const editing = editId === row.id;
              if (editing) {
                return (
                  <tr key={row.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={td}>#{row.id}</td>
                    <td style={td}>
                      <TextInput
                        value={editForm.nombre}
                        onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                      />
                    </td>
                    <td style={td}>
                      <TextInput
                        value={editForm.cuit}
                        onChange={(e) => setEditForm((f) => ({ ...f, cuit: e.target.value }))}
                      />
                    </td>
                    <td style={td}>
                      <TextInput
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </td>
                    <td style={td}>
                      <TextInput
                        value={editForm.telefono}
                        onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))}
                      />
                    </td>
                    <td style={{ ...td, display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => onUpdate(row.id)}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={row.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={td}>#{row.id}</td>
                  <td style={td}>{row.nombre ?? row.name ?? '—'}</td>
                  <td style={td}>{row.cuit ?? '—'}</td>
                  <td style={td}>{row.email ?? '—'}</td>
                  <td style={td}>{row.telefono ?? '—'}</td>
                  <td style={{ ...td, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => startEdit(row)}
                      style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(row.id)}
                      style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
                    >
                      Eliminar
                    </button>
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

      {/* Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#475569' }}>Página {page} · {items.length} de {limit}</div>
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

      {/* Volver a Maestros */}
      <div style={{ marginTop: 12 }}>
        <Link to="/masters" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
          ← Volver a Maestros
        </Link>
      </div>
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '10px 8px',
  fontWeight: 600,
  fontSize: 12,
  color: '#334155',
};
const td = { padding: '10px 8px' };