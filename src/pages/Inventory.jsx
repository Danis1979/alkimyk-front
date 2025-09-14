import { http } from '../lib/http.js';

export default function Inventory() {
  const csvUrl = `${http.defaults.baseURL}/reports/stock.csv`;
  return (
    <div style={{ padding:16 }}>
      <h1 style={{ marginTop:0 }}>Inventario</h1>
      <p>Descargá el stock en CSV:</p>
      <a href={csvUrl} target="_blank" rel="noreferrer"
         style={{ display:'inline-block', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8 }}>
        Descargar stock.csv
      </a>
      <p style={{ marginTop:12, color:'#6b7280', fontSize:13 }}>
        (Vista tabular llegará en la siguiente iteración.)
      </p>
    </div>
  );
}
