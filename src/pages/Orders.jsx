import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { searchOrders as fetchOrdersSearch } from '../services/orders.service';
import { useSortParam } from '../hooks/useSortParam';
import { formatARS } from '../utils/format';

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-AR');
  } catch {
    return iso ?? '—';
  }
}

export default function Orders() {
  const { sort, toggle } = useSortParam();

  // Filtros + paginación
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['orders.search', { page, from, to, status, clientEmail }],
    queryFn: () => fetchOrdersSearch({ page, limit: 20, from, to, status, clientEmail }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  // Ordenamiento client-side según el param ?sort= de la URL
  const rows = useMemo(() => {
    if (!sort) return items;
    const dir = sort.startsWith('-') ? -1 : 1;
    const key = sort.replace(/^-/, '');
    const getVal = (o) => {
      if (key === 'total') return Number(o.total ?? 0);
      if (key === 'date') return new Date(o.date ?? 0).getTime();
      if (key === 'client') return String(o.client ?? '').toLowerCase();
      return 0;
    };
    return [...items].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [items, sort]);

  const canPrev = page > 1;
  const canNext = page < pages;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '8px 0 12px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Pedidos</h1>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {isFetching ? 'Actualizando…' : `Mostrando ${items.length} de ${total} (pág. ${page}/${pages})`}
        </span>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) auto auto',
          gap: 8,
          alignItems: 'end',
          border: '1px solid #e2e8f0',
          background: '#fff',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Desde</div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Hasta</div>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Estado</div>
          <input
            placeholder="ej. CONFIRMADO"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>E-mail cliente</div>
          <input
            placeholder="cliente@dominio.com"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Acciones</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                refetch();
              }}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setFrom('');
                setTo('');
                setStatus('');
                setClientEmail('');
                setPage(1);
                refetch();
              }}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff' }}
            >
              Limpiar
            </button>
          </div>
        </div>
        <div style={{ justifySelf: 'end' }}>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Paginación</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                opacity: canPrev ? 1 : 0.5,
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 10px',
                background: '#fff',
              }}
            >
              ← Anterior
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setPage((p) => (canNext ? p + 1 : p))}
              style={{
                opacity: canNext ? 1 : 0.5,
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 10px',
                background: '#fff',
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error: {String(error?.message || error)}</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>ID</th>
              <th style={{ padding: '10px 12px' }}>
                <button
                  type="button"
                  onClick={() => toggle('date')}
                  style={{ textDecoration: 'underline', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                >
                  Fecha {sort === 'date' ? '↑' : sort === '-date' ? '↓' : ''}
                </button>
              </th>
              <th style={{ padding: '10px 12px' }}>
                <button
                  type="button"
                  onClick={() => toggle('client')}
                  style={{ textDecoration: 'underline', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                >
                  Cliente {sort === 'client' ? '↑' : sort === '-client' ? '↓' : ''}
                </button>
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => toggle('total')}
                  style={{ textDecoration: 'underline', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                >
                  Total {sort === 'total' ? '↑' : sort === '-total' ? '↓' : ''}
                </button>
              </th>
              <th style={{ padding: '10px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px' }}>{o.id}</td>
                <td style={{ padding: '10px 12px' }}>{fmtDate(o.date || o.dateKey)}</td>
                <td style={{ padding: '10px 12px' }}>{o.client}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatARS(o.total)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <Link to={`/orders/${o.id}`} style={{ textDecoration: 'none' }}>
                    ver
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '12px' }}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
