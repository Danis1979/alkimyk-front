import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { searchProducts } from '../../services/masters.service';
import { formatARS } from '../../utils/format';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [page, setPage] = useState(() => Number(params.get('page') || 1));
  const limit = 20;

  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (page > 1) next.set('page', String(page));
    setParams(next, { replace: true });
  }, [q, page, setParams]);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['masters.products', { q, page, limit }],
    queryFn: () => searchProducts({ q, page, limit }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const canPrev = page > 1;
  const canNext = page < pages;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '8px 0 12px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Productos</h1>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {isFetching ? 'Actualizando…' : `Mostrando ${items.length} de ${total} (pág. ${page}/${pages})`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Buscar por nombre / SKU"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff', opacity: canPrev ? 1 : .5 }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => canNext && setPage((p) => p + 1)}
            disabled={!canNext}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff', opacity: canNext ? 1 : .5 }}
          >
            Siguiente →
          </button>
        </div>
      </div>

      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error: {String(error?.message || error)}</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>ID</th>
              <th style={{ padding: '10px 12px' }}>SKU</th>
              <th style={{ padding: '10px 12px' }}>Nombre</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Precio</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px' }}>{p.id}</td>
                <td style={{ padding: '10px 12px' }}>{p.sku}</td>
                <td style={{ padding: '10px 12px' }}>{p.name}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatARS(p.price)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{p.stock}</td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12 }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
