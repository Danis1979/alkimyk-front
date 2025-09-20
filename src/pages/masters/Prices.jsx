// src/pages/masters/Prices.jsx
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchPriceLists, createPriceList, updatePriceList, deletePriceList } from '../../services/prices.service';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

export default function Prices() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10)) ? parseInt(sp.get('limit') || '20', 10) : 20;
  const q     = sp.get('q') || '';
  const sort  = sp.get('sort') || 'name';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(() => ['prices.search', { page, limit, q, sort }], [page, limit, q, sort]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchPriceLists({ page, limit, q, sort }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState(null);
  const [form, setForm] = useState({ name: '', currency: 'ARS', activo: true, factor: '', notes: '' });

  const startNew = () => {
    setEditRow(null);
    setForm({ name: '', currency: 'ARS', activo: true, factor: '', notes: '' });
    setShowForm(true);
  };
  const startEdit = (row) => {
    setEditRow(row);
    setForm({
      name: row.name || '',
      currency: row.currency || 'ARS',
      activo: !!row.activo,
      factor: row.factor ?? '',
      notes: row.notes ?? '',
    });
    setShowForm(true);
  };

  const onSubmit = async () => {
    const payload = {
      ...form,
      factor: form.factor === '' ? null : Number(form.factor),
    };
    try {
      if (editRow) await updatePriceList(editRow.id, payload);
      else         await createPriceList(payload);
      setShowForm(false);
      await qc.invalidateQueries({ queryKey: ['prices.search'] });
    } catch (e) {
      alert((e && e.message) || 'No se pudo guardar la lista');
    }
  };

  const onDelete = async (row) => {
    if (!window.confirm(`Eliminar lista "${row.name}"?`)) return;
    try {
      await deletePriceList(row.id);
      await qc.invalidateQueries({ queryKey: ['prices.search'] });
    } catch (e) {
      alert((e && e.message) || 'No se pudo eliminar');
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Listas de precios</h1>
        <Link to="/masters" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
          ← Volver a Maestros
        </Link>
        <button onClick={startNew} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}>
          + Nueva lista
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Buscar</Label>
          <input
            type="text"
            value={q}
            onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
            placeholder="Nombre o moneda…"
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
            <option value="name">Nombre asc.</option>
            <option value="-name">Nombre desc.</option>
            <option value="currency">Moneda asc.</option>
            <option value="-currency">Moneda desc.</option>
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

      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando listas.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Moneda</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Factor</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Activo</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id ?? r.name} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>{r.name}</td>
                <td style={{ padding: '10px 8px' }}>{r.currency}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{r.factor ?? '—'}</td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>{r.activo ? 'Sí' : 'No'}</td>
                <td style={{ padding: '10px 8px', display: 'flex', gap: 8 }}>
                  <button onClick={() => startEdit(r)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                    Editar
                  </button>
                  <button onClick={() => onDelete(r)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 16, color: '#64748b' }}>Sin resultados.</td></tr>
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

      {/* Formulario */}
      {showForm && (
        <div style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>{editRow ? 'Editar lista' : 'Nueva lista'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 120px 120px', gap: 12 }}>
            <div>
              <Label>Nombre</Label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Precio Mayorista, Minorista A, etc."
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <Label>Activo</Label>
              <select
                value={form.activo ? '1' : '0'}
                onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })}
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <Label>Factor (opcional)</Label>
              <input
                type="number" inputMode="decimal" step="any"
                value={form.factor}
                onChange={(e) => setForm({ ...form, factor: e.target.value })}
                placeholder="Ej: 1.15 para +15%"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
            <div>
              <Label>Notas</Label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Descripción breve"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={onSubmit} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', background: '#fff', fontWeight: 600 }}>
              Guardar
            </button>
            <button onClick={() => setShowForm(false)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', background: '#fff' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}