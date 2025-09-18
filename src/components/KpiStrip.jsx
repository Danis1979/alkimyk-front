import { useQuery } from '@tanstack/react-query';

export default function KpiStrip(){
  const API = import.meta.env.VITE_API_BASE_URL || '';
  const { data } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      const r = await fetch(`${API}/reports/kpis`);
      if(!r.ok) throw new Error('KPIs failed');
      return r.json();
    },
    staleTime: 60_000,
  });

  const Item = ({label, value}) => (
    <div className="px-3 py-2 rounded-md bg-white shadow border text-sm">
      <div className="text-slate-500">{label}</div>
      <div className="text-slate-900 font-semibold">{value ?? '—'}</div>
    </div>
  );

  return (
    <div className="sticky top-0 z-10 bg-slate-100/60 backdrop-blur supports-[backdrop-filter]:bg-slate-100/40">
      <div className="max-w-6xl mx-auto px-3 py-2 flex gap-2 overflow-x-auto">
        <Item label="Cobrado"   value={data?.collections?.receivables?.collected} />
        <Item label="Pendiente" value={data?.collections?.receivables?.pending} />
        <Item label="Vencido"   value={data?.collections?.receivables?.overdue} />
        <Item label="Caja"      value={data?.cash?.cash} />
        <Item label="Banco"     value={data?.cash?.bank} />
        <Item label="Cheques por vencer" value={data?.cheques?.toCollectThisWeek} />
        <Item label="Cheques a debitar"  value={data?.cheques?.toDebitThisWeek} />
        <Item label="OT abiertas"        value={data?.production?.openOrders} />
      </div>
    </div>
  );
}
