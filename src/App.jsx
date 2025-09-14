import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import NavBar from './components/NavBar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Inventory from './pages/Inventory.jsx';
import Cxc from './pages/Cxc.jsx';


const queryClient = new QueryClient();

function Layout({ children }) {
  return (
    <div>
      <NavBar />
      <main>{children}</main>
    </div>
  );
}

function Wrap({ element }) {
  return <Layout>{element}</Layout>;
}

const router = createBrowserRouter([
  { path: '/',           element: <Wrap element={<Dashboard />} /> },
  { path: '/dashboard',  element: <Wrap element={<Dashboard />} /> },
  { path: '/orders',     element: <Wrap element={<Orders />} /> },
  { path: '/orders/:id', element: <Wrap element={<OrderDetail />} /> },
  { path: '/inventory',  element: <Wrap element={<Inventory />} /> },
  { path: '/cxc',        element: <Wrap element={<Cxc />} /> },
  { path: '*',           element: <Wrap element={<div style={{padding:16}}>No encontrado</div>} /> },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
