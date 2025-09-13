import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderById } from '../services/orders.service';
import { fmtCurrency, fmtDate } from '../lib/format';

export default function OrderDetail() {
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id),
    staleTime: 15_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    retry: (count, err) => {
      if (err?.response?.status === 404) return false; // 404 no reintenta
      return count < 2;
    },
  });

  if (isLoading) return <div>Cargando pedido…</div>;

  if (isError) {
    const code = error?.response?.status;
    return (
      <div style={{ color: 'crimson' }}>
        {code === 404 ? 'Pedido no encontrado.' : 'No se pudo cargar el pedido.'}
      </div>
    );
  }

  if (!data) {
    return <div style={{ color: '#6b7280' }}>
      Detalle no disponible (backend offline).
    </div>;
  }

  const { id: oid, date, client, total, _raw } = data;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Pedido #{oid}</h2>
        <Link to="/orders">← Volver a Órdenes</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        <Info label="Fecha"   value={date ? fmtDate(date) : '—'} />
        <Info label="Cliente" value={client || '—'} />
        <Info label="Total"   value={fmtCurrency(total || 0)} />
      </div>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer' }}>Ver JSON crudo</summary>
        <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify(_raw ?? data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16 }}>{value}</div>
    </div>
  );
}