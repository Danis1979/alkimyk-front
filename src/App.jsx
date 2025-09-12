import React from 'react'
import { http } from './lib/http'
export default function App(){
  const [data,setData]=React.useState(null),[err,setErr]=React.useState('')
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  React.useEffect(()=>{
    http.get('/reports/kpis').then(r=>setData(r.data)).catch(e=>setErr(e.message))
  },[])
  return <div style={{fontFamily:'sans-serif',padding:16}}>
    <h1>Frontend ✅</h1>
    <p>API_BASE_URL = {apiBase}</p>
    {err && <pre style={{color:'crimson'}}>Error: {err}</pre>}
    <pre>{data ? JSON.stringify(data,null,2) : 'Cargando...'}</pre>
  </div>
}
