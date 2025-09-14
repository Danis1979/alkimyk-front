import React from 'react';
import { http } from '../lib/http';
export default function Inventory() {
  const csvUrl = `${http.defaults.baseURL}/reports/stock.csv`;
  return (
    <div style={{padding:16}}>
      <h2 style={{marginTop:0}}>Inventario</h2>
      <p>Descargá el stock actual en CSV para Excel/Google Sheets.</p>
      <a
        href={csvUrl}
        style={{display:'inline-block', padding:'10px 14px', border:'1px solid #e5e7eb', borderRadius:8, textDecoration:'none'}}
      >
        ⬇️ Exportar <code>stock.csv</code>
      </a>
      <details style={{marginTop:16}}>
        <summary>Ayuda</summary>
        <ul style={{marginTop:8}}>
          <li>Si tu navegador bloquea popups, se abrirá en la misma pestaña.</li>
          <li>El archivo respeta CORS (lo pudimos probar desde el dominio del front).</li>
        </ul>
      </details>
    </div>
  );
}
