import { Link } from 'react-router-dom';

export default function SalesNew() {
  return (
    <div style={{maxWidth: 900, margin: '0 auto'}}>
      <h1 style={{fontSize: 20, fontWeight: 600, marginBottom: 8}}>Nueva venta</h1>
      <p style={{color:'#64748b', marginBottom: 12}}>
        Formulario en construcción: próximo paso, seleccionar cliente y cargar ítems.
      </p>
      <Link to="/sales"
        style={{textDecoration:'none', padding:'6px 10px', border:'1px solid #cbd5e1', borderRadius:6}}>
        ← Volver a ventas
      </Link>
    </div>
  );
}
