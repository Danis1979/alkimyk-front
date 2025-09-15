import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http.js';
import { fmtCurrency, fmtNumber } from '../lib/format.js';

function useMonthDefaults() {
  const thisMonth = new Date().toISOString().slice(0,7);
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()-1);
  const lastMonth = d.toISOString().slice(0,7);
  return { lastMonth, thisMonth };
}

function RangeControls({ initialFrom, initialTo, onChange }) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  return (
    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
      <label style={{display:'grid',gap:4}}>Desde (YYYY-MM)
        <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="YYYY-MM" />
      </label>
      <label style={{display:'grid',gap:4}}>Hasta (YYYY-MM)
        <input value={to} onChange={e=>setTo(e.target.value)} placeholder="YYYY-MM" />
      </label>
      <button onClick={()=>onChange({from, to})}>Aplicar</button>
    </div>
  );
}

function StatCard({label,value,hint}) {
  return (
    <div style={{border:'1px solid #e5e7eb',borderRadius:10,padding:14,minWidth:160}}>
      <div style={{fontSize:12,color:'#6b7280',marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700}}>{value}</div>
      {hint && <div style={{fontSize:12,color:'#9ca3af',marginTop:6}}>{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { lastMonth, thisMonth } = useMonthDefaults();
  // por defecto vacío => año en curso (el backend ya parsea eso)
  const [range, setRange] = useState({ from: '', to: '' });
  const [showDebug, setShowDebug] = useState(false);

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

  const totals    = data?.totals || {};
  const sales     = Number(totals.sales || 0);
  const purchases = Number(totals.purchases || 0);
  const net       = Number(totals.net || (sales - purchases));
  const cxcPend   = Number(data?.receivablesPending || 0);
  const top       = data?.topClient;

  return (
    <div style={{ fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', padding:16, maxWidth:1200, margin:'0 auto' }}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <h2 style={{margin:0}}>Dashboard</h2>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <RangeControls
            initialFrom={''}
            initialTo={''}
            onChange={(r)=> setRange(r)}
          />
          <button onClick={()=>setRange({from:lastMonth,to:thisMonth})}>Mes pasado → actual</button>
          <button onClick={()=>setRange({from:'',to:''})}>Año en curso</button>
          <button onClick={()=>refetch()} disabled={isFetching}>{isFetching? 'Actualizando…':'Actualizar'}</button>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#6b7280'}}>
            <input type="checkbox" checked={showDebug} onChange={e=>setShowDebug(e.target.checked)} />
            Debug
          </label>
        </div>
      </header>

      {isLoading && <div style={{marginTop:12}}>Cargando KPIs…</div>}
      {isError && <div style={{marginTop:12,color:'crimson'}}>No se pudieron cargar los KPIs: {String(error?.message||'')}</div>}

      {data && (
        <>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
            <StatCard label="Ventas"      value={fmtCurrency(sales)} />
            <StatCard label="Compras"     value={fmtCurrency(purchases)} />
            <StatCard label="Neto"        value={fmtCurrency(net)} hint="Ventas - Compras" />
            <StatCard label="CxC pendientes" value={fmtCurrency(cxcPend)} />
          </div>

          <section style={{marginTop:16}}>
            <h3 style={{margin:'8px 0'}}>Top cliente</h3>
            {top ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,maxWidth:800}}>
                <StatCard label="Cliente"    value={top.client || '(s/d)'} />
                <StatCard label="Facturado"  value={fmtCurrency(top.revenue || 0)} />
                <StatCard label="# Ventas"   value={fmtNumber(top.salesCount || 0)} />
                <StatCard label="Ticket prom." value={fmtCurrency(top.avgTicket || 0)} />
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>(Sin datos de top cliente en el período)</div>
            )}
          </section>

          {showDebug && (
            <details open style={{marginTop:16}}>
              <summary style={{cursor:'pointer'}}>JSON crudo</summary>
              <pre style={{ marginTop: 8, background: '#f9fafb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify(data, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
