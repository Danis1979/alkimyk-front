import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http';
import { fmtCurrency } from '../lib/format';

export default function Cxc() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['kpis-cxc'],
    queryFn: async () => (await http.get('/reports/kpis')).data,
    staleTime: 20_000,
  });

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Cuentas por Cobrar</h1>
      {isLoading && <div>Cargando…</div>}
      {isError && <div style={{color:'crimson'}}>No se pudo obtener información.</div>}
      {data && (
        <>
          <div style={{border:'1px solid #e5e7eb', borderRadius:8, padding:12, maxWidth:420}}>
            <div style={{fontSize:12, color:'#6b7280'}}>Pendiente</div>
            <div style={{fontSize:24, fontWeight:600}}>{fmtCurrency(data.receivablesPending || 0)}</div>
          </div>
          <p style={{marginTop:12, color:'#6b7280'}}>Próximamente: aging por tramo (0-30, 31-60, etc.)</p>
        </>
      )}
    </div>
  );
}
