/**
 * Convierte distintas formas de respuesta en un array homogéneo.
 * Acepta: [], {items:[]}, {data:[]}, {results:[]}. Si nada coincide -> []
 */
export function toList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}
