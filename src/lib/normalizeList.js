/**
 * Normaliza respuestas de APIs en diferentes formatos a un array homogéneo.
 * Acepta: [ ... ] | { items:[...] } | { data:[...] } | { results:[...] } | otro
 * Permite mapear cada item con una función opcional "mapper".
 */
export function normalizeList(x, mapper) {
  const arr = Array.isArray(x) ? x
    : (Array.isArray(x?.items)   ? x.items
    :  Array.isArray(x?.data)    ? x.data
    :  Array.isArray(x?.results) ? x.results
    :  []);

  const base = arr.map((it) => {
    const id =
      it.id ?? it.ID ?? it._id ?? it.value ?? it.productId ?? it.clientId ?? null;

    const label =
      it.label ?? it.name ?? it.nombre ?? it.title ??
      it.client ?? it.cliente ?? it.product ?? it.producto ??
      it.sku ?? '';

    return { id, label, name: label, raw: it };
  });

  return mapper ? base.map(mapper) : base;
}

// Default export para compatibilidad con imports por default
export default normalizeList;
