import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http.js';
import { fmtCurrency, fmtNumber } from '../lib/format.js';
import MiniBars from '../components/MiniBars.jsx';

// Helpers de fechas
const yyyymm = (d)=> d.toISOString().slice(0,7);                          // YYYY-MM
const firstUTC = (y,m)=> new Date(Date.UTC(y, m, 1));
const addMonths = (d, delta)=> firstUTC(d.getUTCFullYear(), d.getUTCMonth()+delta);
const nextMonth = (yyyy_mm)=>{
  const [y,m] = yyyy_mm.split('-').map(Number);
  return yyyymm(firstUTC(y, m)); // siguiente al inicio del mes actual
};
function monthsBetween(fromYYYYMM, toYYYYMM) {
  if (!fromYYYYMM || !toYYYYMM) return [];
  const [fy,fm] = fromYYYYMM.split('-').map(Number);
  const [ty,tm] = toYYYYMM.split('-').map(Number);
  let d = firstUTC(fy, fm);
  const end = firstUTC(ty, tm);
  const out = [];
  // incluir "from" y avanzar hasta "to" exclusivo (intervalos [from, nextMonth))
  while (d < end) {
    const label = yyyymm(d);
    out.push(label);
    d = addMonths(d, 1);
  }
  // si from == to, devolvemos un mes
  if (!out.length && fromYYYYMM === toYYYYMM) out.push(fromYYYYMM);
  return out;
}

export default function Dashboard() {
  const [sp, setSp] = useSearchParams();

  // Presets: 6m | 1y | ytd | all | custom
  const [mode, setMode] = useState(sp.get('mode') || '6m');
  const [range, setRange] = useState({ from: sp.get('from') || '', to: sp.get('to') || '' });
  const [custom, setCustom] = useState({ from: range.from, to: range.to });
  const [lastUpdated, setLastUpdated] = useState(null);

  // Sincronizar URL y localStorage
  useEffect(() => {
    const s = new URLSearchParams();
    s.set('mode', mode);
    if (range.from) s.set('from', range.from);
    if (range.to)   s.set('to',   range.to);
    setSp(s, { replace: true });
    localStorage.setItem('dash.mode', mode);
    localStorage.setItem('dash.range', JSON.stringify(range));
  }, [mode, range, setSp]);

  // Restaurar guardado (si no hay parámetros en URL)
  useEffect(() => {
    try {
      const lsMode = localStorage.getItem('dash.mode');
      const lsRange = JSON.parse(localStorage.getItem('dash.range') || 'null');
      if (!sp.get('mode') && lsMode) setMode(lsMode);
      if (!sp.get('from') && !sp.get('to') && lsRange && (lsRange.from || lsRange.to)) {
        setRange(lsRange);
        setCustom(lsRange);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplicar preset → setRange
  useEffect(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    if (mode === '6m') {
      const from = yyyymm(firstUTC(y, m-5));
      setRange({ from, to: yyyymm(now) });
    } else if (mode === '1y') {
      const from = yyyymm(firstUTC(y, m-11));
      setRange({ from, to: yyyymm(now) });
    } else if (mode === 'ytd') {
      setRange({ from: yyyymm(firstUTC(y,0)), to: yyyymm(now) });
    } else if (mode === 'all') {
      // "Todo": mostrar cards con todo (sin límites) y la serie de 12 meses recientes
      setRange({ from: '', to: '' });
    } else if (mode === 'custom') {
      // se aplica con el botón "Aplicar"
    }
  }, [mode]);

  // === KPIs (cards) para el rango actual ===
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

  // === Serie mensual para el gráfico de barras ===
  // Se adapta al modo: 6m (6), 1y (12), ytd (1..12), all (12 meses recientes), custom (según rango)
  const barMonths = useMemo(() => {
    const now = new Date();
    if (mode === '6m') {
      return Array.from({length:6}, (_,i)=> {
        const d = addMonths(firstUTC(now.getUTCFullYear(), now.getUTCMonth()), -(5-i));
        return yyyymm(d);
      });
    }
    if (mode === '1y') {
      return Array.from({length:12}, (_,i)=> {
        const d = addMonths(firstUTC(now.getUTCFullYear(), now.getUTCMonth()), -(11-i));
        return yyyymm(d);
      });
    }
    if (mode === 'ytd') {
      const start = firstUTC(now.getUTCFullYear(), 0);
      return monthsBetween(yyyymm(start), yyyymm(addMonths(firstUTC(now.getUTCFullYear(), now.getUTCMonth()), 1)));
    }
    if (mode === 'all') {
      return Array.from({length:12}, (_,i)=> {
        const d = addMonths(firstUTC(now.getUTCFullYear(), now.getUTCMonth()), -(11-i));
        return yyyymm(d);
      });
    }
    // custom
    if (custom.from && custom.to) {
      // cap 18 meses para no reventar la UI
      const list = monthsBetween(custom.from, custom.to);
      return list.slice(-18);
    }
    return [];
  }, [mode, custom]);

  const { data: bars = [], isLoading: isBarsLoading } = useQuery({
    queryKey: ['kpisMonthlyBars', mode, barMonths.join(',')],
    enabled: barMonths.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        barMonths.map((mm) => {
          const from = mm;
          const to   = nextMonth(mm);
          return http.get('/reports/kpis', { params: { from, to } })
            .then(r => {
              const t = r?.data?.totals || {};
              const net = Number(t.net ?? (Number(t.sales||0) - Number(t.purchases||0)));
              return { label: mm, net };
            })
            .catch(() => ({ label: mm, net: 0 }));
        })
      );
      return results;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // ==== Render ====
  const totals    = data?.totals || {};
  const sales     = Number(totals.sales || 0);
  const purchases = Number(totals.purchases || 0);
  const net       = Number(totals.net || (sales - purchases));
  const top       = data?.topClient || null;

  const money = (n) => fmtCurrency(n);

  const Btn = ({value, children}) => {
    const active = mode === value;
    return (
      <button
        onClick={()=>setMode(value)}
        style={{
          fontSize:12,padding:'6px 10px',borderRadius:8,cursor:'pointer',
          border: active ? '1px solid #2563eb' : '1px solid #e5e7eb',
          background: active ? '#eff6ff' : '#fff',
          color: active ? '#1d4ed8' : '#111827'
        }}
      >{children}</button>
    );
  };

  return (
    <div style={{ fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding:16, maxWidth:1100, margin:'0 auto' }}>
      {/* Barra superior: presets + custom */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:12}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Btn value="6m">Últimos 6 meses</Btn>
          <Btn value="1y">Último año</Btn>
          <Btn value="ytd">Año en curso</Btn>
          <Btn value="all">Todo</Btn>
          <span style={{margin:'0 6px',color:'#9ca3af'}}>|</span>
          <span style={{fontSize:12,color:'#6b7280'}}>Personalizado:</span>
          <input type="month" value={custom.from||''} onChange={(e)=>setCustom(c=>({...c,from:e.target.value}))} />
          <input type="month" value={custom.to||''}   onChange={(e)=>setCustom(c=>({...c,to:e.target.value}))} />
          <button
            onClick={()=>{ setMode('custom'); setRange({ from: custom.from||'', to: custom.to||'' }); }}
            style={{fontSize:12,padding:'6px 10px',borderRadius:8,cursor:'pointer',border:'1px solid #e5e7eb',background:'#fff'}}
          >Aplicar</button>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <small style={{color:'#6b7280'}}>Actualizado: {lastUpdated ?? '—'}</small>
          <button onClick={()=>refetch()} disabled={isFetching}>{isFetching? 'Actualizando…' : 'Actualizar'}</button>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div>Cargando KPIs…</div>
      ) : isError ? (
        <div style={{color:'crimson'}}>No se pudieron cargar los KPIs: {String(error?.message||'')}</div>
      ) : (
        <div>
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

          {/* Barras compactas: se adaptan al modo */}
          <section style={{marginTop:12}}>
            <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:12, background:'#fff'}}>
              
  <section style={{marginTop:12}}>
    <div style={{border:'1px solid #e5e7eb',borderRadius:12,padding:12, background:'#fff'}}>
      {isBarsLoading ? (
        <div>Cargando barras…</div>
      ) : (bars && bars.length) ? (
        <>
          {/* Contenedor fijo: no "salta" entre 6m/12m/etc. */}
          <div style={{maxWidth:520}}>
            <MiniBars
              values={bars.map(b=>b.net)}
              labels={bars.map(b=>b.label)}
              height={72}
              barWidth={12}
              gap={6}
              stretch={false}
            />
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:12,color:'#6b7280',marginTop:6}}>
            {bars.map((x,i)=>(
              <span key={i} title={fmtCurrency(x.net)}>{x.label}</span>
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
