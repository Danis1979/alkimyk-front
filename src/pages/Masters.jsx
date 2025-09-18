import { useState } from 'react';
export default function Masters(){
  const [tab,setTab]=useState('products');
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Maestros</h1>
      <div className="flex gap-2 mb-3">
        <button className={`px-3 py-2 rounded border ${tab==='products'?'bg-slate-900 text-white':''}`} onClick={()=>setTab('products')}>Productos</button>
        <button className={`px-3 py-2 rounded border ${tab==='clients'?'bg-slate-900 text-white':''}`} onClick={()=>setTab('clients')}>Clientes</button>
        <button className={`px-3 py-2 rounded border ${tab==='suppliers'?'bg-slate-900 text-white':''}`} onClick={()=>setTab('suppliers')}>Proveedores</button>
      </div>
      <div className="bg-white rounded border p-3 text-sm text-slate-600">
        Grid simple de {tab} (pendiente) + alta básica.
      </div>
    </div>
  );
}
