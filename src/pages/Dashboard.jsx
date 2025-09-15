import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http.js';
import { fmtCurrency, fmtNumber } from '../lib/format.js';

function RangeControls({ value, onChange }) {
  const [from, setFrom] = useState(value.from || '');
  const [to, setTo] = useState(value.to || '');
  useEffect(() => { setFrom(value.from||''); setTo(value.to||''); }, [value]);
  return (
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      <label>Desde (YYYY-MM){' '}
        <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="YYYY-MM" />
      </label>
      <label>Hasta (YYYY-MM){' '}
        <input value={to} onChange={e=>setTo(e.target.value)} placeholder="YYYY-MM" />
      </label>
      <button onClick={()=>onChange({from, to})}>Aplicar</button>
    </div>
  );
}

export default function Dashboard() {
  const [sp, setSp] = useSearchParams();
  const initialRange = {
    from: sp.get('from') || '',
    to:   sp.get('to')   || ''
  };

  const [range, setRange] = useState(initialRange);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Sincronizar a URL + localStorage
  useEffect(() => {
    const s = new URLSearchParams();
    if (range.from) s.set('from', range.from);
    if (range.to)   s.set('to',   range.to);
    setSp(s, { replace:true });
    localStorage.setItem('dash.range', JSON.stringify(range));
  }, [range, setSp]);

  const queryKey = useMemo(() => ['kpis', range.from || null, range.to || null], [range]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = {};
      if (range.from) params.from = range.from;
      if (range.to)   params.to   = range.to;
      const { data } = await http.get('/reports/kpis', { params });
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isFetching && data) setLastUpdated(new Date().toLocaleString('es-AR'));
  }, [isFetching, data]);

  const totals = data?.totals || {};
  const sales = Number(totals.sales || 0);
  const purchases = Number(totals.purchases || 0);
  const net = Number(totals.net || (sales - purchases));
  const top = data?.topClient || null;

  return (
    <div style={{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding:16, maxWidth:1200, margin:'0 auto' }}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h2 style={{margin:0}}>Dashboard</h2>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <small style={{color:'#6b7280'}}>Actualizado: {lastUpdated ?? '—'}</small>
          <button onClick={()=>refetch()} disabled={isFetching}>{isFetching? 'Actualizando…' : 'Actualizar'}</button>
        </div>
      </header>

      <section style={{marginBottom:12}}>
        <RangeControls value={range} onChange={setRange} />
      </section>

      {isLoading ? (
        <div>Cargando KPIs…</div>
      ) : isError ? (
        <div style={{color:'crimson'}}>No se pudieron cargar los KPIs: {String(error?.message||'')}</div>
      ) : (
        <>
          <section style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
            <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:12}}>
              <div style={{fontSize:12,color:'#6b7280'}}>Ventas</div>
              <div style={{fontSize:22,fontWeight:600}}>{fmtCurrency(sales)}</div>
            </div>
            <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:12}}>
              <div style={{fontSize:12,color:'#6b7280'}}>Compras</div>
              <div style={{fontSize:22,fontWeight:600}}>{fmtCurrency(purchases)}</div>
            </div>
            <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:12}}>
              <div style={{fontSize:12,color:'#6b7280'}}>Neto</div>
              <div style={{fontSize:22,fontWeight:600}}>{fmtCurrency(net)}</div>
            </div>
          </section>

          <section style={{marginTop:16}}>
            <h3 style={{margin:'12px 0 8px'}}>Top cliente</h3>
            {top ? (
              <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:14,color:'#6b7280'}}>Cliente</div>
                  <div style={{fontWeight:600}}>{top.client}</div>
                </div>
                <div>
                  <div style={{fontSize:14,color:'#6b7280'}}>Ingresos</div>
                  <div style={{fontWeight:600}}>{fmtCurrency(top.revenue)}</div>
                </div>
                <div>
                  <div style={{fontSize:14,color:'#6b7280'}}>Ventas</div>
                  <div style={{fontWeight:600}}>{fmtNumber(top.salesCount)}</div>
                </div>
                <div>
                  <div style={{fontSize:14,color:'#6b7280'}}>Ticket prom.</div>
                  <div style={{fontWeight:600}}>{fmtCurrency(top.avgTicket)}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>(Sin datos de top cliente en el período)</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
