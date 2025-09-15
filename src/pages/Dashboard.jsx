import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http';
import { fmtCurrency, fmtNumber } from '../lib/format';
import StatCard from '../components/StatCard';

function useMonthDefaults() {
  const thisMonth = new Date().toISOString().slice(0,7);
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()-1);
  const lastMonth = d.toISOString().slice(0,7);
  return { lastMonth, thisMonth };
}

function RangeControls({ initialFrom, initialTo, onApply }) {
  const [from, setFrom] = useState(initialFrom);
  const [to,   setTo]   = useState(initialTo);
  return (
    <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
      <label>Desde (YYYY-MM)
        <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="YYYY-MM" style={{marginLeft:8}} />
      </label>
      <label>Hasta (YYYY-MM)
        <input value={to} onChange={e=>setTo(e.target.value)} placeholder="YYYY-MM" style={{marginLeft:8}} />
      </label>
      <button onClick={()=>onApply({from, to})} style={{padding:'6px 10px'}}>Aplicar</button>
    </div>
  );
}

export default function Dashboard() {
  const { lastMonth, thisMonth } = useMonthDefaults();
  // Dejamos vacío por defecto => año en curso (como definió el backend)
  const [range, setRange] = useState({ from: '', to: '' });

  const queryKey = useMemo(() => ['kpis', range.from || null, range.to || null], [range]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to)   params.set('to',   range.to);
      const url = params.toString() ? `/reports/kpis?${params}` : '/reports/kpis';
      const { data } = await http.get(url);
      return data;
    },
    staleTime: 30_000
  });

  const totals = data?.totals || { sales:0, purchases:0, net:0 };
  const receivables = Number(data?.receivablesPending || 0);
  const topClient = data?.topClient;

  return (
    <div style={{padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', maxWidth:1100, margin:'0 auto'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h2 style={{margin:0}}>Dashboard</h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={()=>refetch()} disabled={isFetching} style={{padding:'6px 10px'}}>
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </header>

      <RangeControls
        initialFrom={lastMonth}
        initialTo={thisMonth}
        onApply={({from,to})=> setRange({from, to})}
      />

      {isError && (
        <div style={{marginTop:12, color:'crimson'}}>No se pudieron cargar KPIs: {String(error?.message||'')}</div>
      )}

      <section style={{marginTop:16, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12}}>
        <StatCard label="Ventas"     value={fmtCurrency(totals.sales)}     loading={isLoading} />
        <StatCard label="Compras"    value={fmtCurrency(totals.purchases)} loading={isLoading} />
        <StatCard label="Neto"       value={fmtCurrency(totals.net)}       loading={isLoading} hint="Ventas - Compras" />
        <StatCard label="CxC pend."  value={fmtCurrency(receivables)}      loading={isLoading} hint="Cuentas por cobrar" />
      </section>

      <section style={{marginTop:16}}>
        <h3 style={{margin:'8px 0'}}>Top cliente</h3>
        {topClient ? (
          <div style={{border:'1px solid #e5e7eb', borderRadius:8, padding:12}}>
            <div style={{fontSize:14, color:'#6b7280'}}>{topClient.client || '(s/d)'}</div>
            <div style={{display:'flex', gap:24, marginTop:8, flexWrap:'wrap'}}>
              <div>Ventas: <strong>{fmtCurrency(topClient.revenue || 0)}</strong></div>
              <div>Tickets: <strong>{fmtNumber(topClient.salesCount || 0)}</strong></div>
              <div>Promedio: <strong>{fmtCurrency(topClient.avgTicket || 0)}</strong></div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#6b7280' }}>(No hay datos en el período)</div>
        )}
      </section>
    </div>
  );
}
