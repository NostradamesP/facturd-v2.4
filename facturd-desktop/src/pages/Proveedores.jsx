import { useState, useEffect } from 'react';
import { proveedoresService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export default function Proveedores() {
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
  });
  const { addToast } = useToast();

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
      });
    } else {
      setEditingProveedor(null);
      setFormData({ nombre: '', rnc: '', email: '', telefono: '', direccion: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProveedor) {
        await proveedoresService.update(editingProveedor.id, formData);
        addToast('Proveedor actualizado correctamente', 'success');
      } else {
        await proveedoresService.create(formData);
        addToast('Proveedor creado correctamente', 'success');
      }
      setShowModal(false);
      fetchProveedores();
    } catch (error) {
      console.error('Error saving proveedor:', error);
      addToast(error.response?.data?.detail || 'Error al guardar proveedor', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Está seguro de eliminar este proveedor?')) {
      try {
        await proveedoresService.delete(id);
        addToast('Proveedor eliminado correctamente', 'success');
        fetchProveedores();
      } catch (error) {
        console.error('Error deleting proveedor:', error);
        addToast(error.response?.data?.detail || 'Error al eliminar proveedor', 'error');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
            Providers
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            Manage your vendor relationships and supplier information.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Add Provider
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">store</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">Total Providers</p>
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
                Provider
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Tax ID
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Contact
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Phone
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-center">
                Actions
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
                <td colSpan="5" className="px-8 py-8 text-center text-on-surface-variant">
                  No providers registered
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
              {editingProveedor ? 'Edit Provider' : 'New Provider'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">Provider Name</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">Tax ID</label>
                  <input
                    type="text"
                    value={formData.rnc}
                    onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">Address</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {editingProveedor ? 'Update Provider' : 'Save Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
