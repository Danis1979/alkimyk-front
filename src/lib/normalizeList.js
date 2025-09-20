// src/lib/normalizeList.js
// Normaliza respuestas variadas (array plano, {items:[]}, {data:[]}, etc.)
// y mapea a { id, label, price?, sku?, raw }
export function normalizeList(x, kind = 'generic') {
  let arr = [];
  if (Array.isArray(x)) arr = x;
  else if (Array.isArray(x?.items)) arr = x.items;
  else if (Array.isArray(x?.data)) arr = x.data;
  else if (Array.isArray(x?.results)) arr = x.results;
  else if (x && typeof x === 'object' && Array.isArray(x.items)) arr = x.items;
  else arr = [];

  return arr
    .map((obj) => {
      const id =
        obj.id ??
        obj._id ??
        obj.value ??
        obj.key ??
        null;

      let label = '';
      if (kind === 'client') {
        label =
          obj.name ??
          obj.nombre ??
          obj.razonSocial ??
          obj.client ??
          obj.cliente ??
          obj.company ??
          '';
      } else if (kind === 'product') {
        label =
          obj.name ??
          obj.nombre ??
          obj.product ??
          obj.descripcion ??
          obj.title ??
          obj.sku ??
          '';
      } else {
        label =
          obj.name ??
          obj.nombre ??
          obj.title ??
          obj.label ??
          '';
      }

      const price =
        obj.price ??
        obj.precioLista ??
        obj.precio ??
        obj.pvp ??
        obj.neto ??
        undefined;

      const sku = obj.sku ?? obj.codigo ?? undefined;

      return {
        id,
        label: String(label || '').trim(),
        price,
        sku,
        raw: obj,
      };
    })
    .filter((o) => o.label || o.id);
}