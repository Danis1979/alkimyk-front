// src/pages/masters/Prices.jsx
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchPriceLists, createPriceList, updatePriceList, deletePriceList } from '../../services/prices.service';
import normalizeList from '../../lib/normalizeList';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function RowForm({ initial, onCancel, onSaved }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'ARS');
  const [active, setActive] = useState(initial?.active ?? true);
  const isEdit = !!initial?.id;

  const canSave = name.trim().length > 0;

  const onSubmit = async () => {
    const payload = { name: name.trim(), currency: currency || 'ARS', active: !!active };
    try {
      if (isEdit) await updatePriceList(initial.id, payload);
      else await createPriceList(payload);
      onSaved?.();
    } catch (e) {
      alert(e?.message || 'No se pudo guardar');
    }
  };

  return (
    <tr style={{ borderTop: '1px solid #e2e8f0', background: '#fcfcfd' }}>
      <td style={{ padding: '8px' }}>{isEdit ? `#${initial.id}` : '—'}</td>
      <td style={{ padding: '8px' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la lista (Mayorista / Minorista / etc.)"
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: '100%' }}
        />
      </td>
      <td style={{ padding: '8px' }}>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', width: 140 }}
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </td>
      <td style={{ padding: '8px' }}>
        <label style={{ fontSize: 13, color: '#334155' }}>
          <input
            type="checkbox"
            checked={!!active}
            onChange={(e) => setActive(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Activa
        </label>
      </td>
      <td style={{ padding: '8px', display: 'flex', gap: 8 }}>
        <button
          onClick={onSubmit}
          disabled={!canSave}
          style={{
            border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px',
            background: canSave ? '#fff' : '#f1f5f9', cursor: canSave ? 'pointer' : 'not-allowed'
          }}
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
        >
          Cancelar
        </button>
      </td>
    </tr>
  );
}

export default function Prices() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10) : 20;
  const sort  = sp.get('sort') || 'name';
  const q     = sp.get('q') || '';

  const queryKey = useMemo(() => ['pricelists.search', { page, limit, sort, q }], [page, limit, sort, q]);

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchPriceLists({ page, limit, sort, q }),
    keepPreviousData: true,
  });

  const items = normalizeList(data?.items ?? []);
  const hasNext = items.length === limit;

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const onSaved = async () => {
    setCreating(false);
    setEditingId(null);
    await qc.invalidateQueries({ queryKey: ['pricelists.search'] });
  };

  const onDelete = async (id) => {
    if (!confirm('¿Eliminar la lista de precios?')) return;
    try {
      await deletePriceList(id);
      await qc.invalidateQueries({ queryKey: ['pricelists.search'] });
    } catch (e) {
      alert(e?.message || 'No se pudo eliminar');
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Listas de precios</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
          >
            + Nueva lista
          </button>
        )}
        {creating && (
          <button
            onClick={() => setCreating(false)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
          >
            Cancelar
          </button>
        )}
        <Link to="/masters" style={{ textDecoration: 'none' }}>← Volver</Link>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 160px', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Buscar</Label>
          <input
            value={q}
            onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
            placeholder="Nombre / moneda…"
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
            <option value="name">Nombre</option>
            <option value="currency">Moneda</option>
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
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando listas.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Moneda</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Estado</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <RowForm initial={null} onCancel={() => setCreating(false)} onSaved={onSaved} />
            )}
            {items.map((pl) =>
              editingId === pl.id ? (
                <RowForm key={pl.id} initial={pl} onCancel={() => setEditingId(null)} onSaved={onSaved} />
              ) : (
                <tr key={pl.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>#{pl.id}</td>
                  <td style={{ padding: '8px' }}>{pl.name}</td>
                  <td style={{ padding: '8px' }}>{pl.currency}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999,
                      background: pl.active ? '#dcfce7' : '#f1f5f9',
                      border: '1px solid #cbd5e1', fontSize: 12
                    }}>
                      {pl.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Placeholder para “Gestionar precios” más adelante */}
                    <button
                      onClick={() => setEditingId(pl.id)}
                      style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(pl.id)}
                      style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', background: '#fff' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            )}
            {items.length === 0 && !creating && (
              <tr><td colSpan={5} style={{ padding: 16, color: '#64748b' }}>Sin resultados.</td></tr>
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
    </div>
  );
}