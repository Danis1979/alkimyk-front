export default function Reports(){
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Informes</h1>
      <div className="grid gap-3">
        <a className="underline" href={(import.meta.env.VITE_API_BASE_URL||'')+'/reports/stock.csv'} target="_blank" rel="noreferrer">Descargar stock.csv</a>
        <div className="p-3 bg-white rounded border text-sm text-slate-600">Más reportes a integrar (PDF/Excel)</div>
      </div>
    </div>
  );
}
