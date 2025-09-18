export default function Reports(){
  const API = import.meta.env.VITE_API_BASE_URL || '';
  return (
    <div>
      <h1>Informes</h1>
      <ul>
        <li><a href={`${API}/reports/stock.csv`} target="_blank" rel="noreferrer">Descargar stock.csv</a></li>
      </ul>
      <p>Más reportes (PDF/Excel) por integrar.</p>
    </div>
  );
}
