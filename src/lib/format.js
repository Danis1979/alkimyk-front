export const fmtCurrency = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
    .format(Number.isFinite(n) ? n : 0);

export const fmtNumber = (n) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);
