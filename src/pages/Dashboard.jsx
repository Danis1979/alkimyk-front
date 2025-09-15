import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http.js';
import { fmtCurrency, fmtNumber } from '../lib/format.js';

/* ErrorBoundary local por si algo rompe la UI */
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, err:null }; }
  static getDerivedStateFromError(err){ return { hasError:true, err }; }
  componentDidCatch(err, info){ console.error('ErrorBoundary:', err, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div style={{padding:16, color:'#b91c1c', background:'#FEF2F2', border:'1px solid #FEE2E2', borderRadius:8}}>
          <strong>Ocurrió un error en la UI</strong>
          <div style={{marginTop:6, fontSize:13}}>{String(this.state.err?.message || this.state.err || 'Error')}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Utilidades de fechas (UTC, formato YYYY-MM) */
function ymOf(date){
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth()+1).padStart(2,'0');
  return `${y}-${m}`;
}
function addMonthsUTC(d, delta){
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  x.setUTCMonth(x.getUTCMonth()+delta);
  return x;
}
function usePeriodDefaults(){
  const now = new Date();
  const thisMonth = ymOf(now);
  const last6mFrom = ymOf(addMonthsUTC(now, -5));  // incluye el mes actual → 6 puntos
  const lastYearFrom = ymOf(addMonthsUTC(now, -11)); // 12 meses
  const yearStart = `${now.getUTCFullYear()}-01`;
  return { thisMonth, last6mFrom, lastYearFrom, yearStart };
}

/* Botón compacto */
function Btn({active, onClick, children}){
  return (
    <button
      onClick={onClick}
      style={{
        padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:13,
        background: active ? '#111827' : '#fff', color: active ? '#fff' : '#111827',
        cursor:'pointer'
      }}
    >{children}</button>
  );
}

/* Mini barras: Ventas vs Compras (estable: 72px de alto siempre) */
function MiniBars({ sales=0, purchases=0 }){
  const max = Math.max(1, sales, purchases);
  const sH = Math.round((sales/max)*100);
  const pH = Math.round((purchases/max)*100);
  return (
    <div style={{height:72, display:'flex', alignItems:'end', gap:12, padding:'8px 0'}}>
      <div style={{flex:'0 0 36px'}}>
        <div title={`Ventas: ${fmtCurrency(sales)}`} style={{height:`${sH}%`, background:'#1D4ED8', borderRadius:'6px 6px 0 0'}}/>
        <div style={{fontSize:11, color:'#6b7280', textAlign:'center', marginTop:4}}>Ventas</div>
      </div>
      <div style={{flex:'0 0 36px'}}>
        <div title={`Compras: ${fmtCurrency(purchases)}`} style={{height:`${pH}%`, background:'#059669', borderRadius:'6px 6px 0 0'}}/>
        <div style={{fontSize:11, color:'#6b7280', textAlign:'center', marginTop:4}}>Compras</div>
      </div>
    </div>
  );
}

export default function Dashboard(){
  const { thisMonth, last6mFrom, lastYearFrom, yearStart } = usePeriodDefaults();
  const [sp, setSp] = useSearchParams();

  // Estado del rango (sin TypeScript)
  const [range, setRange] = useState({
    from: sp.get('from') || '',
    to:   sp.get('to')   || '',
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  // Sincronizar URL + persistir
  useEffect(()=>{
    const s = new URLSearchParams();
    if (range.from) s.set('from', range.from);
    if (range.to)   s.set('to',   range.to);
    setSp(s, { replace:true });
    try{ localStorage.setItem('dash.range', JSON.stringify(range)); } catch(_){}
  }, [range, setSp]);

  // Cargar desde localStorage al iniciar (si la URL viene vacía)
  useEffect(()=>{
    if (!sp.get('from') && !sp.get('to')) {
      try {
        const saved = JSON.parse(localStorage.getItem('dash.range')||'null');
        if (saved && (saved.from || saved.to)) setRange({ from: saved.from||'', to: saved.to||'' });
      } catch(_){}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queryKey = useMemo(()=>['kpis', range.from||null, range.to||null], [range]);
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

  useEffect(()=>{ if (!isFetching && data) setLastUpdated(new Date().toLocaleString('es-AR')); }, [isFetching, data]);

  const totals    = data?.totals || {};
  const sales     = Number(totals.sales || 0);
  const purchases = Number(totals.purchases || 0);
  const net       = Number(totals.net || (sales - purchases));
  const top       = data?.topClient || null;

  // Handlers de períodos predefinidos
  const setLast6m = () => setRange({ from: last6mFrom, to: thisMonth });
  const setLastYear = () => setRange({ from: lastYearFrom, to: thisMonth });
  const setThisYear = () => setRange({ from: yearStart, to: thisMonth });
  const setAll = () => setRange({ from:'', to:'' });

  // UI
  return (
    <ErrorBoundary>
      <div style={{ fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', padding:16, maxWidth:1200, margin:'0 auto' }}>
        <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <h1 style={{fontSize:20, fontWeight:600}}>Dashboard</h1>
          <div style={{fontSize:12, color:'#6b7280'}}>Actualizado: {lastUpdated ?? '—'}</div>
        </header>

        {/* Barra de período: botones + rango custom + acciones */}
        <section style={{
          display:'grid',
          gridTemplateColumns:'1fr auto auto',
          gap:12,
          alignItems:'center',
          border:'1px solid #e5e7eb',
          borderRadius:10,
          padding:12,
          marginBottom:16,
          background:'#fff'
        }}>
          {/* Botonera */}
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <Btn active={range.from===last6mFrom && range.to===thisMonth} onClick={setLast6m}>Últimos 6 meses</Btn>
            <Btn active={range.from===lastYearFrom && range.to===thisMonth} onClick={setLastYear}>Último año</Btn>
            <Btn active={range.from===yearStart   && range.to===thisMonth} onClick={setThisYear}>Año actual</Btn>
            <Btn active={!range.from && !range.to} onClick={setAll}>Todo</Btn>
          </div>

          {/* Rango custom */}
          <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'flex-end'}}>
            <label style={{fontSize:12,color:'#374151'}}>Desde
              <input type="month" value={range.from} onChange={e=>setRange(r=>({...r, from:e.target.value}))}
                     style={{marginLeft:6, border:'1px solid #e5e7eb', borderRadius:6, padding:'6px 8px'}} />
            </label>
            <label style={{fontSize:12,color:'#374151'}}>Hasta
              <input type="month" value={range.to} onChange={e=>setRange(r=>({...r, to:e.target.value}))}
                     style={{marginLeft:6, border:'1px solid #e5e7eb', borderRadius:6, padding:'6px 8px'}} />
            </label>
          </div>

          {/* Acciones */}
          <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button onClick={()=>refetch()} disabled={isFetching}
                    style={{padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:13, background:'#111827', color:'#fff', cursor:'pointer'}}>
              {isFetching ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </section>

        {/* Estado de carga/errores */}
        {isLoading && <div style={{color:'#6b7280'}}>Cargando KPIs…</div>}
        {isError   && <div style={{color:'#b91c1c'}}>No se pudieron cargar los KPIs: {String(error?.message||'')}</div>}

        {/* Cards + mini barras */}
        {!isLoading && !isError && (
          <section>
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(4, minmax(0, 1fr))',
              gap:12,
              marginBottom:12
            }}>
              <div style={{border:'1px solid #e5e7eb', borderRadius:10, padding:12}}>
                <div style={{fontSize:12, color:'#6b7280'}}>Ventas</div>
                <div style={{fontSize:18, fontWeight:600}}>{fmtCurrency(sales)}</div>
              </div>
              <div style={{border:'1px solid #e5e7eb', borderRadius:10, padding:12}}>
                <div style={{fontSize:12, color:'#6b7280'}}>Compras</div>
                <div style={{fontSize:18, fontWeight:600}}>{fmtCurrency(purchases)}</div>
              </div>
              <div style={{border:'1px solid #e5e7eb', borderRadius:10, padding:12}}>
                <div style={{fontSize:12, color:'#6b7280'}}>Neto</div>
                <div style={{fontSize:18, fontWeight:600}}>{fmtCurrency(net)}</div>
              </div>
              <div style={{border:'1px solid #e5e7eb', borderRadius:10, padding:12}}>
                <div style={{fontSize:12, color:'#6b7280'}}>CxC pendientes</div>
                <div style={{fontSize:18, fontWeight:600}}>{fmtNumber(Number(data?.receivablesPending||0))}</div>
              </div>
            </div>

            {/* Mini barras (estable, 72px) */}
            <div style={{border:'1px solid #e5e7eb', borderRadius:10, padding:'8px 12px', marginBottom:12, background:'#fff'}}>
              <div style={{fontSize:12, color:'#6b7280', marginBottom:4}}>Comparativo (Ventas vs Compras)</div>
              <MiniBars sales={sales} purchases={purchases} />
            </div>

            {/* Top cliente */}
            <div style={{border:'1px solid #e5e7eb', borderRadius:10, padding:12, background:'#fff'}}>
              <div style={{fontSize:12, color:'#6b7280'}}>Top cliente</div>
              {top ? (
                <div style={{marginTop:4}}>
                  <div style={{fontWeight:600}}>{top.client}</div>
                  <div style={{fontSize:13, color:'#374151'}}>Facturación: {fmtCurrency(Number(top.revenue||0))} · Tickets: {fmtNumber(Number(top.salesCount||0))} · Promedio: {fmtCurrency(Number(top.avgTicket||0))}</div>
                </div>
              ) : (
                <div style={{color:'#6b7280', fontSize:13, marginTop:4}}>(Sin datos)</div>
              )}
            </div>
          </section>
        )}
      </div>
    </ErrorBoundary>
  );
}
