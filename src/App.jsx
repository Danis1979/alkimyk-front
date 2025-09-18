import Nav from './components/Nav.jsx';
import { Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Inventory from './pages/Inventory.jsx';
import Cxc from './pages/Cxc.jsx';

// Nuevas páginas
import Sales from './pages/Sales.jsx';
import Purchases from './pages/Purchases.jsx';
import Production from './pages/Production.jsx';
import Cheques from './pages/Cheques.jsx';
import Masters from './pages/Masters.jsx';
import Reports from './pages/Reports.jsx';

export default function App() {
  return (
    <div style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'}}>
      <Nav />
      <div style={{padding:16}}>
        <Routes>
          {/* Existentes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/cxc" element={<Cxc />} />

          {/* Alias opcional */}
          <Route path="/stock" element={<Inventory />} />

          {/* Nuevas rutas */}
          <Route path="/sales" element={<Sales />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/production" element={<Production />} />
          <Route path="/cheques" element={<Cheques />} />
          <Route path="/masters" element={<Masters />} />
          <Route path="/reports" element={<Reports />} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}
