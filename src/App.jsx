import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Receivables from './pages/Receivables';

export default function App() {
  const linkStyle = { padding: '6px 10px', borderRadius: 8, textDecoration: 'none', color: '#111827' };
  return (
    <BrowserRouter>
      <nav style={{
        padding: 12, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, flexWrap: 'wrap',
        position: 'sticky', top: 0, background: '#fff', zIndex: 10
      }}>
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
        <Link to="/orders" style={linkStyle}>Pedidos</Link>
        <Link to="/inventory" style={linkStyle}>Inventario</Link>
        <Link to="/receivables" style={linkStyle}>CxC</Link>
      </nav>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/receivables" element={<Receivables />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
