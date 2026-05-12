import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { gastosService, proveedoresService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

const CATEGORIAS = ['INSUMOS', 'SERVICIOS', 'LOGISTICA', 'NOMINA', 'MARKETING', 'OFICINA', 'OTROS'];

export default function Gastos() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);
  const [resumen, setResumen] = useState({ total_general: 0, total_mes: 0, cantidad: 0 });
  const [formData, setFormData] = useState({
    proveedor_id: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'OTROS',
    nota: '',
  });
   const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [gastosRes, proveedoresRes, resumenRes] = await Promise.all([
        gastosService.getAll(),
        proveedoresService.getAll(),
        gastosService.getResumen(),
      ]);
      setGastos(gastosRes.data || []);
      setProveedores(proveedoresRes.data || []);
      setResumen(resumenRes.data || { total_general: 0, total_mes: 0, cantidad: 0 });
    } catch (error) {
      console.error('Error fetching gastos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (gasto = null) => {
    if (gasto) {
      setEditingGasto(gasto);
      setFormData({
        proveedor_id: gasto.proveedor_id || '',
        monto: gasto.monto?.toString() || '',
        fecha: gasto.fecha ? gasto.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
        categoria: gasto.categoria || 'OTROS',
        nota: gasto.nota || '',
      });
    } else {
      setEditingGasto(null);
      setFormData({
        proveedor_id: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'OTROS',
        nota: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingGasto) {
        await gastosService.update(editingGasto.id, formData);
        addToast(t('Gasto actualizado correctamente'), 'success');
      } else {
        await gastosService.create(formData);
        addToast(t('Gasto creado correctamente'), 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving gasto:', error);
      addToast(error.response?.data?.detail || t('Error al guardar gasto'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmDelete({ id });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await gastosService.delete(confirmDelete.id);
      addToast(t('Gasto eliminado correctamente'), 'success');
      fetchData();
    } catch (error) {
      console.error('Error deleting gasto:', error);
      addToast(error.response?.data?.detail || t('Error al eliminar gasto'), 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return <div className="text-center py-10">{t('Cargando...')}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
            {t('Gastos')}
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            {t('Track and manage your business expenses.')}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          {t('Nuevo Gasto')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">receipt</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Total Gastos')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">
                ${resumen.total_general.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">calendar_month</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Gastos del Mes')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">
                ${resumen.total_mes.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">receipt_long</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Cantidad de Gastos')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{resumen.cantidad}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('Fecha')}</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('Proveedor')}</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('Monto')}</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('Categoría')}</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('Nota')}</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-center">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {gastos.map((gasto) => (
              <tr key={gasto.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-8 py-4 text-on-surface-variant">
                  {gasto.fecha ? new Date(gasto.fecha).toLocaleDateString('es-DO') : '-'}
                </td>
                <td className="px-8 py-4 font-medium text-on-surface">{gasto.proveedor_nombre || '-'}</td>
                <td className="px-8 py-4 font-medium text-on-surface">
                  ${(gasto.monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-8 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary-container text-primary">
                    {t(gasto.categoria)}
                  </span>
                </td>
                <td className="px-8 py-4 text-on-surface-variant text-sm max-w-[200px] truncate">
                  {gasto.nota || '-'}
                </td>
                <td className="px-8 py-4 text-center">
                  <button onClick={() => handleOpenModal(gasto)} className="text-on-surface-variant hover:text-primary p-2">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button onClick={() => handleDelete(gasto.id)} className="text-on-surface-variant hover:text-error p-2">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {gastos.length === 0 && (
              <tr>
                <td colSpan="6" className="px-8 py-8 text-center text-on-surface-variant">{t('No hay gastos')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-8 w-full max-w-lg shadow-[0px_40px_80px_rgba(42,52,57,0.08)]">
            <h2 className="text-xl font-bold text-on-surface mb-6">
              {editingGasto ? t('Editar Gasto') : t('Nuevo Gasto')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Proveedor')}</label>
                <select
                  value={formData.proveedor_id}
                  onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                >
                  <option value="">{t('Selecciona un proveedor')}</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Monto')}</label>
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
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Fecha')}</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Categoría')}</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>{t(cat)}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Nota')}</label>
                <textarea
                  value={formData.nota}
                  onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors resize-none"
                  rows={2}
                />
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
                  className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {editingGasto ? t('Editar Gasto') : t('Nuevo Gasto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('Eliminar gasto')}
        message={t('¿Está seguro de eliminar este gasto?')}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
