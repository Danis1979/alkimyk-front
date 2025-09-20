// src/pages/Cheques.jsx
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchCheques, depositCheque, sellCheque, debitCheque, rejectCheque } from '../services/cheques.service';
import { fmtCurrency } from '../lib/format';

function Label({ children }) {
  return <span style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>{children}</span>;
}

function todayYMD() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function Cheques() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  // Filtros
  const page  = Math.max(1, parseInt(sp.get('page')  || '1', 10));
  const limit = [10, 20, 50].includes(parseInt(sp.get('limit') || '20', 10))
    ? parseInt(sp.get('limit') || '20', 10)
    : 20;
  const sort   = sp.get('sort')   || '-emision';
  const tipo   = sp.get('tipo')   || ''; // ''|recibido|emitido
  const estado = sp.get('estado') || ''; // Pendiente|Depositado|Acreditado|Rechazado|Vendido|Debitado
  const from   = sp.get('from')   || '';
  const to     = sp.get('to')     || '';
  const banco  = sp.get('banco')  || '';
  const numero = sp.get('numero') || '';
  const q      = sp.get('q')      || '';

  const setParam = (k, v, { resetPage = false } = {}) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === null || v === '') next.delete(k); else next.set(k, String(v));
    if (resetPage) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const queryKey = useMemo(
    () => ['cheques.search', { page, limit, sort, tipo, estado, from, to, banco, numero, q }],
    [page, limit, sort, tipo, estado, from, to, banco, numero, q]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => searchCheques({ page, limit, sort, tipo, estado, from, to, banco, numero, q }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const hasNext = items.length === limit;

  // Acciones
  const askDate = (label, def = todayYMD()) => {
    const v = window.prompt(label, def);
    if (!v) return null;
    // validar yyyy-mm-dd simple
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { alert('Formato esperado: YYYY-MM-DD'); return null; }
    return new Date(v).toISOString();
  };

  const doAction = async (fn, id, extra = {}) => {
    try {
      await fn(id, extra);
      await qc.invalidateQueries({ queryKey: ['cheques.search'] });
    } catch (e) {
      alert((e && e.message) || 'Acción no disponible');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>Cheques</h1>
        {/* Alta manual: usualmente no se usa (los recibidos se crean desde Venta y los emitidos desde Compra) */}
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Tipo</Label>
          <select
            value={tipo}
            onChange={(e) => setParam('tipo', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="">Todos</option>
            <option value="recibido">Recibidos</option>
            <option value="emitido">Emitidos</option>
          </select>
        </div>
        <div>
          <Label>Estado</Label>
          <select
            value={estado}
            onChange={(e) => setParam('estado', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Depositado">Depositado</option>
            <option value="Acreditado">Acreditado</option>
            <option value="Vendido">Vendido</option>
            <option value="Debitado">Debitado</option>
            <option value="Rechazado">Rechazado</option>
          </select>
        </div>
        <div>
          <Label>Desde (emisión)</Label>
          <input
            type="date"
            value={from}
            max={to || todayYMD()}
            onChange={(e) => setParam('from', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>
        <div>
          <Label>Hasta (emisión)</Label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setParam('to', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>
        <div>
          <Label>Banco</Label>
          <input
            type="text"
            value={banco}
            onChange={(e) => setParam('banco', e.target.value, { resetPage: true })}
            placeholder="Banco…"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>
        <div>
          <Label>Número</Label>
          <input
            type="text"
            value={numero}
            onChange={(e) => setParam('numero', e.target.value, { resetPage: true })}
            placeholder="00000000"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>
      </div>

      {/* Búsqueda libre, orden, acciones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 160px', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <Label>Buscar (banco / número / notas)</Label>
          <input
            type="text"
            value={q}
            onChange={(e) => setParam('q', e.target.value, { resetPage: true })}
            placeholder="Texto libre…"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          />
        </div>
        <div>
          <Label>Orden</Label>
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value, { resetPage: true })}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%' }}
          >
            <option value="-emision">Emisión desc.</option>
            <option value="emision">Emisión asc.</option>
            <option value="-importe">Importe desc.</option>
            <option value="importe">Importe asc.</option>
          </select>
        </div>
        <div>
          <Label>Acciones</Label>
          <button
            onClick={() => {
              const next = new URLSearchParams();
              next.set('page', '1');
              next.set('limit', String(limit));
              next.set('sort', '-emision');
              setSp(next, { replace: true });
            }}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', width: '100%', background: '#fff' }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Estado */}
      {isError && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error cargando cheques.</div>}
      {isLoading && <div style={{ color: '#475569', marginBottom: 8 }}>Cargando…</div>}

      {/* Tabla */}
      {!isLoading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>ID</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Tipo</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Banco / Nº</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Emisión</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Pago</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Importe</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Estado</th>
              <th style={{ textAlign: 'left',  padding: '10px 8px', fontWeight: 600, fontSize: 12, color: '#334155' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 8px' }}>#{c.id}</td>
                <td style={{ padding: '10px 8px' }}>{c.tipo}</td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{c.banco || '—'}</strong>
                    <span style={{ color: '#64748b' }}>{c.numero || ''}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 8px' }}>{c.emision ? new Date(c.emision).toLocaleDateString('es-AR') : '—'}</td>
                <td style={{ padding: '10px 8px' }}>{c.pago ? new Date(c.pago).toLocaleDateString('es-AR') : '—'}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtCurrency(c.importe)}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 999, border: '1px solid #cbd5e1', fontSize: 12,
                    background: c.estado === 'Rechazado' ? '#fee2e2'
                      : (c.estado === 'Vendido' || c.estado === 'Debitado' || c.estado === 'Acreditado') ? '#dcfce7'
                      : c.estado === 'Depositado' ? '#dbeafe'
                      : '#f1f5f9',
                  }}>
                    {c.estado}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* Recibidos, pendiente → Depositar / Vender */}
                  {c.tipo === 'recibido' && c.estado === 'Pendiente' && (
                    <>
                      <button
                        onClick={() => {
                          const iso = askDate('Fecha de depósito (YYYY-MM-DD):', todayYMD());
                          if (iso) doAction(depositCheque, c.id, { fecha: iso });
                        }}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
                      >
                        Depositar
                      </button>
                      <button
                        onClick={() => {
                          const iso = askDate('Fecha de venta (YYYY-MM-DD):', todayYMD());
                          if (!iso) return;
                          const netoStr = window.prompt('Importe neto acreditado (opcional):', '');
                          const neto = netoStr ? Number(netoStr) : undefined;
                          doAction(sellCheque, c.id, { fecha: iso, importeNeto: neto });
                        }}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
                      >
                        Vender
                      </button>
                    </>
                  )}

                  {/* Emitidos → Debitar / Rechazar */}
                  {c.tipo === 'emitido' && (c.estado === 'Pendiente' || c.estado === 'Depositado') && (
                    <>
                      <button
                        onClick={() => {
                          const iso = askDate('Fecha de débito (YYYY-MM-DD):', todayYMD());
                          if (iso) doAction(debitCheque, c.id, { fecha: iso });
                        }}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
                      >
                        Debitado
                      </button>
                      <button
                        onClick={() => {
                          const iso = askDate('Fecha de rechazo (YYYY-MM-DD):', todayYMD());
                          if (!iso) return;
                          const motivo = window.prompt('Motivo del rechazo (opcional):', '') || undefined;
                          doAction(rejectCheque, c.id, { fecha: iso, motivo });
                        }}
                        style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff' }}
                      >
                        Rechazado
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 16, color: '#64748b' }}>Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#475569' }}>
          Página {page} · {items.length} de {limit}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setParam('page', String(page - 1))}
            disabled={page <= 1}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: page <= 1 ? '#f1f5f9' : '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => setParam('page', String(page + 1))}
            disabled={!hasNext}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: !hasNext ? '#f1f5f9' : '#fff',
              cursor: !hasNext ? 'not-allowed' : 'pointer',
            }}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}