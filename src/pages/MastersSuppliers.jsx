// src/pages/MastersSuppliers.jsx
import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchSuppliers, createSupplier } from '../services/suppliers.service';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

export default function MastersSuppliers() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const page  = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = [10,20,50].includes(parseInt(sp.get('limit')||'20',10)) ? parseInt(sp.get('limit')||'20',10) : 20;
  const q     = sp.get('q') || '';

  const setParam = (k, v, {resetPage=false}={}) => {
    const next = new URLSearchParams(sp);
    if (!v) next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page','1');
    setSp(next, { replace:true });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: useMemo(()=>['masters.suppliers',{page,limit,q}], [page,limit,q]),
    queryFn: () => searchSuppliers({ page, limit, q }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  // Alta rápida
  const [nombre, setNombre] = useState('');
  const [cuit, setCuit] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const m = useMutation({
    mutationFn: () => createSupplier({ nombre: nombre.trim(), cuit: cuit.trim() || undefined, email: email.trim() || undefined, telefono: telefono.trim() || undefined }),
    onSuccess: () => { setNombre(''); setCuit(''); setEmail(''); setTelefono(''); qc.invalidateQueries({queryKey:['masters.suppliers']}); alert('Proveedor creado'); },
    onError: (e) => alert(e?.message || 'No se pudo crear'),
  });

  return (
    <div style={{ maxWidth: 1000, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
        <h1 style={{ fontSize:20, fontWeight:600, margin:0, flex:1 }}>Proveedores</h1>
        <Link to="/masters" style={{ textDecoration:'none', border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px' }}>← Volver</Link>
      </div>

      {/* Alta rápida */}
      <div style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:12, marginBottom:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:12, alignItems:'end' }}>
          <div>
            <Label>Nombre *</Label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Proveedor SA"
                   style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }} />
          </div>
          <div>
            <Label>CUIT</Label>
            <input value={cuit} onChange={e=>setCuit(e.target.value)} placeholder="Ej: 30-12345678-9"
                   style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }} />
          </div>
          <div>
            <Label>Email</Label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Ej: compras@proveedor.com"
                   style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <input value={telefono} onChange={e=>setTelefono(e.target.value)} placeholder="Ej: 11-4444-4444"
                   style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }} />
          </div>
          <div>
            <button onClick={()=>m.mutate()} disabled={!nombre.trim() || m.isPending}
                    style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px',
                             background: nombre.trim() && !m.isPending ? '#fff':'#f1f5f9', cursor: nombre.trim() ? 'pointer':'not-allowed' }}>
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 160px', gap:12, alignItems:'end', marginBottom:12 }}>
        <div>
          <Label>Buscar</Label>
          <input value={q} onChange={(e)=>setParam('q', e.target.value, {resetPage:true})} placeholder="Texto libre…"
                 style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%' }} />
        </div>
        <div>
          <Label>Acciones</Label>
          <button onClick={()=>{ const n=new URLSearchParams(); n.set('page','1'); n.set('limit', String(limit)); setSp(n,{replace:true}); }}
                  style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px', width:'100%', background:'#fff' }}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {isError && <div style={{ color:'#b91c1c', marginBottom:8 }}>Error cargando proveedores.</div>}
      {isLoading && <div style={{ color:'#475569', marginBottom:8 }}>Cargando…</div>}

      {!isLoading && (
        <table style={{ width:'100%', borderCollapse:'collapse', border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
          <thead style={{ background:'#f8fafc' }}>
            <tr>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>ID</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Nombre</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>CUIT</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Email</th>
              <th style={{ textAlign:'left', padding:'10px 8px', fontSize:12, color:'#334155' }}>Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {items.map(s=>(
              <tr key={s.id} style={{ borderTop:'1px solid #e2e8f0' }}>
                <td style={{ padding:'8px 8px' }}>#{s.id}</td>
                <td style={{ padding:'8px 8px' }}>{s.nombre}</td>
                <td style={{ padding:'8px 8px' }}>{s.cuit}</td>
                <td style={{ padding:'8px 8px' }}>{s.email}</td>
                <td style={{ padding:'8px 8px' }}>{s.telefono}</td>
              </tr>
            ))}
            {items.length===0 && (<tr><td colSpan={5} style={{ padding:16, color:'#64748b' }}>Sin resultados.</td></tr>)}
          </tbody>
        </table>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
        <div style={{ fontSize:12, color:'#475569' }}>Página {page} · {items.length} de {limit}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setParam('page', String(page-1))} disabled={page<=1}
                  style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px',
                           background: page<=1 ? '#f1f5f9' : '#fff', cursor: page<=1 ? 'not-allowed':'pointer' }}>
            ← Anterior
          </button>
          <button onClick={()=>setParam('page', String(page+1))} disabled={!hasNext}
                  style={{ border:'1px solid #cbd5e1', borderRadius:8, padding:'8px 10px',
                           background: !hasNext ? '#f1f5f9' : '#fff', cursor: !hasNext ? 'not-allowed':'pointer' }}>
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}