// src/pages/OrdersPage.jsx
import { useMemo } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { formatARS } from '@/utils/format';

const statuses = ['', 'CONFIRMADO', 'CANCELADO', 'PENDIENTE'];
const formatDate = (iso) => (iso ? String(iso).slice(0, 10) : '');

export default function OrdersPage() {
  const { data, loading, error, params, setParams } = useOrders({
    page: 1,
    limit: 20,
  });

  const onChange = (key) => (e) => {
    const v = e?.target?.value ?? e;
    setParams(p => ({ ...p, page: 1, [key]: v }));
  };

  const clearFilters = () => {
    setParams(p => ({
      ...p,
      page: 1,
      from: '',
      to: '',
      status: '',
      clientEmail: '',
    }));
  };

  const canPrev = data.page > 1;
  const canNext = data.page < data.pages;
  const rows = useMemo(() => data.items ?? [], [data.items]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Órdenes</h1>

      {/* Filtros */}
      <div className="grid gap-3 md:grid-cols-5 bg-white p-3 rounded-lg shadow">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Desde</label>
          <input
            type="date"
            value={params.from}
            onChange={onChange('from')}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Hasta</label>
          <input
            type="date"
            value={params.to}
            onChange={onChange('to')}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Estado</label>
          <select
            value={params.status}
            onChange={onChange('status')}
            className="border rounded px-2 py-1"
          >
            {statuses.map(s => (
              <option key={s} value={s}>
                {s || '— Todos —'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm text-gray-600">Email cliente</label>
          <input
            type="email"
            value={params.clientEmail}
            onChange={onChange('clientEmail')}
            placeholder="cliente@dominio.com"
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="md:col-span-5">
          <button
            onClick={clearFilters}
            className="border px-3 py-1 rounded hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Cliente</th>
              <th className="text-right p-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-3" colSpan={4}>Cargando…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-3" colSpan={4}>Sin resultados</td>
              </tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{formatDate(r.date)}</td>
                <td className="p-2">{r.client}</td>
                <td className="p-2 text-right">{formatARS(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Registros: <b>{data.total ?? 0}</b> — Página <b>{data.page}</b> de <b>{data.pages}</b>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={params.limit}
            onChange={e => setParams(p => ({ ...p, page: 1, limit: Number(e.target.value) }))}
            className="border rounded px-2 py-1"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / pág.</option>)}
          </select>

          <button
            disabled={!canPrev}
            onClick={() => canPrev && setParams(p => ({ ...p, page: p.page - 1 }))}
            className={`border px-3 py-1 rounded ${canPrev ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
          >
            ◀
          </button>
          <button
            disabled={!canNext}
            onClick={() => canNext && setParams(p => ({ ...p, page: p.page + 1 }))}
            className={`border px-3 py-1 rounded ${canNext ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-600 text-sm">
          Error al cargar: {String(error.message || error)}
        </div>
      )}
    </div>
  );
}