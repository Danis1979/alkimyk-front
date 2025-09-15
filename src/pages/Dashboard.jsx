import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http';
import { fmtCurrency, fmtNumber } from '../lib/format';

function useMonthDefaults() {
  const thisMonth = new Date().toISOString().slice(0,7);
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()-1);
  const lastMonth = d.toISOString().slice(0,7);
  return { lastMonth, thisMonth };
}

function RangeControls({ initialFrom, initialTo, onChange, onRefresh, refreshing }) {
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
      <button onClick={onRefresh} disabled={refreshing}>
        {refreshing ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>
  );
}

function StatCard({label,value,hint}) {
  return (
    <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:12,minWidth:160}}>
      <div style={{fontSize:12,color:'#6b7280'}}>{label}</div>
      <div style={{fontSize:20,fontWeight:600}}>{value}</div>
      {hint && <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { lastMonth, thisMonth } = useMonthDefaults();
  // vacío => año en curso
  const [range, setRange] = useState({ from: '', to: '' });

  const queryKey = useMemo(() => ['kpis', range.from || null, range.to || null], [range]);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to)   params.set('to',   range.to);
      const { data } = await http.get(`/reports/kpis?${params.toString()}`);
      return data;
    },
  });

  return (
    <div style={{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding:16, maxWidth:1000, margin:'0 auto' }}>
      <h2 style={{marginTop:0}}>Dashboard</h2>

      <RangeControls
        initialFrom={lastMonth}
        initialTo={thisMonth}
        onChange={({from,to}) => setRange({ from, to })}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      {isLoading && <div style={{marginTop:12}}>Cargando KPIs…</div>}
      {isError   && <div style={{marginTop:12,color:'crimson'}}>Error: {String(error?.message||'')}</div>}

      {!isLoading && !isError && data && (
        <>
          <section style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
            <StatCard label="Ventas"       value={fmtCurrency(data?.totals?.sales || 0)} />
            <StatCard label="Compras"      value={fmtCurrency(data?.totals?.purchases || 0)} />
            <StatCard label="Neto"         value={fmtCurrency(data?.totals?.net || 0)} />
            <StatCard label="CxC Pendiente" value={fmtCurrency(data?.receivablesPending || 0)} />
            {data?.topClient && (
              <StatCard
                label={`Top cliente${data?.topClient?.client ? `: ${data.topClient.client}` : ''}`}
                value={fmtCurrency(data?.topClient?.revenue || 0)}
                hint={`Tickets: ${fmtNumber(data?.topClient?.salesCount || 0)} · Prom: ${fmtCurrency(data?.topClient?.avgTicket || 0)}`}
              />
            )}
          </section>

          <pre style={{ marginTop:16, background:'#f9fafb', padding:12, borderRadius:8, overflow:'auto' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
