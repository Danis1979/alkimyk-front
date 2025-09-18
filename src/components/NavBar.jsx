import { NavLink } from 'react-router-dom';

const linkStyle = ({ isActive }) => ({
  padding: '8px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  color: isActive ? 'white' : '#111827',
  background: isActive ? '#111827' : 'transparent',
  border: isActive ? '1px solid #111827' : '1px solid #e5e7eb',
});

export default function NavBar() {
  return (
    <nav style={{ display:'flex', gap:8, alignItems:'center', padding:12, borderBottom:'1px solid #e5e7eb' }}>
      <strong style={{ marginRight: 8 }}>CMR Alkimyk</strong>
      <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
      <NavLink to="/orders"    style={linkStyle}>Pedidos</NavLink>
      <NavLink to="/sales" style={linkStyle}>Ventas</NavLink>
      <NavLink to="/purchases" style={linkStyle}>Compras</NavLink>
      <NavLink to="/production" style={linkStyle}>Producción</NavLink>
      <NavLink to="/inventory" style={linkStyle}>Stock</NavLink>
      <NavLink to="/cheques" style={linkStyle}>Cheques</NavLink>
      <NavLink to="/masters" style={linkStyle}>Maestros</NavLink>
      <NavLink to="/reports" style={linkStyle}>Informes</NavLink>
      <NavLink to="/inventory" style={linkStyle}>Inventario</NavLink>
      <NavLink to="/cxc"       style={linkStyle}>CxC</NavLink>
    </nav>
  );
}
