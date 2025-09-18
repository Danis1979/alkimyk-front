import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrdersSearch } from '../services/orders.service';
import { useSortParam } from '../hooks/useSortParam';

function fmtARS(n){ return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n??0) }
function fmtDate(iso){ try{ return new Date(iso).toLocaleDateString('es-AR') }catch{ return iso } }

export default function Orders(){
  const { sort, toggle } = useSortParam();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['orders.search', { sort }],
    queryFn: () => fetchOrdersSearch({ page: 1, limit: 20, sort }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];

  return (
    <div style={{maxWidth:960, margin:'0 auto'}}>
      <h1 style={{fontSize:20, fontWeight:600, margin:'8px 0 12px'}}>Pedidos</h1>

      {isError && <div style={{color:'#b91c1c', marginBottom:8}}>Error: {String(error)}</div>}
      {isLoading && <div style={{color:'#475569', marginBottom:8}}>Cargando…</div>}

      <div style={{overflowX:'auto', background:'#fff', border:'1px solid #e2e8f0', borderRadius:8}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#f8fafc', color:'#334155', textAlign:'left'}}>
              <th style={{padding:'10px 12px'}}>ID</th>
              <th style={{padding:'10px 12px'}}>
                <button type="button" onClick={()=>toggle('date')} style={{textDecoration:'underline', background:'none', border:0, padding:0, cursor:'pointer'}}>
                  Fecha {sort==='date'?'↑':(sort==='-date'?'↓':'')}
                </button>
              </th>
              <th style={{padding:'10px 12px'}}>
                <button type="button" onClick={()=>toggle('client')} style={{textDecoration:'underline', background:'none', border:0, padding:0, cursor:'pointer'}}>
                  Cliente {sort==='client'?'↑':(sort==='-client'?'↓':'')}
                </button>
              </th>
              <th style={{padding:'10px 12px', textAlign:'right'}}>
                <button type="button" onClick={()=>toggle('total')} style={{textDecoration:'underline', background:'none', border:0, padding:0, cursor:'pointer'}}>
                  Total {sort==='total'?'↑':(sort==='-total'?'↓':'')}
                </button>
              </th>
              <th style={{padding:'10px 12px'}}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((o)=>(
              <tr key={o.id} style={{borderTop:'1px solid #e2e8f0'}}>
                <td style={{padding:'10px 12px'}}>{o.id}</td>
                <td style={{padding:'10px 12px'}}>{fmtDate(o.date || o.dateKey)}</td>
                <td style={{padding:'10px 12px'}}>{o.client}</td>
                <td style={{padding:'10px 12px', textAlign:'right'}}>{fmtARS(o.total)}</td>
                <td style={{padding:'10px 12px'}}><Link to={`/orders/${o.id}`} style={{textDecoration:'none'}}>ver</Link></td>
              </tr>
            ))}
            {(!isLoading && items.length===0) && (
              <tr><td colSpan={5} style={{padding:'12px'}}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
