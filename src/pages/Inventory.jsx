import { useEffect, useState } from 'react';
import { http } from '../lib/http';

export default function Inventory() {
  const api = (http?.defaults?.baseURL || '').replace(/\/$/, '');
  const url = `${api}/reports/stock.csv`;
  const [preview, setPreview] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const txt = await r.text();
        setPreview(txt.split('\n').slice(0, 12).join('\n'));
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [url]);

  return (
    <div style={{padding:16}}>
      <h2 style={{marginTop:0}}>Inventario</h2>
      <p>Descargá el stock completo en CSV:</p>
      <a href={url} target="_blank" rel="noreferrer" style={{display:'inline-block',padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,textDecoration:'none'}}>⬇ Descargar stock.csv</a>

      <h3 style={{marginTop:16}}>Vista previa (primeras filas)</h3>
      {err ? (
        <div style={{color:'crimson'}}>No se pudo obtener el CSV: {err}</div>
      ) : preview ? (
        <pre style={{background:'#f9fafb',padding:12,borderRadius:8,overflow:'auto'}}>{preview}</pre>
      ) : (
        <div>Cargando preview…</div>
      )}
    </div>
  );
}
