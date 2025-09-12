import React from 'react';
import { getKpis } from './services/example.service';

export default function App() {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    getKpis()
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  const apiBase =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    process.env.REACT_APP_API_BASE_URL ||
    'http://localhost:3000';

  return (
    <div style={{fontFamily:'sans-serif', padding:16}}>
      <h1>Frontend ✅</h1>
      <p>API_BASE_URL = {apiBase}</p>
      {err && <pre style={{color:'crimson'}}>Error: {err}</pre>}
      <pre>{data ? JSON.stringify(data, null, 2) : 'Cargando...'}</pre>
    </div>
  );
}
