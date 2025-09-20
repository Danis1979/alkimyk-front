// src/pages/masters/Clients.jsx
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { listClients, createClient, updateClient, removeClient } from '../../services/clients.service';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function Text({ value, onChange, placeholder, style, ...rest }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%', ...style }}
      {...rest}
    />
  );
}

export default function Clients() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const q = sp.get('q') || '';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(() => ['clients.list', { page, limit, q }], [page, limit, q]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => listClients({ page, limit, q }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  // Formulario (alta/edición)
  const empty = { id: null, nombre: '', cuit: '', direccion: '', condicionesPago: '', listasPrecio: '', email: '', telefono: '', activo: true };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const editing = !!form.id;

  const startNew = () => setForm(empty);
  const startEdit = (row) => setForm({ ...empty, ...row });

  const doSave = async () => {
    setSaving(true);
    try {
      if (editing) await updateClient(form.id, form);
      else await createClient(form);
      await qc.invalidateQueries({ queryKey: ['clients.list'] });
      setForm(empty);
      alert('Cliente guardado.');
    } catch (e) {
      console.warn('save client', e);
      alert('No se pudo guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (row) => {
    if (!confirm(`¿Eliminar cliente "${row.nombre}"?`)) return;
    try {
      await removeClient(row.id);
      await qc.invalidateQueries({ queryKey: ['clients.list'] });
      alert('Cliente eliminado.');
    } catch (e) {
      console.warn('delete client', e);
      alert('No se pudo eliminar.');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Clientes</h1>
        <Link to="/masters" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
          ← Volver a Maestros
        </Link>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Buscar (nombre / CUIT / email)</Label>
          <Text value={q} onChange={(v) => setParam('q', v, { resetPage: true })} placeholder="Ej: Green" />
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
            onClick={() => { const next = new URLSearchParams(); next.set('page', '1'); next.set('limit', String(limit)); setSp(next, { replace: true }); }}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff', width: '100%' }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando clientes.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>CUIT</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Teléfono</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id ?? `loc-${c.nombre}`} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>{c.id ?? '—'}</td>
                <td style={{ padding: '10px 8px' }}>{c.nombre}</td>
                <td style={{ padding: '10px 8px' }}>{c.cuit || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{c.email || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{c.telefono || '—'}</td>
                <td style={{ padding: '10px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => startEdit(c)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                    Editar
                  </button>
                  <button onClick={() => doDelete(c)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                    Eliminar
                  </button>
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
        <div style={{ fontSize: 12, color: '#475569' }}>
          Página {page} · {items.length} de {limit}
        </div>
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

      {/* Formulario alta/edición */}
      <div style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>{editing ? `Editar cliente #${form.id}` : 'Nuevo cliente'}</div>
          {editing ? (
            <button onClick={startNew} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
              Cancelar edición
            </button>
          ) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Label>Nombre</Label>
            <Text value={form.nombre} onChange={v => setForm(f => ({ ...f, nombre: v }))} placeholder="Razón social / nombre" />
          </div>
          <div>
            <Label>CUIT</Label>
            <Text value={form.cuit} onChange={v => setForm(f => ({ ...f, cuit: v }))} placeholder="CUIT" />
          </div>
          <div>
            <Label>Email</Label>
            <Text value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@dominio.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Text value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} placeholder="+54 11 ..." />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Dirección</Label>
            <Text value={form.direccion} onChange={v => setForm(f => ({ ...f, direccion: v }))} placeholder="Calle 123, Ciudad" />
          </div>
          <div>
            <Label>Condiciones de pago</Label>
            <Text value={form.condicionesPago} onChange={v => setForm(f => ({ ...f, condicionesPago: v }))} placeholder="Contado / 15 días / 30 días" />
          </div>
          <div>
            <Label>Listas de precios</Label>
            <Text value={form.listasPrecio} onChange={v => setForm(f => ({ ...f, listasPrecio: v }))} placeholder="Lista A / B ..." />
          </div>
          <div>
            <Label>Activo</Label>
            <select
              value={form.activo ? '1' : '0'}
              onChange={(e) => setForm(f => ({ ...f, activo: e.target.value === '1' }))}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
            >
              <option value="1">Sí</option>
              <option value="0">No</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button
            onClick={doSave}
            disabled={saving || !form.nombre.trim()}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '10px 12px',
              background: saving || !form.nombre.trim() ? '#f1f5f9' : '#fff',
              cursor: saving || !form.nombre.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {!editing && (
            <button
              onClick={() => setForm(empty)}
              disabled={saving}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', background: '#fff' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}