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

export default function Reports(){
  const [from,setFrom] = useState('');
  const [to,setTo]     = useState('');

  const url = useMemo(()=>{
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    return `${API}/reports/sales.monthly${qs.toString()?`?${qs}`:''}`;
  }, [from,to]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports.sales.monthly', { from, to }],
    queryFn: async () => {
      const res = await fetch(url);
      if(!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const series = data?.series ?? [];

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

      {isError && <div style={{color:'#b91c1c', marginBottom:8}}>No se pudieron cargar los datos.</div>}
      {isLoading && <div style={{color:'#475569', marginBottom:8}}>Cargando…</div>}

      <MiniBars series={series} />

      <div style={{marginTop:8, fontSize:12, color:'#334155'}}>
        {series.length>0 ? `Mostrando ${series.length} mes(es)` : 'Sin datos para el rango seleccionado'}
      </div>
    </div>
  );
}
