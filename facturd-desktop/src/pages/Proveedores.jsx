import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { proveedoresService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Proveedores() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    rnc: '',
    email: '',
    telefono: '',
    direccion: '',
    productos_servicios: '',
    costo_promedio: '',
  });
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (user) {
      fetchProveedores();
    }
  }, [user]);

  const fetchProveedores = async () => {
    try {
      const res = await proveedoresService.getAll();
      setProveedores(res.data || []);
    } catch (error) {
      console.error('Error fetching proveedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (proveedor = null) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
      setFormData({
        nombre: proveedor.nombre || '',
        rnc: proveedor.rnc || '',
        email: proveedor.email || '',
        telefono: proveedor.telefono || '',
        direccion: proveedor.direccion || '',
        productos_servicios: proveedor.productos_servicios || '',
        costo_promedio: proveedor.costo_promedio?.toString() || '',
      });
    } else {
      setEditingProveedor(null);
      setFormData({ nombre: '', rnc: '', email: '', telefono: '', direccion: '', productos_servicios: '', costo_promedio: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProveedor) {
        await proveedoresService.update(editingProveedor.id, formData);
        addToast(t('Proveedor actualizado correctamente'), 'success');
      } else {
        await proveedoresService.create(formData);
        addToast(t('Proveedor creado correctamente'), 'success');
      }
      setShowModal(false);
      fetchProveedores();
    } catch (error) {
      console.error('Error saving proveedor:', error);
      addToast(error.response?.data?.detail || t('Error al guardar proveedor'), 'error');
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
      await proveedoresService.delete(confirmDelete.id);
      addToast(t('Proveedor eliminado correctamente'), 'success');
      fetchProveedores();
    } catch (error) {
      console.error('Error deleting proveedor:', error);
      addToast(error.response?.data?.detail || t('Error al eliminar proveedor'), 'error');
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
            {t('Providers')}
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            {t('Manage your vendor relationships and supplier information.')}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          {t('Add Provider')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">store</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Total Providers')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{proveedores.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Provider')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Tax ID')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Contact')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Phone')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Supplies')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                {t('Cost')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-center">
                {t('Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {proveedores.map((proveedor) => (
              <tr key={proveedor.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary font-bold">
                      {proveedor.nombre?.charAt(0) || 'P'}
                    </div>
                    <span className="font-medium text-on-surface">{proveedor.nombre}</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-on-surface-variant">
                  {proveedor.rnc || '-'}
                </td>
                <td className="px-8 py-4 text-on-surface-variant">
                  {proveedor.email || '-'}
                </td>
                <td className="px-8 py-4 text-on-surface-variant">
                  {proveedor.telefono || '-'}
                </td>
                <td className="px-8 py-4 text-on-surface-variant text-sm max-w-[200px] truncate">
                  {proveedor.productos_servicios || '-'}
                </td>
                <td className="px-8 py-4 text-right font-medium text-on-surface">
                  {proveedor.costo_promedio ? `$${(proveedor.costo_promedio).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => handleOpenModal(proveedor)}
                    className="text-on-surface-variant hover:text-primary p-2"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(proveedor.id)}
                    className="text-on-surface-variant hover:text-error p-2"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {proveedores.length === 0 && (
              <tr>
                <td colSpan="7" className="px-8 py-8 text-center text-on-surface-variant">
                  {t('No providers registered')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-8 w-full max-w-lg shadow-[0px_40px_80px_rgba(42,52,57,0.08)]">
            <h2 className="text-xl font-bold text-on-surface mb-6">
              {editingProveedor ? t('Edit Provider') : t('New Provider')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Provider Name')}</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Tax ID')}</label>
                  <input
                    type="text"
                    value={formData.rnc}
                    onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Phone')}</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
              </div>
              <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Address')}</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                />
              </div>
              <div className="col-span-2 relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Supplies')}</label>
                <textarea
                  value={formData.productos_servicios}
                  onChange={(e) => setFormData({ ...formData, productos_servicios: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors resize-none"
                  rows={2}
                  placeholder="Ej: Materiales de oficina, servicios de limpieza, etc."
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Cost')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costo_promedio}
                  onChange={(e) => setFormData({ ...formData, costo_promedio: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
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
                  {editingProveedor ? t('Update Provider') : t('Save Provider')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('Eliminar proveedor')}
        message={t('¿Está seguro de eliminar este proveedor?')}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
