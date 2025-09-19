import { useQuery } from "@tanstack/react-query";

const API = import.meta.env.VITE_API_BASE_URL || '';

function fmtARS(v){
  return new Intl.NumberFormat('es-AR',{ style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(v ?? 0);
}

export default function ReceivablesKpis(){
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports.receivables.summary'],
    queryFn: async () => {
      const res = await fetch(`${API}/reports/receivables.summary`);
      if(!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const paid = data?.paid ?? 0;
  const pending = data?.pending ?? 0;
  const overdue = data?.overdue ?? 0;
  const total = paid + pending + overdue || 0;

  const pct = (v) => total ? Math.round((v/total)*100) : 0;

  const Item = ({label, val, hint}) => (
    <div style={{
      flex:1, minWidth:180,
      border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px',
      background:'#fff'
    }}>
      <div style={{fontSize:12, color:'#64748b', marginBottom:6}}>{label}</div>
      <div style={{fontSize:20, fontWeight:700}}>{fmtARS(val)}</div>
      <div style={{fontSize:12, color:'#64748b'}}>{hint}</div>
    </div>
  );

  if (isError) {
    return <div style={{color:'#b91c1c', margin:'8px 0'}}>No se pudieron cargar KPIs de CxC.</div>;
  }

  return (
    <div style={{margin:'8px 0 16px'}}>
      <div style={{fontSize:14, color:'#334155', marginBottom:8}}>Cuentas por Cobrar (resumen)</div>
      <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
        <Item label="Cobrado"   val={isLoading ? 0 : paid}    hint={total? `${pct(paid)}% del total` : '—'} />
        <Item label="Pendiente" val={isLoading ? 0 : pending} hint={total? `${pct(pending)}% del total` : '—'} />
        <Item label="Vencido"   val={isLoading ? 0 : overdue} hint={total? `${pct(overdue)}% del total` : '—'} />
      </div>
    </div>
  );
}
