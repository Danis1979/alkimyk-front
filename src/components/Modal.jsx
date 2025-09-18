import { useEffect } from 'react';
export default function Modal({ open, title="Modal", onClose, children, footer }) {
  useEffect(()=>{ document.body.style.overflow = open ? 'hidden':'auto'; return ()=>{ document.body.style.overflow='auto'; }; },[open]);
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4">
        <div className="px-4 py-3 border-b text-slate-800 font-semibold">{title}</div>
        <div className="p-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t bg-slate-50">{footer}</div>}
      </div>
    </div>
  );
}
