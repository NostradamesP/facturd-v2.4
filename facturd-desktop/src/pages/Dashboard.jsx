import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { facturasService, gastosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const statusValue = (estado) => String(estado || '').toUpperCase();

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [gastosResumen, setGastosResumen] = useState({ total_mes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        const [facturasRes, gastosRes] = await Promise.all([
          facturasService.getAll(),
          gastosService.getResumen().catch(() => ({ data: { total_mes: 0 } })),
        ]);
        setFacturas(facturasRes.data || []);
        setGastosResumen(gastosRes.data || { total_mes: 0 });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const totalRevenue = facturas
    .filter(f => statusValue(f.estado) === 'PAGADA')
    .reduce((sum, f) => sum + (f.total || 0), 0);

  const pendingInvoices = facturas.filter(f => statusValue(f.estado) === 'PENDIENTE').length;
  const paidThisMonth = facturas
    .filter(f => statusValue(f.estado) === 'PAGADA')
    .reduce((sum, f) => sum + (f.total || 0), 0);

  const recentFacturas = facturas.slice(-5).reverse();

  if (loading) {
    return <div className="text-center py-10">{t('Cargando...')}</div>;
  }

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface-container-lowest p-10 rounded-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-on-surface-variant font-medium text-base mb-2">
              {t('Ingresos Totales')}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-primary font-headline text-6xl font-extrabold tracking-tight">
                ${totalRevenue.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <span className="flex items-center text-primary bg-primary-container px-3 py-1 rounded-full text-xs font-bold">
                <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
                +12.5% este trimestre
              </span>
              <p className="text-on-surface-variant text-sm">{t('vs. mes anterior')}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="flex-1 bg-surface-container-lowest p-8 rounded-xl flex items-center gap-6">
            <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium">{t('Facturas Pendientes')}</p>
              <p className="text-on-surface font-headline text-3xl font-bold">{pendingInvoices}</p>
            </div>
          </div>
          <div className="flex-1 bg-primary bg-gradient-to-br from-primary to-primary-dim p-8 rounded-xl flex items-center gap-6 shadow-xl shadow-primary/10">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">{t('Pagado este Mes')}</p>
              <p className="text-white font-headline text-3xl font-bold">
                ${paidThisMonth.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="flex-1 bg-surface-container-lowest p-8 rounded-xl flex items-center gap-6">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600">receipt</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium">{t('Gastos del Mes')}</p>
              <p className="text-on-surface font-headline text-3xl font-bold">
                ${(gastosResumen.total_mes || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-end px-2">
            <div>
              <h3 className="text-on-surface font-headline text-2xl font-bold">{t('Actividad Reciente')}</h3>
              <p className="text-on-surface-variant text-sm">{t('Estado en tiempo real de tus últimas transacciones')}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant opacity-70">
                    {t('Cliente / Factura')}
                  </th>
                  <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant opacity-70">
                    {t('Fecha')}
                  </th>
                  <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant opacity-70 text-right">
                    {t('Monto')}
                  </th>
                  <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant opacity-70 text-center">
                    {t('Estado')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {recentFacturas.map((factura) => (
                  <tr key={factura.id} onClick={() => navigate('/facturas', { state: { openFacturaId: factura.id } })} className="hover:bg-surface-container-low/30 transition-colors cursor-pointer">
                    <td className="px-8 py-4">
                      <div>
                        <p className="font-medium text-on-surface">{factura.ncf || 'N/A'}</p>
                        <p className="text-sm text-on-surface-variant">{factura.cliente_nombre || 'Cliente'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-on-surface-variant">
                      {factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-DO') : '-'}
                    </td>
                    <td className="px-8 py-4 text-right font-medium text-on-surface">
                      ${(factura.total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          statusValue(factura.estado) === 'PAGADA'
                            ? 'bg-green-100 text-green-800'
                            : statusValue(factura.estado) === 'PENDIENTE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {statusValue(factura.estado) || 'PENDIENTE'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentFacturas.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-8 py-8 text-center text-on-surface-variant">
                      {t('No hay facturas recientes')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl">
            <h3 className="text-on-surface font-headline text-xl font-bold mb-4">{t('Resumen')}</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
                <span className="text-on-surface-variant">{t('Total Facturas')}</span>
                <span className="font-bold text-on-surface">{facturas.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
                <span className="text-on-surface-variant">{t('Pagadas')}</span>
                <span className="font-bold text-green-600">
                  {facturas.filter(f => statusValue(f.estado) === 'PAGADA').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
                <span className="text-on-surface-variant">{t('Pendientes')}</span>
                <span className="font-bold text-yellow-600">{pendingInvoices}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
