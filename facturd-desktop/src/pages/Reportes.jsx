import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { facturasService, clientesService, pagosService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusValue = (estado) => String(estado || '').toUpperCase();

export default function Reportes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (user) {
      fetchData();
    }
    return () => { cancelled.current = true; };
  }, [user]);

  const fetchData = async () => {
    try {
      const [facturasRes, clientesRes, pagosRes] = await Promise.all([
        facturasService.getAll(),
        clientesService.getAll(),
        pagosService.getAll(),
      ]);
      if (cancelled.current) return;
      setFacturas(facturasRes.data || []);
      setClientes(clientesRes.data || []);
      setPagos(pagosRes.data || []);
    } catch (error) {
      if (!cancelled.current) console.error('Error fetching data:', error);
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  };

  const totalFacturado = useMemo(() => facturas.reduce((sum, f) => sum + (f.total || 0), 0), [facturas]);
  const totalCobrado = useMemo(() => pagos.reduce((sum, p) => sum + (p.monto || 0), 0), [pagos]);
  const promedioFactura = facturas.length > 0 ? totalFacturado / facturas.length : 0;

  const facturasPorMes = facturas.reduce((acc, f) => {
    const mes = f.fecha ? new Date(f.fecha).toLocaleDateString('es-DO', { month: 'short' }) : 'Unknown';
    acc[mes] = (acc[mes] || 0) + (f.total || 0);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-center py-10">{t('Cargando...')}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
          {t('Reports & Analytics')}
        </h1>
        <p className="text-on-surface-variant max-w-2xl leading-relaxed">
          {t('Financial insights and business intelligence for your company.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
            </div>
            <span className="text-xs font-bold text-primary bg-primary-container px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-on-surface-variant text-sm">{t('Total Invoiced')}</p>
          <p className="text-2xl font-bold text-on-surface font-headline">
            ${totalFacturado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">payments</span>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">+8%</span>
          </div>
          <p className="text-on-surface-variant text-sm">{t('Total Collected')}</p>
          <p className="text-2xl font-bold text-on-surface font-headline">
            ${totalCobrado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">group</span>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm">{t('Active Clients')}</p>
          <p className="text-2xl font-bold text-on-surface font-headline">{clientes.length}</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary">analytics</span>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm">{t('Average Invoice')}</p>
          <p className="text-2xl font-bold text-on-surface font-headline">
            ${promedioFactura.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <h3 className="font-headline text-xl font-bold text-on-surface mb-6">{t('Billing Trends')}</h3>
          <div className="space-y-4">
            {Object.entries(facturasPorMes).slice(0, 6).map(([mes, monto]) => (
              <div key={mes} className="flex items-center gap-4">
                <span className="w-16 text-sm text-on-surface-variant">{mes}</span>
                <div className="flex-1 h-8 bg-surface-container-low rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary-dim rounded-lg"
                    style={{ width: `${(monto / totalFacturado) * 100}%` }}
                  ></div>
                </div>
                <span className="w-24 text-right font-medium text-on-surface">
                  ${monto.toLocaleString('es-DO', { minimumFractionDigits: 0 })}
                </span>
              </div>
            ))}
            {Object.keys(facturasPorMes).length === 0 && (
              <p className="text-on-surface-variant text-center py-4">{t('No data available')}</p>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <h3 className="font-headline text-xl font-bold text-on-surface mb-6">{t('Invoice Status')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <span className="font-medium text-on-surface">{t('Paid')}</span>
              </div>
              <span className="font-bold text-green-600">
                {facturas.filter(f => statusValue(f.estado) === 'PAGADA').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-yellow-600">schedule</span>
                <span className="font-medium text-on-surface">{t('Pending')}</span>
              </div>
              <span className="font-bold text-yellow-600">
                {facturas.filter(f => statusValue(f.estado) === 'PENDIENTE').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-600">cancel</span>
                <span className="font-medium text-on-surface">{t('Overdue')}</span>
              </div>
              <span className="font-bold text-red-600">
                {facturas.filter(f => ['ANULADA', 'VENCIDA'].includes(statusValue(f.estado))).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-container/20 rounded-xl p-6 border border-primary/10">
        <div className="flex gap-4">
          <span className="material-symbols-outlined text-primary">info</span>
          <div>
            <p className="text-xs font-bold text-primary mb-1 uppercase tracking-tight">{t('Pro-Tip')}</p>
            <p className="text-xs text-on-primary-container leading-relaxed">
              {t('Generate monthly reports to track your business performance and identify trends.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
