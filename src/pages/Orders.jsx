import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchOrders } from '../services/orders.service.js';
import { fmtCurrency } from '../lib/format.js';

function Input({label, ...props}) {
  return (
    <label style={{ display:'flex', flexDirection:'column', fontSize:12, color:'#374151' }}>
      <span style={{ marginBottom:4 }}>{label}</span>
      <input {...props} style={{ padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }} />
    </label>
  );
}

function Select({label, ...props}) {
  return (
    <label style={{ display:'flex', flexDirection:'column', fontSize:12, color:'#374151' }}>
      <span style={{ marginBottom:4 }}>{label}</span>
      <select {...props} style={{ padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }} />
    </label>
  );
}

export default function Orders() {
  const [sp, setSp] = useSearchParams();
  const q     = sp.get('q')     || '';
  const from  = sp.get('from')  || '';
  const to    = sp.get('to')    || '';
  const page  = Number(sp.get('page')  || 1);
  const limit = Number(sp.get('limit') || 10);

  const queryKey = useMemo(() => ['orders', {q, from, to, page, limit}], [q, from, to, page, limit]);
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchOrders({ q, from, to, page, limit }),
    keepPreviousData: true,
    staleTime: 10_000,
  });

  const items = data?.items || [];
  const total = Number(data?.total || 0);
  const pages = Math.max(1, Math.ceil(total / (limit || 1)));

  function applyFilters(next) {
    const nextSp = new URLSearchParams(sp);
    Object.entries(next).forEach(([k,v]) => {
      if (v === '' || v == null) nextSp.delete(k);
      else nextSp.set(k, String(v));
    });
    // al cambiar filtros, reset a page=1
    if ('q' in next || 'from' in next || 'to' in next || 'limit' in next) {
      nextSp.set('page', '1');
    }
    setSp(nextSp);
  }

  function gotoPage(p) {
    const n = Math.min(Math.max(1, p), pages);
    applyFilters({ page: n });
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Pedidos</h1>

      <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap', marginBottom: 12 }}>
        <Input label="Buscar"      value={q}    onChange={e=>applyFilters({ q: e.target.value })} placeholder="cliente, doc, etc." />
        <Input label="Desde (YYYY-MM)" value={from} onChange={e=>applyFilters({ from: e.target.value })} placeholder="YYYY-MM" />
        <Input label="Hasta (YYYY-MM)" value={to}   onChange={e=>applyFilters({ to: e.target.value })}   placeholder="YYYY-MM" />
        <Select label="Por página" value={String(limit)} onChange={e=>applyFilters({ limit: Number(e.target.value) })}>
          <option value="5">5</option><option value="10">10</option><option value="20">20</option>
        </Select>
      </div>

      {isLoading && <div>Cargando…</div>}
      {isError && <div style={{color:'crimson'}}>Error: {String(error?.message || 'desconocido')}</div>}

      <div style={{ overflowX:'auto', border:'1px solid #e5e7eb', borderRadius:8 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f9fafb' }}>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>ID</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>Fecha</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>Cliente</th>
              <th style={{ textAlign:'right', padding:8, borderBottom:'1px solid #e5e7eb' }}>Total</th>
              <th style={{ padding:8, borderBottom:'1px solid #e5e7eb' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td style={{ padding:8, borderBottom:'1px solid #f3f4f6' }}>{o.id}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f3f4f6' }}>
                  {o.date ? new Date(o.date).toLocaleDateString('es-AR') : '—'}
                </td>
                <td style={{ padding:8, borderBottom:'1px solid #f3f4f6' }}>{o.client || '—'}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f3f4f6', textAlign:'right' }}>{fmtCurrency(o.total || 0)}</td>
                <td style={{ padding:8, borderBottom:'1px solid #f3f4f6', textAlign:'center' }}>
                  <Link to={`/orders/${o.id}`} style={{ color:'#2563eb' }}>Ver</Link>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={5} style={{ padding:12, color:'#6b7280' }}>(Sin resultados)</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:12 }}>
        <button onClick={()=>gotoPage(page-1)} disabled={page<=1}>Anterior</button>
        <span style={{ fontSize:12, color:'#6b7280' }}>Página {page} de {pages}</span>
        <button onClick={()=>gotoPage(page+1)} disabled={page>=pages}>Siguiente</button>
      </div>
    </div>
  );
}
