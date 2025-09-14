import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http';
import { fmtCurrency } from '../lib/format';

export default function Cxc() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['kpis','cxc'],
    queryFn: async () => (await http.get('/reports/kpis')).data,
    staleTime: 20_000,
  });
  return (
    <div style={{padding:16}}>
      <h2 style={{marginTop:0}}>Cuentas por Cobrar</h2>
      {isLoading && <div>Cargando…</div>}
      {isError && <div style={{color:'crimson'}}>No se pudo cargar.</div>}
      {data && (
        <div style={{border:'1px solid #e5e7eb', borderRadius:8, padding:12, maxWidth:360}}>
          <div style={{fontSize:12, color:'#6b7280'}}>Pendientes</div>
          <div style={{fontSize:24, fontWeight:700}}>{fmtCurrency(data.receivablesPending || 0)}</div>
        </div>
      )}
    </div>
  );
}
