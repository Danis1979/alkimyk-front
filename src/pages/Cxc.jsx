import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http';
import { fmtCurrency } from '../lib/format';

export default function Cxc() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['kpis-cxc'],
    queryFn: async () => (await http.get('/reports/kpis')).data,
    staleTime: 30000,
  });

  if (isLoading) return <div style={{padding:16}}>Cargando…</div>;
  if (isError)   return <div style={{padding:16, color:'crimson'}}>No se pudo cargar KPIs.</div>;

  const pending = Number(data?.receivablesPending || 0);
  return (
    <div style={{padding:16}}>
      <h2 style={{marginTop:0}}>Cuentas por Cobrar</h2>
      <div style={{fontSize:12,color:'#6b7280'}}>Pendiente al día de hoy</div>
      <div style={{fontSize:36,fontWeight:700,margin:'6px 0'}}>{fmtCurrency(pending)}</div>
      <div style={{fontSize:12,color:'#9ca3af'}}>
        {pending > 0 ? 'Revisá las cobranzas pendientes.' : '¡Todo al día!'}
      </div>
    </div>
  );
}
