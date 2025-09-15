import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { http } from '../lib/http.js';
import { fmtCurrency, fmtNumber } from '../lib/format.js';

function useMonthDefaults() {
  const thisMonth = new Date().toISOString().slice(0,7);
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()-1);
  const lastMonth = d.toISOString().slice(0,7);
  return { lastMonth, thisMonth };
}

function readSavedRange() {
  try {
    const raw = localStorage.getItem('dash.range');
    if (!raw) return { from:'', to:'' };
    const obj = JSON.parse(raw);
    return { from: obj?.from || '', to: obj?.to || '' };
  } catch { return { from:'', to:'' }; }
}

function RangeControls({ from, to, onChange }) {
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  useEffect(() => { setF(from); setT(to); }, [from, to]);
  return (
    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
      <label style={{display:'grid',gap:4}}>Desde (YYYY-MM)
        <input value={f} onChange={e=>setF(e.target.value)} placeholder="YYYY-MM" />
      </label>
      <label style={{display:'grid',gap:4}}>Hasta (YYYY-MM)
        <input value={t} onChange={e=>setT(e.target.value)} placeholder="YYYY-MM" />
      </label>
      <button onClick={()=>onChange({from:f, to:t})}>Aplicar</button>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Inicial: URL -> localStorage -> vacío (año en curso)
  const initialFrom = searchParams.get('from') ?? readSavedRange().from ?? '';
  const initialTo   = searchParams.get('to')   ?? readSavedRange().to   ?? '';
  const [range, setRange] = useState({ from: initialFrom, to: initialTo });
  const [showDebug, setShowDebug] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Sincronizar a URL + localStorage cuando cambia el rango
  useEffect(() => {
    const sp = new URLSearchParams();
    if (range.from) sp.set('from', range.from);
    if (range.to)   sp.set('to',   range.to);
    setSearchParams(sp, { replace: true });
    localStorage.setItem('dash.range', JSON.stringify(range));
  }, [range, setSearchParams]);

  const queryKey = useMemo(() => ['kpis', range.from || null, range.to || null], [range]);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string,string> = {};
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

  const totals    = data?.totals || {};
  const sales     = Number(totals.sales || 0);
  const purchases = Number(totals.purchases || 0);
  const net       = Number(totals.net || (sales - purchases));
  const cxcPend   = Number(data?.receivablesPending || 0);
  const top       = data?.topClient;

  const setYearToDate = () => setRange({from:'',to:''});
  const setLastToThis = () => setRange({from:lastMonth,to:thisMonth});

  const exportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(data ?? {}, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `kpis_${range.from || 'YTD'}_${range.to || 'now'}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copiado al portapapeles');
    } catch {}
  };

  return (
    <div style={{ fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', padding:16, maxWidth:1200, margin:'0 auto' }}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <h2 style={{margin:0}}>Dashboard</h2>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <RangeControls from={range.from} to={range.to} onChange={setRange} />
          <button onClick={setLastToThis}>Mes pasado → actual</button>
          <button onClick={setYearToDate}>Año en curso</button>
          <button onClick={()=>refetch()} disabled={isFetching}>{isFetching? 'Actualizando…':'Actualizar'}</button>
          <button onClick={exportJSON}>Exportar JSON</button>
          <button onClick={copyLink}>Copiar link</button>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#6b7280'}}>
            <input type="checkbox" checked={showDebug} onChange={e=>setShowDebug(e.target.checked)} />
            Debug
          </label>
        </div>
      </header>

      {lastUpdated && (
        <div style={{marginTop:8,fontSize:12,color:'#6b7280'}}>Última actualización: {lastUpdated}</div>
      )}

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
