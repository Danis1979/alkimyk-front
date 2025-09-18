import { useSearchParams } from 'react-router-dom';

export function useSortParam() {
  const [sp, setSp] = useSearchParams();
  const sort = sp.get('sort') || '';
  const toggle = (key) => {
    const asc = key;
    const desc = `-${key}`;
    const next = sort === asc ? desc : (sort === desc ? '' : asc);
    const nsp = new URLSearchParams(sp);
    if (next) nsp.set('sort', next); else nsp.delete('sort');
    setSp(nsp, { replace: true });
  };
  return { sort, toggle };
}
