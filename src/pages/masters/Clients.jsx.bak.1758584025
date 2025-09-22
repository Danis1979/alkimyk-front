import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  searchClients,
  createClient,
  updateClient,
  deleteClient,
} from '../../services/clients.service';
import { searchPriceLists } from '../../services/prices.service';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function Chip({ label, onRemove }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'2px 8px',
                   border:'1px solid #cbd5e1', borderRadius:999, background:'#fff', fontSize:12 }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ border:'none', background:'transparent', cursor:'pointer' }}>✕</button>
      )}
    </span>
  );
}

function PriceListPicker({ value = [], onChange }) {
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['prices.search', { q, page:1, limit:10 }],
    queryFn: () => searchPriceLists({ q, page:1, limit:10 }),
    keepPreviousData: true,
  });
  const options = data?.items ?? [];

  const add = (pl) => {
    if (value.find(v => (v.id ?? v.name) === (pl.id ?? pl.name))) return;
    onChange([...(value || []), { id: pl.id ?? null, name: pl.name }]);
  };
  const remove = (idx) => {
    const copy = [...value];
    copy.splice(idx, 1);
    onChange(copy);
  };

  return (
    <div style={{ display:'grid', gap:8 }}>
      <input
        placeholder="Buscar lista…"
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px' }}
      />
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {(value || []).map((pl, idx) => (
          <Chip key={(pl.id ?? pl.name) + '-' + idx} label={pl.name} onRemove={() => remove(idx)} />
        ))}
      </div>
      <div style={{ border:'1px solid #e2e8f0', borderRadius:8, maxHeight:180, overflow:'auto' }}>
        {options.map(opt => (
          <div key={opt.id ?? opt.name} style={{ display:'flex', justifyContent:'space-between', padding:'6px 8px', borderTop:'1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize:14 }}>{opt.name}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>Moneda: {opt.currency} {opt.factor != null ? `· Factor ${opt.factor}` : ''}</div>
            </div>
            <button onClick={() => add(opt)} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'4px 8px', background:'#fff' }}>
              Agregar
            </button>
          </div>
        ))}
        {options.length === 0 && <div style={{ padding:8, color:'#64748b' }}>Sin resultados…</div>}
      </div>
    </div>
  );
}

const PAGO_OPTS = [
  '', 'Contado', '7 días', '15 días', '30 días', '45 días', '60 días'
];

export default function Clients() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10)) ? parseInt(sp.get('limit') || '20', 10) : 20;
  const q     = sp.get('q') || '';
  const sort  = sp.get('sort') || 'nombre';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(() => ['clients.search', { page, limit, q, sort }], [page, limit, q, sort]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchClients({ page, limit, q, sort }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState(null);
  const [form, setForm] = useState({
    nombre:'', cuit:'', direccion:'', condicionesPago:'', listasPrecio:[], email:'', telefono:''
  });

  const startNew = () => {
    setEditRow(null);
    setForm({ nombre:'', cuit:'', direccion:'', condicionesPago:'', listasPrecio:[], email:'', telefono:'' });
    setShowForm(true);
  };
  const startEdit = (row) => {
    setEditRow(row);
    setForm({
      nombre: row.nombre || '',
      cuit: row.cuit || '',
      direccion: row.direccion || '',
      condicionesPago: row.condicionesPago || '',
      listasPrecio: row.listasPrecio || [],
      email: row.email || '',
      telefono: row.telefono || '',
    });
    setShowForm(true);
  };

  const onSubmit = async () => {
    try {
      if (editRow) await updateClient(editRow.id, form);
      else         await createClient(form);
      setShowForm(false);
      await qc.invalidateQueries({ queryKey: ['clients.search'] });
    } catch (e) {
      alert((e && e.message) || 'No se pudo guardar el cliente');
    }
  };

  const onDelete = async (row) => {
    if (!window.confirm(`Eliminar cliente "${row.nombre}"?`)) return;
    try {
      await deleteClient(row.id);
      await qc.invalidateQueries({ queryKey: ['clients.search'] });
    } catch (e) {
      alert((e && e.message) || 'No se pudo eliminar');
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
        <h1 style={{ fontSize:20, fontWeight:600, margin:0, flex:1 }}>Clientes</h1>
        <Link to="/masters" style={{ textDecoration:'none', border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px' }}>← Volver</Link>
        <button onClick={startNew} style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', background:'#fff' }}>
          + Nuevo cliente
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
            placeholder="Nombre, CUIT, email…"
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
            onChange={(e)=>setParam('limit', e.target.value, { resetPage:true })}
            style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
          >
            <option value="10">10 filas</option>
            <option value="20">20 filas</option>
            <option value="50">50 filas</option>
          </select>
        </div>
      </div>

      {isError && <div style={{ color:'#b91c1c', marginBottom:8 }}>Error cargando clientes.</div>}
      {isLoading && <div style={{ color:'#475569', marginBottom:8 }}>Cargando…</div>}

      {!isLoading && (
        <table style={{ width:'100%', borderCollapse:'collapse', border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
          <thead style={{ background:'#f8fafc' }}>
            <tr>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Nombre</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>CUIT</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Teléfono</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Listas de precio</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id ?? r.nombre} style={{ borderTop:'1px solid #e2e8f0' }}>
                <td style={{ padding:'10px 8px' }}>{r.nombre}</td>
                <td style={{ padding:'10px 8px' }}>{r.cuit || '—'}</td>
                <td style={{ padding:'10px 8px' }}>{r.telefono || '—'}</td>
                <td style={{ padding:'10px 8px' }}>
                  {(r.listasPrecio || []).length
                    ? r.listasPrecio.map(pl => pl.name).join(', ')
                    : '—'}
                </td>
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
              <tr><td colSpan={5} style={{ padding:16, color:'#64748b' }}>Sin resultados.</td></tr>
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
          <div style={{ fontWeight:600, marginBottom:10 }}>{editRow ? 'Editar cliente' : 'Nuevo cliente'}</div>

          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:12 }}>
            <div>
              <Label>Nombre</Label>
              <input
                value={form.nombre}
                onChange={(e)=>setForm({ ...form, nombre: e.target.value })}
                placeholder="Razón social"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
            <div>
              <Label>CUIT</Label>
              <input
                value={form.cuit}
                onChange={(e)=>setForm({ ...form, cuit: e.target.value })}
                placeholder="20-12345678-9"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
            <div>
              <Label>Condiciones de pago</Label>
              <select
                value={form.condicionesPago}
                onChange={(e)=>setForm({ ...form, condicionesPago: e.target.value })}
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              >
                {PAGO_OPTS.map(v => <option key={v} value={v}>{v || '—'}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:12, marginTop:12 }}>
            <div>
              <Label>Dirección</Label>
              <input
                value={form.direccion}
                onChange={(e)=>setForm({ ...form, direccion: e.target.value })}
                placeholder="Calle 123, Ciudad"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
            <div>
              <Label>Email</Label>
              <input
                value={form.email}
                onChange={(e)=>setForm({ ...form, email: e.target.value })}
                placeholder="cliente@dominio.com"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <input
                value={form.telefono}
                onChange={(e)=>setForm({ ...form, telefono: e.target.value })}
                placeholder="+54 11 1234-5678"
                style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }}
              />
            </div>
          </div>

          <div style={{ marginTop:12 }}>
            <Label>Listas de precios</Label>
            <PriceListPicker
              value={form.listasPrecio}
              onChange={(val)=>setForm({ ...form, listasPrecio: val })}
            />
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