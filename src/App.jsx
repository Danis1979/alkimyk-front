import { StrictMode } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';

const qc = new QueryClient();

const Nav = () => (
  <nav style={{display:'flex',gap:12,alignItems:'center',padding:'8px 12px',borderBottom:'1px solid #e5e7eb'}}>
    <strong>CMR Alkimyk</strong>
    <NavLink to="/dashboard">Dashboard</NavLink>
    <NavLink to="/orders">Pedidos</NavLink>
    <span style={{color:'#9ca3af'}}>Inventario</span>
    <span style={{color:'#9ca3af'}}>CxC</span>
  </nav>
);

export default function App(){
  return (
    <StrictMode>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <Nav />
          <div style={{padding:16}}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );
}
