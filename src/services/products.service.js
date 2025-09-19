import { http } from '../lib/http';
function pickLabel(p){const base=p?.name??p?.nombre??p?.descripcion??`Producto #${p?.id??''}`;return p?.sku?`${p.sku} — ${base}`:base;}
function pickPrice(p){return p?.precioLista??p?.precio??p?.priceList??p?.price??p?.costoStd??0;}
export async function searchProducts(q,{limit=8,page=1}={}){if(!q||q.trim().length<2)return[];const qs=new URLSearchParams({q:q.trim(),limit:String(limit),page:String(page)});try{const{data}=await http.get(`/products/search?${qs.toString()}`);const items=Array.isArray(data?.items)?data.items:Array.isArray(data)?data:[];return items.map(p=>({id:p.id,label:pickLabel(p),price:pickPrice(p),raw:p}));}catch{return[];}}
