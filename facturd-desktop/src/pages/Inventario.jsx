import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { productosService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export default function Inventario() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    precio_unitario: '',
    stock: '',
    costo_unitario: '',
    itbis: '',
  });
  const { addToast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProductos();
    }
  }, [user]);

  const fetchProductos = async () => {
    try {
      const res = await productosService.getAll();
      setProductos(res.data || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (producto = null) => {
    if (producto) {
      setEditingProducto(producto);
      setFormData({
        nombre: producto.nombre || '',
        codigo: producto.codigo || '',
        descripcion: producto.descripcion || '',
        precio_unitario: producto.precio_unitario?.toString() || '',
        stock: producto.stock?.toString() || '',
        costo_unitario: producto.costo_unitario?.toString() || '',
        itbis: producto.itbis?.toString() || '',
      });
    } else {
      setEditingProducto(null);
      setFormData({ nombre: '', codigo: '', descripcion: '', precio_unitario: '', stock: '', costo_unitario: '', itbis: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        nombre: formData.nombre,
        codigo: formData.codigo,
        descripcion: formData.descripcion,
        precio_unitario: parseFloat(formData.precio_unitario) || 0,
        stock: parseInt(formData.stock) || 0,
        costo_unitario: parseFloat(formData.costo_unitario) || 0,
        itbis: parseFloat(formData.itbis) || 0,
      };
      if (editingProducto) {
        await productosService.update(editingProducto.id, data);
        addToast(t('Producto actualizado correctamente'), 'success');
      } else {
        await productosService.create(data);
        addToast(t('Producto creado correctamente'), 'success');
      }
      setShowModal(false);
      fetchProductos();
    } catch (error) {
      console.error('Error saving producto:', error);
      addToast(error.response?.data?.detail || t('Error al guardar producto'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm(t('¿Está seguro de eliminar este producto?'))) {
      try {
        await productosService.delete(id);
        addToast(t('Producto eliminado correctamente'), 'success');
        fetchProductos();
      } catch (error) {
        console.error('Error deleting producto:', error);
        addToast(error.response?.data?.detail || t('Error al eliminar producto'), 'error');
      }
    }
  };

  const totalValue = productos.reduce((sum, p) => sum + ((p.precio_unitario || 0) * (p.stock || 0)), 0);
  const lowStock = productos.filter(p => (p.stock || 0) < 10).length;

  if (loading) {
    return <div className="text-center py-10">{t('Cargando...')}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
            {t('Inventory')}
          </h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            {t('Track and manage your products and services catalog.')}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          {t('Add Product')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">inventory_2</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Total Products')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{productos.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">category</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Categories')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">-</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">check_circle</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('In Stock')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">
                {productos.filter(p => (p.stock || 0) > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-error">warning</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm">{t('Low Stock')}</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{lowStock}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('SKU')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Product')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Description')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                {t('Price')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                {t('Quantity')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-center">
                {t('Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {productos.map((producto) => (
              <tr key={producto.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-8 py-4 font-medium text-on-surface font-mono text-sm">
                  {producto.codigo || '-'}
                </td>
                <td className="px-8 py-4 font-medium text-on-surface">
                  {producto.nombre}
                </td>
                <td className="px-8 py-4 text-on-surface-variant">
                  {producto.descripcion || '-'}
                </td>
                <td className="px-8 py-4 text-right font-medium text-on-surface">
                  ${(producto.precio_unitario || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-8 py-4 text-right">
                  <span className={`font-medium ${(producto.stock || 0) < 10 ? 'text-error' : 'text-on-surface'}`}>
                    {producto.stock || 0}
                  </span>
                </td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => handleOpenModal(producto)}
                    className="text-on-surface-variant hover:text-primary p-2"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(producto.id)}
                    className="text-on-surface-variant hover:text-error p-2"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr>
                <td colSpan="6" className="px-8 py-8 text-center text-on-surface-variant">
                  {t('No products in inventory')}
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
              {editingProducto ? t('Edit Product') : t('New Product')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Product Name')}</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('SKU Code')}</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Price')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precio_unitario}
                    onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Stock')}</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Cost')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costo_unitario}
                    onChange={(e) => setFormData({ ...formData, costo_unitario: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Description')}</label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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
                  {editingProducto ? t('Update Product') : t('Save Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
