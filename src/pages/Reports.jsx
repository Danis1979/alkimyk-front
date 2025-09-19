import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

const API = import.meta.env.VITE_API_BASE_URL || '';

function formatARS(v){
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v??0);
}

function MiniBars({ series=[] }){
  const max = Math.max(1, ...series.map(d=>d.net||0));
  return (
    <div style={{display:'flex', alignItems:'end', gap:6, height:120, padding:'6px 4px', border:'1px solid #e2e8f0', borderRadius:8}}>
      {series.map((d,i)=>{
        const h = Math.round((d.net/max)*110);
        return (
          <div key={d.month??i} title={`${d.month} • ${formatARS(d.net)}`}
               style={{flex:1, minWidth:6, height:h, background:'#cbd5e1'}} />
        );
      })}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{
      flex: 1, minWidth: 160, padding: 12, border: '1px solid #e2e8f0',
      borderRadius: 10, background: '#fff'
    }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{formatARS(value)}</div>
    </div>
  );
}

export default function Reports(){
  const [from,setFrom] = useState('');
  const [to,setTo]     = useState('');

  // URLs con rango opcional (vacío = default backend)
  const urlMonthly = useMemo(()=>{
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    return `${API}/reports/sales.monthly${qs.toString()?`?${qs}`:''}`;
  }, [from,to]);

  const urlReceivables = useMemo(()=>{
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    return `${API}/reports/receivables.summary${qs.toString()?`?${qs}`:''}`;
  }, [from,to]);

  // Ventas mensuales
  const { data: monthly, isLoading: isLoadingMonthly, isError: isErrorMonthly } = useQuery({
    queryKey: ['reports.sales.monthly', { from, to }],
    queryFn: async () => {
      const res = await fetch(urlMonthly);
      if(!res.ok) throw new Error('Failed monthly');
      return res.json();
    }
  });

  // KPIs de cobranzas
  const { data: recv, isLoading: isLoadingRecv, isError: isErrorRecv } = useQuery({
    queryKey: ['reports.receivables.summary', { from, to }],
    queryFn: async () => {
      const res = await fetch(urlReceivables);
      if(!res.ok) throw new Error('Failed receivables');
      return res.json();
    }
  });

  const series = monthly?.series ?? [];
  const paid    = recv?.paid ?? 0;
  const pending = recv?.pending ?? 0;
  const overdue = recv?.overdue ?? 0;

  return (
    <div style={{maxWidth:960, margin:'0 auto', padding:16}}>
      <h1 style={{fontSize:20, fontWeight:600, margin:'8px 0 12px'}}>Informes</h1>

      <div style={{display:'flex', gap:12, alignItems:'end', marginBottom:12}}>
        <div>
          <label style={{display:'block', fontSize:12, color:'#475569'}}>Desde (YYYY-MM)</label>
          <input type="month" value={from} onChange={e=>setFrom(e.target.value)} style={{border:'1px solid #cbd5e1', borderRadius:6, padding:'6px 8px'}} />
        </div>
        <div>
          <label style={{display:'block', fontSize:12, color:'#475569'}}>Hasta (YYYY-MM)</label>
          <input type="month" value={to} onChange={e=>setTo(e.target.value)} style={{border:'1px solid #cbd5e1', borderRadius:6, padding:'6px 8px'}} />
        </div>
        <div style={{fontSize:12, color:'#64748b'}}>Tip: vacíos = últimos 6 meses</div>
      </div>

      {/* KPIs de Cobranzas */}
      <div style={{margin:'16px 0 8px', color:'#1f2937', fontWeight:600}}>Cobranzas</div>
      {isErrorRecv && <div style={{color:'#b91c1c', marginBottom:8}}>No se pudieron cargar las cobranzas.</div>}
      {isLoadingRecv && <div style={{color:'#475569', marginBottom:8}}>Cargando cobranzas…</div>}
      {!isLoadingRecv && !isErrorRecv && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Stat label="Cobrado"   value={paid} />
          <Stat label="Pendiente" value={pending} />
          <Stat label="Vencido"   value={overdue} />
        </div>
      )}

      {/* Ventas mensuales */}
      <div style={{margin:'8px 0', color:'#1f2937', fontWeight:600}}>Ventas mensuales</div>
      {isErrorMonthly && <div style={{color:'#b91c1c', marginBottom:8}}>No se pudieron cargar los datos.</div>}
      {isLoadingMonthly && <div style={{color:'#475569', marginBottom:8}}>Cargando…</div>}
      <MiniBars series={series} />
      <div style={{marginTop:8, fontSize:12, color:'#334155'}}>
        {series.length>0 ? `Mostrando ${series.length} mes(es)` : 'Sin datos para el rango seleccionado'}
      </div>
    </div>
  );
}