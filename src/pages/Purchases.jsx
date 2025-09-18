import { useState } from 'react';
import Modal from '../components/Modal';

export default function Purchases(){
  const [open,setOpen]=useState(false);
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Compras</h1>
        <button className="px-3 py-2 rounded bg-slate-900 text-white" onClick={()=>setOpen(true)}>Nueva compra</button>
      </div>
      <p className="text-slate-600">Listado de compras (pendiente). Usaremos /purchases.</p>
      <Modal open={open} onClose={()=>setOpen(false)} title="Nueva compra" footer={
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={()=>setOpen(false)}>Cancelar</button>
          <button className="px-3 py-2 rounded bg-slate-900 text-white" onClick={()=>setOpen(false)}>Guardar</button>
        </div>
      }>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm text-slate-600">Proveedor</label><input className="w-full border rounded px-2 py-1" placeholder="Buscar/seleccionar"/></div>
          <div><label className="text-sm text-slate-600">Fecha</label><input type="date" className="w-full border rounded px-2 py-1"/></div>
          <div className="col-span-2"><label className="text-sm text-slate-600">Items</label><div className="border rounded p-2 text-sm text-slate-500">Tabla de items pendiente</div></div>
        </div>
      </Modal>
    </div>
  );
}
