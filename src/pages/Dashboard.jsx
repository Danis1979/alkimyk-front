import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http.js';
import { fmtCurrency, fmtNumber } from '../lib/format.js';
import Sparkline from '../components/Sparkline.jsx';

// utilidades de fecha
function monthStr(d) { return d.toISOString().slice(0,7); } // YYYY-MM
function firstOfMonthUTC(y, m) { return new Date(Date.UTC(y, m, 1)); }

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

function PresetsBar({ onPreset, showRaw, setShowRaw, showDebug, setShowDebug }) {
  const btn = { padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', cursor:'pointer' };
  const now = new Date();
  return (
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      <button style={btn} onClick={()=>onPreset('6m')}>Últimos 6M</button>
      <button style={btn} onClick={()=>onPreset('1y')}>Último año</button>
      <button style={btn} onClick={()=>onPreset('ytd')}>Año actual</button>
      <button style={btn} onClick={()=>onPreset('all')}>Todo</button>
      <label style={{marginLeft:8}}>
        <input type="checkbox" checked={showRaw} onChange={e=>setShowRaw(e.target.checked)} /> Crudo
      </label>
      <label>
        <input type="checkbox" checked={showDebug} onChange={e=>setShowDebug(e.target.checked)} /> Ver JSON
      </label>
      <span style={{fontSize:12,color:'#6b7280', marginLeft:8}}>
        {now.toLocaleDateString('es-AR')}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [sp, setSp] = useSearchParams();
  const initialRange = { from: sp.get('from') || '', to: sp.get('to') || '' };

  const [range, setRange] = useState(initialRange);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Restaurar toggles + rango guardado
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dash.range') || 'null');
      if (saved && (saved.from || saved.to)) setRange({ from: saved.from||'', to: saved.to||'' });
      const sRaw = localStorage.getItem('dash.showRaw');   setShowRaw(sRaw === '1');
      const sDbg = localStorage.getItem('dash.showDebug'); setShowDebug(sDbg === '1');
    } catch {}
  }, []);

  // Sync URL + localStorage al cambiar rango
  useEffect(() => {
    const s = new URLSearchParams();
    if (range.from) s.set('from', range.from);
    if (range.to)   s.set('to',   range.to);
    setSp(s, { replace:true });
    localStorage.setItem('dash.range', JSON.stringify(range));
  }, [range, setSp]);

  useEffect(() => { localStorage.setItem('dash.showRaw',  showRaw ? '1' : '0'); }, [showRaw]);
  useEffect(() => { localStorage.setItem('dash.showDebug', showDebug ? '1' : '0'); }, [showDebug]);

  function applyPreset(kind) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    if (kind === '6m') {
      const fromDate = firstOfMonthUTC(y, m - 5);
      setRange({ from: monthStr(fromDate), to: monthStr(now) });
    } else if (kind === '1y') {
      const fromDate = firstOfMonthUTC(y, m - 11);
      setRange({ from: monthStr(fromDate), to: monthStr(now) });
    } else if (kind === 'ytd') {
      const fromDate = firstOfMonthUTC(y, 0);
      setRange({ from: monthStr(fromDate), to: monthStr(now) });
    } else if (kind === 'all') {
      setRange({ from: '', to: '' });
    }
  }

  // KPIs del rango (cards)
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
  useEffect(() => { if (!isFetching && data) setLastUpdated(new Date().toLocaleString('es-AR')); }, [isFetching, data]);

  // Serie 6M (neto por mes, calculado con 6 requests a /reports/kpis)
  const { data: series6 = [], isLoading: isSeriesLoading } = useQuery({
    queryKey: ['kpisSeries6m'],
    queryFn: async () => {
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, idx) => {
        const delta = 5 - idx; // del más viejo al actual
        const d = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth() - delta);
        const n = firstOfMonthUTC(d.getUTCFullYear(), d.getUTCMonth() + 1);
        return { label: monthStr(d), from: monthStr(d), to: monthStr(n) };
      });
      const results = await Promise.all(months.map(({ from, to, label }) =>
        http.get('/reports/kpis', { params: { from, to } })
            .then(r => {
              const t = r?.data?.totals || {};
              const net = Number(t.net ?? (Number(t.sales||0) - Number(t.purchases||0)));
              return { label, net };
            })
            .catch(() => ({ label, net: 0 }))
      ));
      return results;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const totals    = data?.totals || {};
  const sales     = Number(totals.sales || 0);
  const purchases = Number(totals.purchases || 0);
  const net       = Number(totals.net || (sales - purchases));
  const top       = data?.topClient || null;

  const money = (n) => showRaw ? fmtNumber(n) : fmtCurrency(n);

  return (
    <div style={{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding:16, maxWidth:1200, margin:'0 auto' }}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h2 style={{margin:0}}>Dashboard</h2>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <small style={{color:'#6b7280'}}>Actualizado: {lastUpdated ?? '—'}</small>
          <button onClick={()=>refetch()} disabled={isFetching}>{isFetching? 'Actualizando…' : 'Actualizar'}</button>
        </div>
      </header>

      <section style={{display:'grid', gap:10, marginBottom:12}}>
        <PresetsBar
          onPreset={applyPreset}
          showRaw={showRaw} setShowRaw={setShowRaw}
          showDebug={showDebug} setShowDebug={setShowDebug}
        />
        <RangeControls value={range} onChange={setRange} />
      </section>

      {isLoading ? (
        <div>Cargando KPIs…</div>
      ) : isError ? (
        <div style={{color:'crimson'}}>No se pudieron cargar los KPIs: {String(error?.message||'')}</div>
      ) : (
        <>
          <section style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
            <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:14, background:'#fff'}}>
              <div style={{fontSize:12,color:'#6b7280'}}>Ventas</div>
              <div style={{fontSize:24,fontWeight:700}}>{money(sales)}</div>
            </div>
            <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:14, background:'#fff'}}>
              <div style={{fontSize:12,color:'#6b7280'}}>Compras</div>
              <div style={{fontSize:24,fontWeight:700}}>{money(purchases)}</div>
            </div>
            <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:14, background:'#fff'}}>
              <div style={{fontSize:12,color:'#6b7280'}}>Neto</div>
              <div style={{fontSize:24,fontWeight:700}}>{money(net)}</div>
            </div>
          </section>

          <section style={{marginTop:16}}>
            <h3 style={{margin:'12px 0 8px'}}>Tendencia (últimos 6 meses)</h3>
            <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:12, background:'#fff'}}>
              {isSeriesLoading ? (
                <div>Cargando serie…</div>
              ) : series6 && series6.length ? (
                <>
                  <Sparkline
                    data={series6.map(x=>x.net)}
                    labels={series6.map(x=>x.label)}
                    height={56}
                  />
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:12,color:'#6b7280',marginTop:8}}>
                    {series6.map((x,i)=>(
                      <span key={i} title={money(x.net)}>{x.label}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: '#6b7280' }}>(Sin datos para graficar)</div>
              )}
            </div>
          </section>

          <section style={{marginTop:16}}>
            <h3 style={{margin:'12px 0 8px'}}>Top cliente</h3>
            {top ? (
              <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap', background:'#fff'}}>
                <div>
                  <div style={{fontSize:12,color:'#6b7280'}}>Cliente</div>
                  <div style={{fontWeight:600}}>{top.client}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:'#6b7280'}}>Ingresos</div>
                  <div style={{fontWeight:600}}>{money(top.revenue)}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:'#6b7280'}}>Ventas</div>
                  <div style={{fontWeight:600}}>{fmtNumber(top.salesCount)}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:'#6b7280'}}>Ticket prom.</div>
                  <div style={{fontWeight:600}}>{money(top.avgTicket)}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>(Sin datos de top cliente en el período)</div>
            )}
          </section>

          {showDebug && (
            <details style={{marginTop:16}}>
              <summary>Ver JSON (debug)</summary>
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
