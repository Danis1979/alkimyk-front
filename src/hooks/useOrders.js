// src/hooks/useOrders.js
import { useEffect, useMemo, useState } from 'react';
import { searchOrders } from '@/services/orders.service';

const DEFAULT_LIMIT = 20;

export function useOrders(initial = {}) {
  const [params, setParams] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    from: '',
    to: '',
    status: '',
    clientEmail: '',
    ...initial,
  });

  const [state, setState] = useState({
    data: { items: [], total: 0, page: 1, pages: 1 },
    loading: false,
    error: null,
  });

  const effectiveParams = useMemo(() => ({ ...params }), [params]);

  const fetchData = async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await searchOrders(effectiveParams);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err }));
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveParams.page, effectiveParams.limit, effectiveParams.from, effectiveParams.to, effectiveParams.status, effectiveParams.clientEmail]);

  return {
    ...state,
    params,
    setParams,
    refetch: fetchData,
  };
}