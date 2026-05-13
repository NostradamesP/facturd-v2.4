import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clientesService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Clientes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    rnc: '',
    email: '',
    telefono: '',
    direccion: '',
  });
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (user) {
      fetchClientes();
    }
  }, [user]);

  const fetchClientes = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await clientesService.getAll();
      setClientes(res.data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
      if (error.response?.status === 401) {
        addToast(t('Sesión expirada. Por favor inicie sesión nuevamente'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nombre: cliente.nombre || '',
        rnc: cliente.rnc || '',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
      });
    } else {
      setEditingCliente(null);
      setFormData({ nombre: '', rnc: '', email: '', telefono: '', direccion: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    console.log('Clientes: Submitting formData:', formData);
    try {
      if (editingCliente) {
        console.log('Clientes: Updating cliente', editingCliente.id);
        await clientesService.update(editingCliente.id, formData);
        addToast(t('Cliente actualizado correctamente'), 'success');
      } else {
        console.log('Clientes: Creating new cliente');
        await clientesService.create(formData);
        addToast(t('Cliente creado correctamente'), 'success');
      }
      setShowModal(false);
      fetchClientes();
    } catch (error) {
      console.error('Clientes: Error saving cliente:', error);
      addToast(error.response?.data?.detail || error.message || t('Error al guardar cliente'), 'error');
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
      await clientesService.delete(confirmDelete.id);
      addToast(t('Cliente eliminado correctamente'), 'success');
      fetchClientes();
    } catch (error) {
      console.error('Error deleting cliente:', error);
      addToast(error.response?.data?.detail || t('Error al eliminar cliente'), 'error');
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
              {t('Clients')}
            </h1>
            <p className="text-on-surface-variant max-w-2xl leading-relaxed">
              {t('Manage your client directory and contact information')}
            </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          {t('Add Client')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">group</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Total Clients')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{clientes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">verified</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('With Tax ID')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">
                {clientes.filter(c => c.rnc).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">email</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('With Email')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">
                {clientes.filter(c => c.email).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Client')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Tax ID')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Email')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Phone')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-center">
                {t('Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                      {cliente.nombre?.charAt(0) || 'C'}
                    </div>
                    <span className="font-medium text-on-surface">{cliente.nombre}</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-on-surface-variant font-mono">
                  {cliente.rnc || '-'}
                </td>
                <td className="px-8 py-4 text-on-surface-variant">
                  {cliente.email || '-'}
                </td>
                <td className="px-8 py-4 text-on-surface-variant">
                  {cliente.telefono || '-'}
                </td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => handleOpenModal(cliente)}
                    className="text-on-surface-variant hover:text-primary p-2"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(cliente.id)}
                    className="text-on-surface-variant hover:text-error p-2"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan="5" className="px-8 py-8 text-center text-on-surface-variant">
                  {t('No clients registered')}
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
              {editingCliente ? t('Edit Client') : t('New Client')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Client Name')}</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Tax ID (RNC)')}</label>
                  <input
                    type="text"
                    value={formData.rnc}
                    onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
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
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                />
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
                  {editingCliente ? t('Update Client') : t('Save Client')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('Eliminar cliente')}
        message={t('¿Está seguro de eliminar este cliente?')}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
