// src/pages/Masters.jsx
import { Link } from 'react-router-dom';

export default function Masters() {
  const Card = ({ title, to, desc }) => (
    <Link to={to} style={{
      textDecoration:'none', border:'1px solid #e2e8f0', borderRadius:12, padding:16, display:'block'
    }}>
      <div style={{fontWeight:600, color:'#0f172a', marginBottom:6}}>{title}</div>
      <div style={{color:'#64748b', fontSize:14}}>{desc}</div>
    </Link>
  );

  return (
    <div style={{maxWidth:1000, margin:'0 auto'}}>
      <h1 style={{fontSize:20, fontWeight:600, marginBottom:12}}>Maestros</h1>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12}}>
        <Card title="Productos / Insumos" to="/masters/products"
              desc="Alta y edición de productos, con SKU, UOM y precios." />
        <Card title="Clientes" to="/masters/clients"
              desc="Alta, CUIT, dirección y contactos." />
        <Card title="Proveedores" to="/masters/suppliers"
              desc="Alta de proveedores, CUIT y contacto." />
      </div>
    </div>
  );
}