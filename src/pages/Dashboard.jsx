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
      <label>Desde (YYYY-MM)
        <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="YYYY-MM" />
      </label>
      <label>Hasta (YYYY-MM)
        <input value={to} onChange={e=>setTo(e.target.value)} placeholder="YYYY-MM" />
      </label>
      <button onClick={()=>onChange({from,to})}>Aplicar</button>
    </div>
  );
}

function StatCard({label,value,hint}) {
  return (
    <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:12,minWidth:220}}>
      <div style={{fontSize:12,color:'#6b7280'}}>{label}</div>
      <div style={{fontSize:22,fontWeight:600}}>{value}</div>
      {hint && <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { lastMonth, thisMonth } = useMonthDefaults();
  // vacío => año en curso (lo resuelve el backend)
  const [range, setRange] = useState({ from: '', to: '' });

  const queryKey = useMemo(() => ['kpis', range.from || null, range.to || null], [range]);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const p = new URLSearchParams();
      if (range.from) p.set('from', range.from);
      if (range.to)   p.set('to', range.to);
      const url = p.toString() ? `/reports/kpis?${p.toString()}` : '/reports/kpis';
      const { data } = await http.get(url);
      return data;
    },
  });

  const sales      = data?.totals?.sales ?? 0;
  const purchases  = data?.totals?.purchases ?? 0;
  const net        = data?.totals?.net ?? (sales - purchases);
  const topClient  = data?.topClient || null;

  return (
    <div style={{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding:16, maxWidth:1200, margin:'0 auto' }}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap', gap:8}}>
        <h2 style={{margin:0}}>Dashboard</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>refetch()} disabled={isFetching}>
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </header>

      <div style={{marginTop:12}}>
        <RangeControls
          initialFrom={lastMonth}
          initialTo={thisMonth}
          onChange={(r)=>setRange(r)}
        />
      </div>

      {isLoading && <div style={{marginTop:12}}>Cargando KPIs…</div>}
      {isError   && <div style={{marginTop:12,color:'crimson'}}>Error: {String(error?.message||'')}</div>}

      {!isLoading && !isError && (
        <>
          {/* Totales */}
          <section style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:16}}>
            <StatCard label="Ventas"   value={fmtCurrency(sales)}     hint="Periodo seleccionado" />
            <StatCard label="Compras"  value={fmtCurrency(purchases)} hint="Periodo seleccionado" />
            <StatCard label="Resultado" value={fmtCurrency(net)}       hint="Ventas - Compras" />
          </section>

          {/* Top client */}
          <section style={{marginTop:16}}>
            <div style={{fontSize:14,color:'#6b7280',marginBottom:8}}>Top cliente</div>
            {topClient ? (
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <StatCard label="Cliente"   value={topClient.client || '(s/d)'} />
                <StatCard label="Facturado" value={fmtCurrency(topClient.revenue || 0)} />
                <StatCard label="Ventas"    value={fmtNumber(topClient.salesCount || 0)} />
                <StatCard label="Ticket prom." value={fmtCurrency(topClient.avgTicket || 0)} />
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>(No hay datos en el período)</div>
            )}
          </section>

          {/* Debug colapsable */}
          <details style={{ marginTop: 16 }}>
            <summary style={{cursor:'pointer'}}>Ver JSON (debug)</summary>
            <pre style={{ marginTop: 8, background: '#f9fafb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
