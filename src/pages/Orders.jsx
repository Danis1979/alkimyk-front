import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { http } from '../lib/http';
import { fmtCurrency } from '../lib/format';

const LIMITS = [5,10,20,50];

export default function Orders() {
  const [sp, setSp] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const page  = Math.max(1, Number(sp.get('page')||1));
  const limit = LIMITS.includes(Number(sp.get('limit'))) ? Number(sp.get('limit')) : 5;
  const q     = sp.get('q')   || '';
  const from  = sp.get('from')|| '';
  const to    = sp.get('to')  || '';

  const params = useMemo(()=> {
    const p = new URLSearchParams({ page:String(page), limit:String(limit) });
    if (q)    p.set('q', q);
    if (from) p.set('from', from);
    if (to)   p.set('to', to);
    return p;
  }, [page, limit, q, from, to]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true); setErr('');
        const { data } = await http.get(`/orders/search?${params}`);
        if (!isMounted) return;
        setItems(data.items || []);
        setTotal(Number(data.total || 0));
      } catch (e) {
        if (!isMounted) return;
        console.warn('orders API offline, usando vacío', e);
        setErr('No se pudo cargar pedidos.');
        setItems([]); setTotal(0);
      } finally { setLoading(false); }
    })();
    return () => { isMounted = false; };
  }, [params]);

  const pages = Math.max(1, Math.ceil(total / limit));

  const set = (obj) => {
    const next = new URLSearchParams(sp);
    for (const [k,v] of Object.entries(obj)) {
      if (v === '' || v == null) next.delete(k); else next.set(k, String(v));
    }
    // resetear a página 1 cuando cambian filtros clave
    if ('q' in obj || 'from' in obj || 'to' in obj || 'limit' in obj) next.set('page', '1');
    setSp(next, { replace:false });
  };

  return (
    <div style={{padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', maxWidth:1100, margin:'0 auto'}}>
      <h2 style={{marginTop:0}}>Pedidos</h2>

      <form onSubmit={(e)=>{e.preventDefault();}} style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:12, marginBottom:12}}>
        <label>Buscar
          <input value={q} onChange={e=>set({q:e.target.value})} placeholder="Cliente / id" />
        </label>
        <label>Desde (YYYY-MM)
          <input value={from} onChange={e=>set({from:e.target.value})} placeholder="YYYY-MM" />
        </label>
        <label>Hasta (YYYY-MM)
          <input value={to} onChange={e=>set({to:e.target.value})} placeholder="YYYY-MM" />
        </label>
        <label>Por página
          <select value={limit} onChange={e=>set({limit:Number(e.target.value)})}>
            {LIMITS.map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </form>

      {err && <div style={{color:'crimson', marginBottom:8}}>{err}</div>}

      <div style={{overflow:auto}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{borderBottom:'1px solid #e5e7eb'}}>
              <th style={{textAlign:'left', padding:'8px 6px'}}>ID</th>
              <th style={{textAlign:'left', padding:'8px 6px'}}>Fecha</th>
              <th style={{textAlign:'left', padding:'8px 6px'}}>Cliente</th>
              <th style={{textAlign:'right', padding:'8px 6px'}}>Total</th>
              <th style={{padding:'8px 6px'}}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{padding:'12px 6px'}}>Cargando…</td></tr>
            ) : items.length ? items.map((o) => {
              const raw = o._raw || o;
              const d = new Date(raw.date || raw.created_at || raw.fecha);
              const f = isNaN(d) ? '' : d.toLocaleDateString('es-AR');
              return (
                <tr key={raw.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                  <td style={{padding:'8px 6px'}}>{raw.id}</td>
                  <td style={{padding:'8px 6px'}}>{f}</td>
                  <td style={{padding:'8px 6px'}}>{raw.client || raw.cliente || '(s/d)'}</td>
                  <td style={{padding:'8px 6px', textAlign:'right'}}>{fmtCurrency(raw.total || 0)}</td>
                  <td style={{padding:'8px 6px'}}><Link to={`/orders/${raw.id}`}>Ver</Link></td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} style={{padding:'12px 6px', color:'#6b7280'}}>(Sin resultados)</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{display:'flex', gap:8, alignItems:'center', marginTop:12, flexWrap:'wrap'}}>
        <button disabled={page<=1} onClick={()=>set({page: page-1})}>← Anterior</button>
        <span>Página {page} de {pages}</span>
        <button disabled={page>=pages} onClick={()=>set({page: page+1})}>Siguiente →</button>
      </div>
    </div>
  );
}
