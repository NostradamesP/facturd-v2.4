import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | FactuRD` : 'FactuRD - Facturación DGII';
    return () => { document.title = prev; };
  }, [title]);
}
