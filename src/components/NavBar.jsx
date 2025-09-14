import { NavLink } from 'react-router-dom';

const linkStyle = { padding: '8px 12px', borderRadius: 8, textDecoration: 'none', color: '#111827' };
const active = { background: '#e5e7eb', fontWeight: 600 };

export default function NavBar() {
  return (
    <nav style={{display:'flex', gap:8, alignItems:'center', padding:'12px 16px', borderBottom:'1px solid #e5e7eb'}}>
      <div style={{fontWeight:700, marginRight:12}}>CMR Alkimyk</div>
      <NavLink to="/dashboard" style={({isActive}) => ({...linkStyle, ...(isActive?active:{})})}>Dashboard</NavLink>
      <NavLink to="/orders"    style={({isActive}) => ({...linkStyle, ...(isActive?active:{})})}>Pedidos</NavLink>
      <NavLink to="/inventory" style={({isActive}) => ({...linkStyle, ...(isActive?active:{})})}>Inventario</NavLink>
      <NavLink to="/cxc"       style={({isActive}) => ({...linkStyle, ...(isActive?active:{})})}>CxC</NavLink>
    </nav>
  );
}
