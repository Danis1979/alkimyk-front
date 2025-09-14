import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/http';

export default function Inventory() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stock.csv'],
    queryFn: async () => {
      const r = await http.get('/reports/stock.csv', { responseType: 'text' });
      return r.data; // texto CSV
    },
    staleTime: 30_000,
  });

  const downloadHref = `${http.defaults.baseURL}/reports/stock.csv`;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Inventario</h1>
      <p style={{color:'#6b7280'}}>Descargá el stock como CSV. Si el endpoint está en preparación, verás un aviso.</p>

      <a
        href={downloadHref}
        style={{ display:'inline-block', padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, textDecoration:'none' }}
      >
        ⬇️ Descargar stock.csv
      </a>

      {isLoading && <div style={{marginTop:12}}>Cargando vista previa…</div>}
      {isError && (
        <div style={{ color:'crimson', marginTop:12 }}>
          No pudimos previsualizar el CSV (posible 500). Igual podés descargarlo: <code>{downloadHref}</code>
          <div style={{fontSize:12, color:'#6b7280', marginTop:4}}>Detalle: {String(error?.message || 'error')}</div>
        </div>
      )}

      {data && (
        <details style={{ marginTop: 16 }}>
          <summary style={{cursor:'pointer'}}>Vista previa (primeras líneas)</summary>
          <pre style={{ background:'#f9fafb', padding:12, borderRadius:8, overflow:'auto' }}>
{(data.split('\n').slice(0,20).join('\n'))}
          </pre>
        </details>
      )}
    </div>
  );
}
