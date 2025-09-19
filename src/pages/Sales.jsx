// src/pages/Sales.jsx
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fmtCurrency } from '../lib/format.js';
import { fetchOrdersSearch } from '../services/orders.service.js';

const PAGE_SIZES = [10, 20, 50];

function useIntParam(sp, name, fallback) {
  const v = parseInt(sp.get(name) || '', 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function formatDateISO(d) {
  if (!d) return '';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('es-AR');
  } catch {
    return d;
  }
}

function Toolbar({ page, limit, sort, setParam }) {
  return (
    <div style={{
      display:'flex', gap:12, alignItems:'center', justifyContent:'space-between',
      margin:'12px 0'
    }}>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        <label style={{fontSize:12, color:'#475569'}}>Tamaño</label>
        <select
          value={limit}
          onChange={e => setParam('limit', String(parseInt(e.target.value, 10) || 20))}
          style={{border:'1px solid #cbd5e1', borderRadius:6, padding:'6px 8px'}}
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label style={{fontSize:12, color:'#475569'}}>Orden</label>
        <select
          value={sort}
          onChange={e => setParam('sort', e.target.value)}
          style={{border:'1px solid #cbd5e1', borderRadius:6, padding:'6px 8px'}}
        >
          <option value="-date">Fecha ↓ (recientes)</option>
          <option value="date">Fecha ↑ (antiguos)</option>
        </select>
      </div>

      <Link
        to="/sales/new"
        style={{textDecoration:'none', padding:'6px 10px', border:'1px solid #cbd5e1', borderRadius:6}}
      >
        + Nueva venta
      </Link>
    </div>
  );
}

function Pagination({ page, limit, count, setParam }) {
  // Cuando la API no devuelve total páginas, usamos heurística:
  // - deshabilitar Siguiente si count < limit (no hay más)
  // - habilitar Anterior si page > 1
  const canPrev = page > 1;
  const canNext = count >= limit; // si vino “limit” elementos, asumimos que posiblemente hay otra página

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      marginTop:12, paddingTop:8, borderTop:'1px solid #e2e8f0'
    }}>
      <div style={{fontSize:12, color:'#64748b'}}>
        Página {page} • Tamaño {limit}
      </div>
      <div style={{display:'flex', gap:8}}>
        <button
          onClick={() => setParam('page', String(page - 1))}
          disabled={!canPrev}
          style={{
            padding:'6px 10px',
            border:'1px solid #cbd5e1',
            borderRadius:6,
            background: canPrev ? 'white' : '#f1f5f9',
            color: canPrev ? '#0f172a' : '#94a3b8',
            cursor: canPrev ? 'pointer' : 'not-allowed'
          }}
        >
          ← Anterior
        </button>
        <button
          onClick={() => setParam('page', String(page + 1))}
          disabled={!canNext}
          style={{
            padding:'6px 10px',
            border:'1px solid #cbd5e1',
            borderRadius:6,
            background: canNext ? 'white' : '#f1f5f9',
            color: canNext ? '#0f172a' : '#94a3b8',
            cursor: canNext ? 'pointer' : 'not-allowed'
          }}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

export default function Sales() {
  const [sp, setSp] = useSearchParams();
  const page  = useIntParam(sp, 'page', 1);
  const limit = useIntParam(sp, 'limit', 10);
  const sort  = sp.get('sort') || '-date';

  const setParam = (k, v) => {
    const n = new URLSearchParams(sp);
    if (v == null || v === '') n.delete(k);
    else n.set(k, v);
    // si cambia limit o sort, volvemos a página 1
    if ((k === 'limit' || k === 'sort') && page !== 1) n.set('page', '1');
    setSp(n, { replace: true });
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sales.list', { page, limit, sort }],
    queryFn: () => fetchOrdersSearch({ page, limit, sort }),
    keepPreviousData: true
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const showing = items.length;

  return (
    <div style={{maxWidth: 960, margin: '0 auto'}}>
      <h1 style={{fontSize: 20, fontWeight: 600, margin:'8px 0 12px'}}>Ventas</h1>

      <Toolbar page={page} limit={limit} sort={sort} setParam={setParam} />

      {isError && (
        <div style={{color:'#b91c1c', marginBottom:8}}>
          Error al cargar ventas: {String(error?.message || 'desconocido')}
        </div>
      )}
      {isLoading && (
        <div style={{color:'#475569', marginBottom:8}}>Cargando…</div>
      )}

      {!isLoading && (
        <table style={{width:'100%', borderCollapse:'collapse', border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden'}}>
          <thead>
            <tr style={{background:'#f8fafc', textAlign:'left'}}>
              <th style={{padding:'10px 8px', fontSize:12, color:'#475569'}}>ID</th>
              <th style={{padding:'10px 8px', fontSize:12, color:'#475569'}}>Fecha</th>
              <th style={{padding:'10px 8px', fontSize:12, color:'#475569'}}>Cliente</th>
              <th style={{padding:'10px 8px', fontSize:12, color:'#475569', textAlign:'right'}}>Total</th>
              <th style={{padding:'10px 8px', fontSize:12, color:'#475569'}}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(o => (
              <tr key={o.id} style={{borderTop:'1px solid #e2e8f0'}}>
                <td style={{padding:'8px 6px'}}>#{o.id}</td>
                <td style={{padding:'8px 6px'}}>{formatDateISO(o.date)}</td>
                <td style={{padding:'8px 6px'}}>{o.client}</td>
                <td style={{padding:'8px 6px', textAlign:'right'}}>{fmtCurrency(o.total)}</td>
                <td style={{padding:'8px 6px'}}>
                  <Link to={`/orders/${o.id}`} style={{textDecoration:'none'}}>Ver detalle →</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{padding:16, color:'#64748b'}}>Sin resultados.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{marginTop:8, fontSize:12, color:'#334155'}}>
        {showing > 0 ? `Mostrando ${showing} registro(s)` : 'Sin datos'}
      </div>

      <Pagination
        page={page}
        limit={limit}
        count={items.length}
        setParam={setParam}
      />
    </div>
  );
}