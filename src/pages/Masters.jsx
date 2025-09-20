// src/pages/Masters.jsx
import { Link, Routes, Route } from 'react-router-dom';
import Products from './masters/Products.jsx';  // 👈 nuevo import

function Card({ to, title, subtitle }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        textDecoration: 'none',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 14,
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{title}</div>
      <div style={{ color: '#64748b', fontSize: 13 }}>{subtitle}</div>
    </Link>
  );
}

function Home() {
  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 12 }}>Maestros</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
          maxWidth: 820,
        }}
      >
        <Card to="products"  title="Productos / Insumos" subtitle="ABM, SKU, UoM, precios, activo" />
        <Card to="clients"   title="Clientes"           subtitle="ABM, CUIT, dirección, listas de precio" />
        <Card to="suppliers" title="Proveedores"        subtitle="ABM, CUIT, contacto" />
        <Card to="uom"       title="Unidades de medida" subtitle="kg, un, caja, etc." />
        <Card to="prices"    title="Listas de precios"  subtitle="Gestión de listas y asignación" />
      </div>
    </>
  );
}

function Stub({ title }) {
  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: '#64748b', marginBottom: 12 }}>
        Página en construcción. Acá va el ABM completo según el modelo.
      </p>
      <Link
        to="/masters"
        style={{
          textDecoration: 'none',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: '8px 10px',
          display: 'inline-block',
        }}
      >
        ← Volver a Maestros
      </Link>
    </div>
  );
}

export default function Masters() {
  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="products"  element={<Products />} />     {/* 👈 ahora ABM real */}
        <Route path="clients"   element={<Stub title="Clientes" />} />
        <Route path="suppliers" element={<Stub title="Proveedores" />} />
        <Route path="uom"       element={<Stub title="Unidades de medida" />} />
        <Route path="prices"    element={<Stub title="Listas de precios" />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}