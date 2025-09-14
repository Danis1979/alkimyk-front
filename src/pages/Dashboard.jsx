import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http.js'; // ajustamos ruta de import (ver archivo http más abajo)
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
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
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
    <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:12}}>
      <div style={{fontSize:12,color:'#6b7280'}}>{label}</div>
      <div style={{fontSize:20,fontWeight:600}}>{value}</div>
      {hint && <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>{hint}</div>}
    </div>
  );
}
export default function Dashboard() {
  const { lastMonth, thisMonth } = useMonthDefaults();
  const [range, setRange] = useState({ from: '', to: '' }); // vacío => año en curso

  const queryKey = useMemo(() => ['kpis', range.from || null, range.to || null], [range]);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async ({ queryKey }) => {
      const [, from, to] = queryKey;
      const params = {};
      if (from) params.from = from;
      if (to)   params.to   = to;
      const r = await http.get('/reports/kpis', { params });
      return r.data;
    },
    staleTime: 20_000,
    gcTime: 60_000,
  });

  const totals = data?.totals || { sales: 0, purchases: 0, net: 0 };
  const topClient = data?.topClient || null;

  return (
    <div style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', maxWidth:1100, margin:'0 auto'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:16}}>
        <h1 style={{fontSize:28,margin:0}}>Dashboard</h1>
      </header>

      <section style={{ marginBottom: 16 }}>
        <RangeControls
          initialFrom={lastMonth}
          initialTo={thisMonth}
          onChange={(r) => { setRange(r); refetch(); }}
        />
        <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
          {range.from || range.to
            ? <>Rango aplicado: <code>{range.from || '(año actual)'}</code> → <code>{range.to || '(auto)'}</code></>
            : <>Rango por defecto: año en curso</>}
          {isFetching && <span style={{ marginLeft: 8 }}>(actualizando…)</span>}
        </div>
      </section>

      {isLoading && <div>Cargando KPIs…</div>}
      {isError   && <div style={{ color: 'crimson' }}>Error: {String(error?.message || 'desconocido')}</div>}

      {data && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
            <StatCard label="Ventas"     value={fmtCurrency(totals.sales)} />
            <StatCard label="Compras"    value={fmtCurrency(totals.purchases)} />
            <StatCard label="Resultado"  value={fmtCurrency(totals.net)} />
          </section>

          <section style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            <StatCard label="CxC pendientes" value={fmtCurrency(data.receivablesPending || 0)} />
            <StatCard
              label="Top cliente"
              value={topClient ? (topClient.client || '(sin nombre)') : '—'}
              hint={topClient ? `Fact.: ${fmtCurrency(topClient.revenue)} • Tickets: ${fmtNumber(topClient.salesCount)} • Prom.: ${fmtCurrency(topClient.avgTicket)}` : '(no hay datos)'}
            />
          </section>

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer' }}>Debug JSON</summary>
            <pre style={{ marginTop: 8, background: '#f9fafb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
