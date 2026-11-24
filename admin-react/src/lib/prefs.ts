const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export const getPageSize = () => {
  const n = Number(read('sh_page_size'));
  return [10, 25, 50, 100].includes(n) ? n : 10;
};
export const setPageSize = (n: number) => write('sh_page_size', String(n));
export const getSidebarCollapsed = () => read('sh_sidebar') === '1';
export const setSidebarCollapsed = (v: boolean) => write('sh_sidebar', v ? '1' : '0');
