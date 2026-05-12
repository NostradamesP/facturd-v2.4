import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const pageTitles = {
    '/dashboard': t('Dashboard'),
    '/facturas': t('Facturas'),
    '/diseno': t('Diseño'),
    '/cotizaciones': 'Cotizaciones',
    '/clientes': t('Clientes'),
    '/proveedores': t('Proveedores'),
    '/inventario': t('Inventario'),
    '/cobros': t('Cobros'),
    '/reportes': t('Reportes'),
    '/empresa': t('Empresa'),
  };
  const title = pageTitles[location.pathname] || 'FactuRD';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <main className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar bg-surface relative w-full">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-4 lg:p-8 w-full max-w-none">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
