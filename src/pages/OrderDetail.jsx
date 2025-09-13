import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderById } from '../services/orders.service';
import { fmtCurrency } from '../lib/format';

export default function OrderDetail() {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id),
  });

  if (isLoading) return <div style={{ padding: 16 }}>Cargando pedido…</div>;
  if (isError)   return <div style={{ padding: 16, color:'crimson' }}>No se pudo cargar el pedido.</div>;
  if (!data)     return <div style={{ padding: 16, color:'#6b7280' }}>Detalle no disponible (backend offline).</div>;

  const fecha = data.date ? new Date(data.date).toLocaleString('es-AR') : '—';

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Pedido {data.id}</h1>
        <Link to="/orders" style={{ textDecoration: 'none' }}>← Volver</Link>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        <Card label="Fecha" value={fecha} />
        <Card label="Cliente" value={data.client ?? '—'} />
        <Card label="Total" value={fmtCurrency(data.total ?? 0)} />
      </section>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer' }}>Ver JSON crudo</summary>
        <pre style={{ marginTop: 8, background: '#f9fafb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify(data._raw ?? data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: 'white' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16 }}>{value}</div>
    </div>
  );
}
