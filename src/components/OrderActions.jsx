import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrderStatus, invoiceFromOrder } from '../services/orders.service';
import { useNavigate } from 'react-router-dom';

export default function OrderActions({ id, compact = false }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [docType, setDocType] = useState('A');

  const mAccept = useMutation({
    mutationFn: () => updateOrderStatus(id, 'ACEPTADO'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders.search'] });
      qc.invalidateQueries({ queryKey: ['orders.detail', String(id)] });
    },
  });

  const mInvoice = useMutation({
    mutationFn: () => invoiceFromOrder({ orderId: id, docType }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orders.search'] });
      qc.invalidateQueries({ queryKey: ['orders.detail', String(id)] });
      const saleId = res?.saleId ?? res?.id;
      if (saleId) navigate(`/sales/${saleId}`);
    },
  });

  const baseBtn = {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: compact ? '6px 8px' : '8px 10px',
    background: '#fff',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        style={baseBtn}
        onClick={() => mAccept.mutate()}
        disabled={mAccept.isPending}
        title="Reservar stock del pedido"
      >
        {mAccept.isPending ? 'Aceptando…' : 'Aceptar'}
      </button>

      <select
        value={docType}
        onChange={(e) => setDocType(e.target.value)}
        style={{ ...baseBtn, padding: '6px 8px' }}
        title="Tipo de documento"
      >
        <option value="A">Factura A</option>
        <option value="B">Factura B</option>
        <option value="C">Factura C</option>
        <option value="R">Remito</option>
      </select>

      <button
        style={baseBtn}
        onClick={() => mInvoice.mutate()}
        disabled={mInvoice.isPending}
        title="Generar venta / factura desde el pedido"
      >
        {mInvoice.isPending ? 'Facturando…' : 'Facturar'}
      </button>
    </div>
  );
}