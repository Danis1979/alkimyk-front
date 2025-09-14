import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http.js';
import { fmtCurrency } from '../lib/format.js';

export default function Cxc() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['kpis-cxc'],
    queryFn: async () => (await http.get('/reports/kpis')).data,
    staleTime: 20_000,
  });

  return (
    <div style={{ padding:16 }}>
      <h1 style={{ marginTop:0 }}>Cuentas por Cobrar</h1>
      {isLoading && <div>Cargando…</div>}
      {isError   && <div style={{ color:'crimson' }}>No se pudo cargar KPIs.</div>}
      {data && (
        <div style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12 }}>
          <div style={{ fontSize:12, color:'#6b7280' }}>CxC pendientes</div>
          <div style={{ fontSize:24, fontWeight:600 }}>{fmtCurrency(data.receivablesPending || 0)}</div>
        </div>
      )}
      <p style={{ marginTop:12, color:'#6b7280', fontSize:13 }}>
        (Aging y detalle por cliente en la próxima iteración.)
      </p>
    </div>
  );
}
