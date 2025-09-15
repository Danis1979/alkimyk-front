import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '../services/orders.service';
import { fmtCurrency } from '../lib/format';

function useMonthDefaults() {
  const thisMonth = new Date().toISOString().slice(0,7);
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()-1);
  const lastMonth = d.toISOString().slice(0,7);
  return { lastMonth, thisMonth };
}

export default function Orders() {
  const { lastMonth, thisMonth } = useMonthDefaults();
  const [sp, setSp] = useSearchParams();
  const page  = Number(sp.get('page')  || 1);
  const limit = Number(sp.get('limit') || 10);
  const from  = sp.get('from') || '';
  const to    = sp.get('to')   || '';
  const q     = sp.get('q')    || '';

  const queryKey = useMemo(()=>['orders', page, limit, from || null, to || null, q || null],[page,limit,from,to,q]);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: ()=> fetchOrders({ page, limit, from, to, q }),
    keepPreviousData: true,
  });

  const total = data?.total || 0;
  const items = data?.items || [];
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const setParam = (obj) => {
    const next = new URLSearchParams(sp);
    Object.entries(obj).forEach(([k,v])=>{
      if (v===undefined || v===null || v==='') next.delete(k);
      else next.set(k, String(v));
    });
    // reset page si cambian filtros
    if ('from' in obj || 'to' in obj || 'q' in obj || 'limit' in obj) next.set('page','1');
    setSp(next, { replace:false });
  };

  return (
    <div style={{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding:16, maxWidth:1100, margin:'0 auto' }}>
      <h2 style={{marginTop:0}}>Pedidos</h2>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5, minmax(0,1fr))',gap:8,alignItems:'end', marginBottom:12}}>
        <label>Desde (YYYY-MM)
          <input placeholder={lastMonth} value={from} onChange={(e)=>setParam({from:e.target.value})}/>
        </label>
        <label>Hasta (YYYY-MM)
          <input placeholder={thisMonth} value={to} onChange={(e)=>setParam({to:e.target.value})}/>
        </label>
        <label>Buscar (cliente / id)
          <input value={q} onChange={(e)=>setParam({q:e.target.value})}/>
        </label>
        <label>Por página
          <select value={limit} onChange={(e)=>setParam({limit: Number(e.target.value)})}>
            <option>5</option><option>10</option><option>20</option>
          </select>
        </label>
        <div>
          <button onClick={()=>refetch()} disabled={isFetching}>
            {isFetching ? 'Actualizando…' : 'Aplicar / Actualizar'}
          </button>
        </div>
      </div>

      {isLoading && <div>Cargando…</div>}
      {isError && <div style={{color:'crimson'}}>Error: {String(error?.message||'')}</div>}

      {!isLoading && items.length === 0 && <div style={{color:'#6b7280'}}>(Sin resultados)</div>}

      {items.length > 0 && (
        <>
          <table width="100%" cellPadding="8" style={{borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #e5e7eb', textAlign:'left'}}>
                <th>ID</th><th>Fecha</th><th>Cliente</th><th>Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it=>{
                const raw = it._raw || it;
                const dt = raw.date || raw.created_at || raw.fecha;
                const dstr = dt ? new Date(dt).toLocaleDateString('es-AR') : '';
                return (
                  <tr key={raw.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td>{raw.id}</td>
                    <td>{dstr}</td>
                    <td>{raw.client || raw.cliente || '(s/d)'}</td>
                    <td>{fmtCurrency(raw.total || 0)}</td>
                    <td><Link to={`/orders/${raw.id}`}>Ver</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
            <div style={{color:'#6b7280'}}>Total: {total}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button onClick={()=> setParam({page: Math.max(1, page-1)})} disabled={page<=1}>← Anterior</button>
              <span>Página {page} / {totalPages}</span>
              <button onClick={()=> setParam({page: Math.min(totalPages, page+1)})} disabled={page>=totalPages}>Siguiente →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
