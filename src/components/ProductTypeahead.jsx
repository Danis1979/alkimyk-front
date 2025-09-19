import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProducts } from '../services/products.service';
export default function ProductTypeahead({ value,onChange,selectedId,onSelect,placeholder='Buscar producto… (mín. 2 letras)' }) {
  const [open,setOpen]=useState(false); const [q,setQ]=useState(value??''); const rootRef=useRef(null);
  useEffect(()=>{setQ(value??'');},[value]);
  const debounced=useDebounced(q,250);
  const {data:options=[],isFetching}=useQuery({queryKey:['products.search',debounced],queryFn:()=>searchProducts(debounced),enabled:debounced.trim().length>=2});
  useEffect(()=>{function onDoc(e){if(!rootRef.current)return;if(!rootRef.current.contains(e.target))setOpen(false);}document.addEventListener('mousedown',onDoc);return()=>document.removeEventListener('mousedown',onDoc);},[]);
  return (<div ref={rootRef} style={{position:'relative'}}>
    <input type="text" value={q} placeholder={placeholder} onFocus={()=>setOpen(true)}
      onChange={(e)=>{const txt=e.target.value;setQ(txt);onChange?.(txt);if(selectedId)onSelect?.(null,txt,null);}}
      style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'6px 8px',width:'100%'}} />
    {selectedId&&(<button type="button" onClick={()=>onSelect?.(null,q,null)} title="Quitar selección"
      style={{position:'absolute',right:6,top:4,border:'1px solid #e2e8f0',borderRadius:6,background:'#fff',padding:'2px 6px',fontSize:12}}>×</button>)}
    {open&&q.trim().length>=2&&(<div style={{position:'absolute',zIndex:30,top:'110%',left:0,right:0,border:'1px solid #e2e8f0',borderRadius:8,background:'#fff',boxShadow:'0 6px 20px rgba(15,23,42,0.08)'}}>
      {isFetching&&<div style={{padding:8,color:'#64748b',fontSize:14}}>Buscando…</div>}
      {!isFetching&&options.length===0&&<div style={{padding:8,color:'#64748b',fontSize:14}}>Sin coincidencias</div>}
      {!isFetching&&options.map(opt=>(
        <div key={opt.id} onMouseDown={(e)=>{e.preventDefault();onSelect?.(opt.id,opt.label,Number(opt.price??0));setQ(opt.label);setOpen(false);}}
          style={{padding:'8px 10px',cursor:'pointer',background:selectedId===opt.id?'#f1f5f9':'#fff'}}>{opt.label}</div>
      ))}
    </div>)}
  </div>);
}
function useDebounced(value,delay=250){const [v,setV]=useState(value);useEffect(()=>{const t=setTimeout(()=>setV(value),delay);return()=>clearTimeout(t);},[value,delay]);return v;}
