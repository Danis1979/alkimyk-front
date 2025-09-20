import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchProducts, createProduct, updateProduct, deleteProduct } from '../../services/products.service';
import { searchUom } from '../../services/uom.service';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function UomSelect({ value, onChange }) {
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['uom.search', { q, page:1, limit:20 }],
    queryFn: () => searchUom({ q, page:1, limit:20 }),
    keepPreviousData: true,
  });
  const opts = data?.items ?? [];
  return (
    <div style={{ display:'grid', gap:6 }}>
      <input
        placeholder="Buscar UoM…"
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px' }}
      />
      <select
        value={value || ''}
        onChange={(e)=>onChange(e.target.value)}
        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px' }}
      >
        <option value="">—</option>
        {opts.map(u => (
          <option key={u.id ?? u.code} value={u.code || u.name}>
            {(u.code || u.name) + (u.name && u.code ? ` · ${u.name}` : '')}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Products() {
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

  const queryKey = useMemo(() => ['products.search', { page, limit, q, sort }], [page, limit, q, sort]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchProducts({ page, limit, q, sort }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState(null);
  const [form, setForm] = useState({
    sku:'', name:'', uom:'', tipo:'simple', costoStd:'', precioLista:'', activo:true
  });

  const startNew = () => {
    setEditRow(null);
    setForm({ sku:'', name:'', uom:'', tipo:'simple', costoStd:'', precioLista:'', activo:true });
    setShowForm(true);
  };
  const startEdit = (row) => {
    setEditRow(row);
    setForm({
      sku: row.sku || '',
      name: row.name || row.nombre || '',
      uom: row.uom || '',
      tipo: row.tipo || 'simple',
      costoStd: row.costoStd ?? '',
      precioLista: row.precioLista ?? '',
      activo: row.activo ?? true,
    });
    setShowForm(true);
  };

  const onSubmit = async () => {
    const payload = {
      ...form,
      costoStd: form.costoStd === '' ? null : Number(form.costoStd),
      precioLista: form.precioLista === '' ? null : Number(form.precioLista),
    };
    try {
      if (editRow) await updateProduct(editRow.id, payload);
      else         await createProduct(payload);
      setShowForm(false);
      await qc.invalidateQueries({ queryKey: ['products.search'] });
    } catch (e) {
      alert((e && e.message) || 'No se pudo guardar el producto');
    }
  };

  const onDelete = async (row) => {
    if (!window.confirm(`Eliminar producto "${row.name}"?`)) return;
    try {
      await deleteProduct(row.id);
      await qc.invalidateQueries({ queryKey: ['products.search'] });
    } catch (e) {
      alert((e && e.message) || 'No se pudo eliminar');
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
        <h1 style={{ fontSize:20, fontWeight:600, margin:0, flex:1 }}>Productos / Insumos</h1>
        <Link to="/masters" style={{ textDecoration:'none', border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px' }}>← Volver</Link>
        <button onClick={startNew} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', background:'#fff' }}>
          + Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 160px', gap:12, alignItems:'end', marginBottom:12 }}>
        <div>
          <Label>Buscar</Label>
          <input
            type="text"
            value={q}
            onChange={(e)=>setParam('q', e.target.value, { resetPage:true })}
            placeholder="SKU, nombre…"
            style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
          />
        </div>
        <div>
          <Label>Orden</Label>
          <select
            value={sort}
            onChange={(e)=>setParam('sort', e.target.value, { resetPage:true })}
            style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
          >
            <option value="name">Nombre asc.</option>
            <option value="-name">Nombre desc.</option>
            <option value="sku">SKU asc.</option>
            <option value="-sku">SKU desc.</option>
          </select>
        </div>
        <div>
          <Label>Tamaño página</Label>
          <select
            value={String(limit)}
            onChange={(e)=>setParam('limit', e.target.value, { resetPage:true })}
            style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
          >
            <option value="10">10 filas</option>
            <option value="20">20 filas</option>
            <option value="50">50 filas</option>
          </select>
        </div>
      </div>

      {isError && <div style={{ color:'#b91c1c', marginBottom:8 }}>Error cargando productos.</div>}
      {isLoading && <div style={{ color:'#475569', marginBottom:8 }}>Cargando…</div>}

      {!isLoading && (
        <table style={{ width:'100%', borderCollapse:'collapse', border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
          <thead style={{ background:'#f8fafc' }}>
            <tr>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>SKU</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Nombre</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>UoM</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Tipo</th>
              <th style={{ textAlign:'right', padding:'10px 8px', fontSize:12, color:'#334155' }}>Costo Std</th>
              <th style={{ textAlign:'right', padding:'10px 8px', fontSize:12, color:'#334155' }}>Precio Lista</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Activo</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id ?? r.sku ?? r.name} style={{ borderTop:'1px solid #e2e8f0' }}>
                <td style={{ padding:'10px 8px' }}>{r.sku || '—'}</td>
                <td style={{ padding:'10px 8px' }}>{r.name}</td>
                <td style={{ padding:'10px 8px' }}>{r.uom || '—'}</td>
                <td style={{ padding:'10px 8px' }}>{r.tipo || 'simple'}</td>
                <td style={{ padding:'10px 8px', textAlign:'right' }}>{r.costoStd ?? '—'}</td>
                <td style={{ padding:'10px 8px', textAlign:'right' }}>{r.precioLista ?? '—'}</td>
                <td style={{ padding:'10px 8px' }}>{(r.activo ?? true) ? 'Sí' : 'No'}</td>
                <td style={{ padding:'10px 8px', display:'flex', gap:8 }}>
                  <button onClick={()=>startEdit(r)} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', background:'#fff' }}>
                    Editar
                  </button>
                  <button onClick={()=>onDelete(r)} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'6px 8px', background:'#fff' }}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={8} style={{ padding:16, color:'#64748b' }}>Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Paginación */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
        <div style={{ fontSize:12, color:'#475569' }}>Página {page} · {items.length} de {limit}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button
            onClick={()=>setParam('page', String(page - 1))}
            disabled={page <= 1}
            style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px',
                     background: page <= 1 ? '#f1f5f9' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
            ← Anterior
          </button>
          <button
            onClick={()=>setParam('page', String(page + 1))}
            disabled={!hasNext}
            style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px',
                     background: !hasNext ? '#f1f5f9' : '#fff', cursor: !hasNext ? 'not-allowed' : 'pointer' }}>
            Siguiente →
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{ marginTop:16, border:'1px solid #e2e8f0', borderRadius:12, padding:12 }}>
          <div style={{ fontWeight:600, marginBottom:10 }}>{editRow ? 'Editar producto' : 'Nuevo producto'}</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:12 }}>
            <div>
              <Label>SKU</Label>
              <input
                value={form.sku}
                onChange={(e)=>setForm({ ...form, sku: e.target.value })}
                placeholder="SKU"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
            <div>
              <Label>Nombre</Label>
              <input
                value={form.name}
                onChange={(e)=>setForm({ ...form, name: e.target.value })}
                placeholder="Nombre"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                value={form.tipo}
                onChange={(e)=>setForm({ ...form, tipo: e.target.value })}
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              >
                <option value="simple">simple</option>
                <option value="rellena">rellena</option>
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginTop:12 }}>
            <div>
              <Label>UoM</Label>
              <UomSelect value={form.uom} onChange={(val)=>setForm({ ...form, uom: val })} />
            </div>
            <div>
              <Label>Costo Std</Label>
              <input
                type="number" inputMode="decimal" step="any"
                value={form.costoStd}
                onChange={(e)=>setForm({ ...form, costoStd: e.target.value })}
                placeholder="0.00"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
            <div>
              <Label>Precio Lista</Label>
              <input
                type="number" inputMode="decimal" step="any"
                value={form.precioLista}
                onChange={(e)=>setForm({ ...form, precioLista: e.target.value })}
                placeholder="0.00"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
            <div>
              <Label>Activo</Label>
              <select
                value={form.activo ? '1' : '0'}
                onChange={(e)=>setForm({ ...form, activo: e.target.value === '1' })}
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={onSubmit} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 12px', background:'#fff', fontWeight:600 }}>
              Guardar
            </button>
            <button onClick={()=>setShowForm(false)} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 12px', background:'#fff' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}