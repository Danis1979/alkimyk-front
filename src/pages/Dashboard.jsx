import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http.js';
import { fmtCurrency, fmtNumber } from '../lib/format.js';
import Sparkline from '../components/Sparkline.jsx';

// Helpers de fecha
function monthStr(d) { return d.toISOString().slice(0,7); } // YYYY-MM
function firstOfMonthUTC(y, m) { return new Date(Date.UTC(y, m, 1)); }

export default function Dashboard() {
  const [sp, setSp] = useSearchParams();

  // Modo de período: 6m | 1y | ytd | all | custom
  const initialMode = sp.get('mode') || '6m';
  const initialRange = { from: sp.get('from') || '', to: sp.get('to') || '' };

  const [mode, setMode] = useState(initialMode);
  const [range, setRange] = useState(initialRange);
  const [custom, setCustom] = useState({ from: initialRange.from, to: initialRange.to });
  const [lastUpdated, setLastUpdated] = useState(null);

  // Sincronizar URL con modo/rango
  useEffect(() => {
    const s = new URLSearchParams();
    s.set('mode', mode);
    if (range.from) s.set('from', range.from);
    if (range.to)   s.set('to',   range.to);
    setSp(s, { replace: true });
    localStorage.setItem('dash.range', JSON.stringify(range));
    localStorage.setItem('dash.mode', mode);
  }, [mode, range, setSp]);

  // Restaurar guardado (si existe)
  useEffect(() => {
    try {
      const m = localStorage.getItem('dash.mode');
      const r = JSON.parse(localStorage.getItem('dash.range') || 'null');
      if (!sp.get('mode') && m) setMode(m);
      if (!sp.get('from') && !sp.get('to') && r && (r.from || r.to)) {
        setRange({ from: r.from || '', to: r.to || '' });
        setCustom({ from: r.from || '', to: r.to || '' });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplicar preset según modo
  useEffect(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    if (mode === '6m') {
      const fromDate = firstOfMonthUTC(y, m - 5);
      setRange({ from: monthStr(fromDate), to: monthStr(now) });
    } else if (mode === '1y') {
      const fromDate = firstOfMonthUTC(y, m - 11);
      setRange({ from: monthStr(fromDate), to: monthStr(now) });
    } else if (mode === 'ytd') {
      const fromDate = firstOfMonthUTC(y, 0);
      setRange({ from: monthStr(fromDate), to: monthStr(now) });
    } else if (mode === 'all') {
      setRange({ from: '', to: '' });
    } else if (mode === 'custom') {
      // deja el rango como esté (se aplica con el botón)
    }
  }, [mode]);

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

  // Serie fija de 6 meses para sparkline (independiente del rango de cards)
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

  const money = (n) => fmtCurrency(n);

  return (
    <div style={{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding:16, maxWidth:1100, margin:'0 auto' }}>
      {/* Barra superior compacta */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:12}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select value={mode} onChange={(e)=>setMode(e.target.value)}>
            <option value="6m">Últimos 6 meses</option>
            <option value="1y">Último año</option>
            <option value="ytd">Año en curso</option>
            <option value="all">Todo</option>
            <option value="custom">Personalizado…</option>
          </select>
          {mode === 'custom' && (
            <>
              <input type="month" value={custom.from||''} onChange={(e)=>setCustom(c=>({...c,from:e.target.value}))} />
              <input type="month" value={custom.to||''}   onChange={(e)=>setCustom(c=>({...c,to:e.target.value}))} />
              <button onClick={()=>setRange({ from: custom.from||'', to: custom.to||'' })}>Aplicar</button>
            </>
          )}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <small style={{color:'#6b7280'}}>Actualizado: {lastUpdated ?? '—'}</small>
          <button onClick={()=>refetch()} disabled={isFetching}>{isFetching? 'Actualizando…' : 'Actualizar'}</button>
        </div>
      </div>

      {/* Cards limpias */}
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

          {/* Sparkline compacto */}
          <section style={{marginTop:12}}>
            <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:10, background:'#fff'}}>
              {isSeriesLoading ? (
                <div>Cargando tendencia…</div>
              ) : series6 && series6.length ? (
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',alignItems:'center',gap:8}}>
                  <Sparkline
                    data={series6.map(x=>x.net)}
                    labels={series6.map(x=>x.label)}
                    height={36}
                  />
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:12,color:'#6b7280'}}>
                    {series6.map((x,i)=>(
                      <span key={i} title={money(x.net)}>{x.label}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#6b7280' }}>(Sin datos para graficar)</div>
              )}
            </div>
          </section>

          {/* Top cliente */}
          <section style={{marginTop:12}}>
            <h3 style={{margin:'0 0 8px', fontSize:16}}>Top cliente</h3>
            {top ? (
              <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap', background:'#fff'}}>
                <div>
                  <div style={{fontSize:12,color:'#6b7280'}}>Cliente</div>
                  <div style={{fontWeight:600}}>{top.client}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:'#6b7280'}}>Ingresos</div>
                  <div style={{fontWeight:600}}>{fmtCurrency(top.revenue)}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:'#6b7280'}}>Ventas</div>
                  <div style={{fontWeight:600}}>{fmtNumber(top.salesCount)}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:'#6b7280'}}>Ticket prom.</div>
                  <div style={{fontWeight:600}}>{fmtCurrency(top.avgTicket)}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>(Sin datos de top cliente en el período)</div>
            )}
          </section>

          {/* Debug opcional */}
          <details style={{marginTop:12}}>
            <summary>Ver JSON (debug)</summary>
            <pre style={{ marginTop: 8, background: '#f9fafb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
