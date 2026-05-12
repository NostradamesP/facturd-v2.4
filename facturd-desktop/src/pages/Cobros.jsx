import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pagosService, facturasService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const statusValue = (estado) => String(estado || '').toUpperCase();

export default function Cobros() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pagos, setPagos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    factura_id: '',
    monto: '',
    metodo: 'EFECTIVO',
    fecha: new Date().toISOString().split('T')[0],
  });
   const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [pagosRes, facturasRes] = await Promise.all([
        pagosService.getAll(),
        facturasService.getAll(),
      ]);
      const facturasData = facturasRes.data || [];
      setPagos(pagosRes.data || []);
      setFacturas(facturasData);
      const facturaPendiente = localStorage.getItem('facturd_cobro_factura_id');
      if (facturaPendiente) {
        const factura = facturasData.find(f => f.id === facturaPendiente);
        setFormData(prev => ({
          ...prev,
          factura_id: facturaPendiente,
          monto: factura?.total ? String(factura.total) : prev.monto,
        }));
        setShowModal(true);
        localStorage.removeItem('facturd_cobro_factura_id');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await pagosService.create({
        ...formData,
        monto: parseFloat(formData.monto),
      });
      addToast(t('Pago registrado correctamente'), 'success');
      setShowModal(false);
      setFormData({ factura_id: '', monto: '', metodo: 'EFECTIVO', fecha: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      console.error('Error creating pago:', error);
      addToast(error.response?.data?.detail || t('Error al registrar pago'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCobrado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const pendingAmount = facturas
    .filter(f => statusValue(f.estado) === 'PENDIENTE')
    .reduce((sum, f) => sum + (f.total || 0), 0);

  if (loading) {
    return <div className="text-center py-10">{t('Cargando...')}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
            {t('Payments')}
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            {t('Track and manage customer payments and collections.')}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          {t('Record Payment')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-primary-dim rounded-xl p-8 shadow-xl shadow-primary/10">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">{t('Total Collected')}</p>
              <p className="text-white font-headline text-4xl font-bold">
                ${totalCobrado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">schedule</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Pending')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">
                ${pendingAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">verified</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Transactions')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{pagos.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Date')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Invoice')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Method')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                {t('Amount')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {pagos.map((pago) => (
              <tr key={pago.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-8 py-4 text-on-surface">
                  {pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-DO') : '-'}
                </td>
                <td className="px-8 py-4 font-medium text-on-surface">
                  {pago.factura_ncf || pago.factura_id?.slice(0, 8) || '-'}
                </td>
                <td className="px-8 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container capitalize">
                    {pago.metodo || 'efectivo'}
                  </span>
                </td>
                <td className="px-8 py-4 text-right font-bold text-on-surface">
                  ${(pago.monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan="4" className="px-8 py-8 text-center text-on-surface-variant">
                  {t('No payments recorded')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-8 w-full max-w-lg shadow-[0px_40px_80px_rgba(42,52,57,0.08)]">
            <h2 className="text-xl font-bold text-on-surface mb-6">{t('Record Payment')}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Invoice')}</label>
                <select
                  value={formData.factura_id}
                  onChange={(e) => setFormData({ ...formData, factura_id: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  required
                >
                  <option value="">{t('Select Invoice')}</option>
                  {facturas.filter(f => statusValue(f.estado) === 'PENDIENTE').map(f => (
                    <option key={f.id} value={f.id}>{f.ncf} - ${f.total}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Amount')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Method')}</label>
                  <select
                    value={formData.metodo}
                    onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  >
                    <option value="EFECTIVO">{t('Cash')}</option>
                    <option value="TRANSFERENCIA">{t('Transfer')}</option>
                    <option value="CHEQUE">{t('Check')}</option>
                    <option value="TARJETA">{t('Card')}</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? t('Guardando...') : t('Record Payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
