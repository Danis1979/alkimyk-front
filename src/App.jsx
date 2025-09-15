import { NavLink, Routes, Route } from 'react-router-dom';

import Dashboard    from './pages/Dashboard.jsx';
import Orders       from './pages/Orders.jsx';
import OrderDetail  from './pages/OrderDetail.jsx';
import Inventory    from './pages/Inventory.jsx';
import Cxc          from './pages/Cxc.jsx';

function Header() {
  const linkStyle = ({ isActive }) => ({
    padding: '8px 12px',
    borderRadius: 6,
    textDecoration: 'none',
    color: isActive ? '#111827' : '#374151',
    background: isActive ? '#e5e7eb' : 'transparent'
  });
  return (
    <header style={{display:'flex',alignItems:'center',gap:12, padding:'12px 16px', borderBottom:'1px solid #e5e7eb'}}>
      <div style={{fontWeight:700}}>CMR Alkimyk</div>
      <nav style={{display:'flex',gap:8}}>
        <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/orders"    style={linkStyle}>Pedidos</NavLink>
        <NavLink to="/inventory" style={linkStyle}>Inventario</NavLink>
        <NavLink to="/cxc"       style={linkStyle}>CxC</NavLink>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <div style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'}}>
      <Header />
      <main style={{padding:16, maxWidth:1100, margin:'0 auto'}}>
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/orders"        element={<Orders />} />
          <Route path="/orders/:id"    element={<OrderDetail />} />
          <Route path="/inventory"     element={<Inventory />} />
          <Route path="/cxc"           element={<Cxc />} />
        </Routes>
      </main>
    </div>
  );
}
