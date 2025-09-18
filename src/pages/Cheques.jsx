import { useState } from 'react';
export default function Cheques(){
  const [tab,setTab]=useState('recibidos');
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Cheques</h1>
      <div className="flex gap-2 mb-3">
        <button className={`px-3 py-2 rounded border ${tab==='recibidos'?'bg-slate-900 text-white':''}`} onClick={()=>setTab('recibidos')}>Recibidos</button>
        <button className={`px-3 py-2 rounded border ${tab==='emitidos'?'bg-slate-900 text-white':''}`} onClick={()=>setTab('emitidos')}>Emitidos</button>
      </div>
      <div className="bg-white rounded border p-3 text-sm text-slate-600">
        Listado de cheques {tab} (pendiente) + acciones: depositar, vender, debitar, rechazar.
      </div>
    </div>
  );
}
