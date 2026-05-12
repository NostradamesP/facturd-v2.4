import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { facturasService, clientesService, productosService, plantillasService, dgiiService, pdfService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import FacturaPreview from '../components/factura/FacturaPreview';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_FILTERS = [
  { value: 'all', key: 'All' },
  { value: 'PAGADA', key: 'Pagada' },
  { value: 'PENDIENTE', key: 'Pendiente' },
  { value: 'ENVIADA_DGII', key: 'DGII' },
  { value: 'ANULADA', key: 'Anulada' },
];

const emptyDetalle = () => ({
  tipo: 'producto',
  producto_id: '',
  descripcion: '',
  cantidad: 1,
  precio_unitario: 0,
  aplica_itbis: true,
  itbis: 0,
  total: 0,
});

const emptyClienteRapido = () => ({
  nombre: '',
  rnc: '',
  telefono: '',
  email: '',
  direccion: '',
});

const statusValue = (estado) => String(estado || '').toUpperCase();

const formatMoney = (value) =>
  `RD$ ${(value || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

export default function Facturas() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingFactura, setEditingFactura] = useState(null);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [filter, setFilter] = useState('all');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [clienteManual, setClienteManual] = useState(false);
  const [clienteRapido, setClienteRapido] = useState(emptyClienteRapido());
  const [clienteRapidoDone, setClienteRapidoDone] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [dgiiLoading, setDgiiLoading] = useState(false);
  const [dgiiRegistro, setDgiiRegistro] = useState(null);
  const location = useLocation();
  const { addToast } = useToast();
  const [confirmAction, setConfirmAction] = useState(null);
  const cancelled = useRef(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo_ncf: 'E41',
    fecha: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    nota: '',
    descuento: 0,
    detalles: [emptyDetalle()],
  });

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
    return () => {
      cancelled.current = true;
    };
  }, [user]);

  const autoOpenRef = useRef(false);
  useEffect(() => {
    if (!loading && !autoOpenRef.current && location.state?.openFacturaId) {
      const factura = facturas.find(f => f.id === location.state.openFacturaId);
      if (factura) {
        autoOpenRef.current = true;
        handleViewFactura(factura);
      }
    }
  }, [loading]);

  const fetchData = async () => {
    try {
      const [facturasRes, clientesRes, productosRes] = await Promise.all([
        facturasService.getAll(),
        clientesService.getAll(),
        productosService.getAll(),
      ]);
      if (cancelled.current) return;
      setFacturas(facturasRes.data || []);
      setClientes(clientesRes.data || []);
      setProductos(productosRes.data || []);
    } catch (error) {
      if (cancelled.current) return;
      console.error('Facturas ERROR:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        addToast(t('Sesión expirada. Por favor inicie sesión nuevamente'), 'error');
      }
    }

    try {
      const plantillasRes = await plantillasService.getAll();
      if (cancelled.current) return;
      setSavedTemplates(plantillasRes.data || []);
    } catch (error) {
      if (cancelled.current) return;
      console.warn('No se pudieron cargar las plantillas personalizadas:', error.response?.data || error.message);
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  };

  const filteredFacturas = useMemo(() => facturas.filter(f => {
    if (filter === 'all') return true;
    return statusValue(f.estado) === filter;
  }), [facturas, filter]);

  const filteredClientes = useMemo(() => clientes.filter(c => {
    const search = clienteSearch.trim().toLowerCase();
    if (!search) return true;
    return (
      c.nombre?.toLowerCase().includes(search) ||
      c.rnc?.toLowerCase().includes(search)
    );
  }), [clientes, clienteSearch]);

  const selectedCliente = clientes.find(c => c.id === formData.cliente_id);
  const invoiceBodyLocked = editingFactura && ['PAGADA', 'ANULADA', 'ENVIADA_DGII'].includes(statusValue(editingFactura.estado));
  const selectedDetailCliente = selectedFactura
    ? clientes.find(c => c.id === selectedFactura.cliente_id) || { nombre: selectedFactura.cliente_nombre }
    : null;
  const detalleNombre = (detalle) => {
    const producto = productos.find(p => p.id === detalle.producto_id);
    return (detalle.descripcion || producto?.nombre || '').trim();
  };
  const detallesConNombre = formData.detalles.filter(d => detalleNombre(d));

  const getStatusBadge = (estado) => {
    const normalized = statusValue(estado);
    const styles = {
      PAGADA: 'bg-primary-container text-on-primary-container',
      PENDIENTE: 'bg-secondary-container text-on-secondary-container',
      ANULADA: 'bg-error-container text-on-error-container',
      VENCIDA: 'bg-error-container text-on-error-container',
      ENVIADA_DGII: 'bg-tertiary-container text-on-tertiary-container',
    };
    return styles[normalized] || styles.PENDIENTE;
  };

  const handleOpenModal = async (factura = null) => {
    if (factura) {
      const facturaCompleta = factura.detalles ? factura : (await facturasService.getById(factura.id)).data;
      const detalles = facturaCompleta.detalles?.length ? facturaCompleta.detalles : [emptyDetalle()];
      const subtotal = detalles.reduce((sum, d) => sum + ((d.precio_unitario || 0) * (d.cantidad || 0)), 0);
      const descuentoPorcentaje = subtotal ? ((facturaCompleta.descuento || 0) / subtotal) * 100 : 0;
      setEditingFactura(facturaCompleta);
      setFormData({
        cliente_id: facturaCompleta.cliente_id || '',
        tipo_ncf: facturaCompleta.tipo_ncf || 'E41',
        fecha: facturaCompleta.fecha ? new Date(facturaCompleta.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        fecha_vencimiento: facturaCompleta.fecha_vencimiento ? new Date(facturaCompleta.fecha_vencimiento).toISOString().split('T')[0] : '',
        nota: facturaCompleta.nota || '',
        descuento: Number(descuentoPorcentaje.toFixed(2)),
        estado: statusValue(facturaCompleta.estado) || 'PENDIENTE',
        detalles: detalles.map(d => ({
          ...d,
          tipo: d.producto_id ? 'producto' : 'manual',
          aplica_itbis: (d.itbis || 0) > 0,
        })),
      });
      const cliente = clientes.find(c => c.id === facturaCompleta.cliente_id);
      setClienteSearch(cliente?.nombre || '');
      setClienteManual(false);
      setClienteRapido(emptyClienteRapido());
      setClienteRapidoDone(false);
      try {
        const settings = facturaCompleta.visual_settings ? JSON.parse(facturaCompleta.visual_settings) : null;
        if (settings?.template) setSelectedTemplate(settings.template);
      } catch {
        setSelectedTemplate('classic');
      }
    } else {
      setEditingFactura(null);
      setFormData({
        cliente_id: '',
        tipo_ncf: 'E41',
        fecha: new Date().toISOString().split('T')[0],
        fecha_vencimiento: '',
        nota: '',
        descuento: 0,
        detalles: [emptyDetalle()],
      });
      setClienteSearch('');
      setClienteManual(false);
      setClienteRapido(emptyClienteRapido());
      setClienteRapidoDone(false);
      setShowClienteDropdown(false);
    }
    setShowModal(true);
    setShowPreview(false);
  };

  const handleViewFactura = async (factura) => {
    try {
      const facturaCompleta = factura.detalles ? factura : (await facturasService.getById(factura.id)).data;
      setSelectedFactura(facturaCompleta);
      setDgiiRegistro(null);
      handleLoadDgiiRegistro(facturaCompleta.id);
      try {
        const settings = facturaCompleta.visual_settings ? JSON.parse(facturaCompleta.visual_settings) : null;
        if (settings?.template) setSelectedTemplate(settings.template);
      } catch {
        setSelectedTemplate('classic');
      }
      setShowDetail(true);
    } catch (error) {
      console.error('Error opening factura:', error);
      addToast(error.response?.data?.detail || t('No se pudo abrir la factura'), 'error');
    }
  };

  const handleCobrarFactura = (factura) => {
    if (factura?.id) {
      localStorage.setItem('facturd_cobro_factura_id', factura.id);
    }
    setShowDetail(false);
    navigate('/cobros');
  };

  const handleClienteRapidoDone = async () => {
    if (!clienteRapido.nombre.trim()) {
      addToast(t('Escribe el nombre del cliente'), 'error');
      return;
    }
    try {
      const nuevoCliente = {
        nombre: clienteRapido.nombre.trim(),
        rnc: clienteRapido.rnc.trim() || `CF-${Date.now()}`,
        tipo: 'PERSONA_FISICA',
        telefono: clienteRapido.telefono.trim() || null,
        email: clienteRapido.email.trim() || null,
        direccion: clienteRapido.direccion.trim() || null,
        limite_credito: 0,
      };
      const clienteRes = await clientesService.create(nuevoCliente);
      setClientes(prev => [...prev, clienteRes.data]);
      setFormData(prev => ({ ...prev, cliente_id: clienteRes.data.id }));
      setClienteSearch(clienteRes.data.nombre);
      setClienteManual(false);
      setClienteRapido(emptyClienteRapido());
      setClienteRapidoDone(true);
      setShowClienteDropdown(false);
      addToast(t('Cliente guardado y seleccionado'), 'success');
    } catch (error) {
      console.error('Error creating quick cliente:', error);
      addToast(error.response?.data?.detail || t('No se pudo guardar el cliente'), 'error');
    }
  };

  const handleClienteRapidoKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleClienteRapidoDone();
    }
  };

  const handleEditFromDetail = () => {
    if (!selectedFactura) return;
    setShowDetail(false);
    handleOpenModal(selectedFactura);
  };

  const handleDuplicateFactura = async (factura = selectedFactura) => {
    if (!factura) return;
    try {
      const facturaCompleta = factura.detalles ? factura : (await facturasService.getById(factura.id)).data;
      const detalles = facturaCompleta.detalles?.length ? facturaCompleta.detalles : [emptyDetalle()];
      const subtotal = detalles.reduce((sum, d) => sum + ((d.precio_unitario || 0) * (d.cantidad || 0)), 0);
      const descuentoPorcentaje = subtotal ? ((facturaCompleta.descuento || 0) / subtotal) * 100 : 0;
      setEditingFactura(null);
      setSelectedFactura(null);
      setShowDetail(false);
      setFormData({
        cliente_id: facturaCompleta.cliente_id || '',
        tipo_ncf: facturaCompleta.tipo_ncf || 'E41',
        fecha: new Date().toISOString().split('T')[0],
        fecha_vencimiento: '',
        nota: facturaCompleta.nota || '',
        descuento: Number(descuentoPorcentaje.toFixed(2)),
        detalles: detalles.map(d => ({
          producto_id: d.producto_id || '',
          tipo: d.producto_id ? 'producto' : 'manual',
          descripcion: d.descripcion || '',
          cantidad: d.cantidad || 1,
          precio_unitario: d.precio_unitario || 0,
          aplica_itbis: (d.itbis || 0) > 0,
          itbis: d.itbis || 0,
          total: d.total || 0,
        })),
      });
      const cliente = clientes.find(c => c.id === facturaCompleta.cliente_id);
      setClienteSearch(cliente?.nombre || facturaCompleta.cliente_nombre || '');
      setShowModal(true);
      setShowPreview(false);
      addToast(t('Factura duplicada como borrador nuevo'), 'success');
    } catch (error) {
      console.error('Error duplicating factura:', error);
      addToast(error.response?.data?.detail || t('No se pudo duplicar la factura'), 'error');
    }
  };

  const handleAnularFactura = (factura = selectedFactura) => {
    if (!factura) return;
    setConfirmAction({ type: 'anular', factura });
  };

  const handleAnularConfirm = async (factura) => {
    try {
      await facturasService.update(factura.id, { estado: 'ANULADA' });
      addToast(t('Factura anulada correctamente'), 'success');
      setShowDetail(false);
      setSelectedFactura(null);
      fetchData();
    } catch (error) {
      console.error('Error anulando factura:', error);
      addToast(error.response?.data?.detail || t('No se pudo anular la factura'), 'error');
    }
  };

  const handleEnviarDGII = (factura = selectedFactura) => {
    if (!factura || !factura.id) return;
    if (!factura.ncf) {
      addToast(t('La factura debe tener un NCF asignado antes de enviarse a la DGII'), 'error');
      return;
    }
    setConfirmAction({ type: 'dgii', factura });
  };

  const handleEnviarDGIIConfirm = async (factura) => {
    setDgiiLoading(true);
    try {
      const res = await dgiiService.enviar(factura.id);
      setDgiiRegistro(res.data?.registro_dgii || null);
      addToast(t('Factura enviada a DGII exitosamente') + ` (Track ID: ${res.data?.registro_dgii?.track_id || 'N/A'})`, 'success');
      setShowDetail(false);
      setSelectedFactura(null);
      fetchData();
    } catch (error) {
      console.error('Error enviando a DGII:', error);
      addToast(error.response?.data?.detail || t('Error al enviar factura a la DGII'), 'error');
    } finally {
      setDgiiLoading(false);
    }
  };

  const handleConsultarDGII = async (factura = selectedFactura) => {
    if (!factura || !factura.id) return;
    try {
      const res = await dgiiService.consultar(factura.id);
      const estado = res.data?.estado_dgii || 'DESCONOCIDO';
      addToast(t('Estado DGII') + `: ${estado}`, estado === 'ACEPTADO' ? 'success' : 'warning');
      setDgiiRegistro(res.data);
      fetchData();
    } catch (error) {
      console.error('Error consultando DGII:', error);
      addToast(error.response?.data?.detail || t('Error al consultar DGII'), 'error');
    }
  };

  const handleLoadDgiiRegistro = async (facturaId) => {
    try {
      const res = await dgiiService.getRegistro(facturaId);
      setDgiiRegistro(res.data);
    } catch {
      setDgiiRegistro(null);
    }
  };

  const handleAddDetalle = () => {
    setFormData({
      ...formData,
      detalles: [...formData.detalles, emptyDetalle()],
    });
  };

  const handleAddServicioManual = () => {
    setFormData({
      ...formData,
      detalles: [
        ...formData.detalles,
        {
          ...emptyDetalle(),
          tipo: 'manual',
          descripcion: '',
        },
      ],
    });
  };

  const handleDetalleChange = (index, field, value) => {
    const newDetalles = [...formData.detalles];
    newDetalles[index] = { ...newDetalles[index], [field]: value };
    const current = newDetalles[index];
    
    if (field === 'producto_id' && value) {
      const producto = productos.find(p => p.id === value);
      if (producto) {
        current.tipo = 'producto';
        current.descripcion = producto.nombre;
        current.precio_unitario = producto.precio_unitario || 0;
        current.aplica_itbis = producto.aplica_itbis !== false;
      }
    }

    if (field === 'producto_id' && !value) {
      current.tipo = 'manual';
      current.descripcion = '';
      current.precio_unitario = 0;
      current.aplica_itbis = true;
    }
    
    const producto = productos.find(p => p.id === current.producto_id);
    const precio = parseFloat(current.precio_unitario) || 0;
    const cant = parseFloat(current.cantidad) || 0;
    const base = precio * cant;
    current.itbis = current.aplica_itbis === false ? 0 : base * 0.18;
    current.total = base + current.itbis;
    
    setFormData({ ...formData, detalles: newDetalles });
  };

  const handleRemoveDetalle = (index) => {
    const newDetalles = formData.detalles.filter((_, i) => i !== index);
    setFormData({ ...formData, detalles: newDetalles });
  };

  const saveFactura = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        addToast(t('Sesión expirada. Por favor inicia sesión nuevamente'), 'error');
        return;
      }

      let clienteId = formData.cliente_id;
      if (!clienteId) {
        const nombreCliente = (clienteManual ? clienteRapido.nombre : clienteSearch).trim();
        if (!nombreCliente) {
          addToast(t('Selecciona un cliente o escribe uno nuevo'), 'error');
          return;
        }
        const nuevoCliente = {
          nombre: nombreCliente,
          rnc: clienteRapido.rnc.trim() || `CF-${Date.now()}`,
          tipo: 'PERSONA_FISICA',
          telefono: clienteRapido.telefono.trim() || null,
          email: clienteRapido.email.trim() || null,
          direccion: clienteRapido.direccion.trim() || null,
          limite_credito: 0,
        };
        const clienteRes = await clientesService.create(nuevoCliente);
        clienteId = clienteRes.data.id;
        setClientes(prev => [...prev, clienteRes.data]);
      }

      const detallesValidos = formData.detalles.filter(d =>
        (d.producto_id || d.descripcion?.trim()) &&
        (parseFloat(d.cantidad) || 0) > 0
      );

      if (!detallesValidos.length) {
        addToast(t('Agrega al menos un producto o servicio'), 'error');
        return;
      }

      const subtotal = calcularSubtotal();
      const descuentoMonto = subtotal * ((parseFloat(formData.descuento) || 0) / 100);
      
      const dataToSend = {
        ...formData,
        cliente_id: clienteId,
        descuento: descuentoMonto,
        descuento_porcentaje: parseFloat(formData.descuento) || 0,
        visual_settings: JSON.stringify({ template: selectedTemplate }),
        detalles: detallesValidos.map(d => ({
          producto_id: d.tipo === 'manual' ? '' : d.producto_id,
          descripcion: d.descripcion,
          cantidad: parseFloat(d.cantidad) || 1,
          precio_unitario: parseFloat(d.precio_unitario) || 0,
          itbis: d.aplica_itbis === false ? 0 : parseFloat(d.itbis) || 0,
          total: d.aplica_itbis === false
            ? (parseFloat(d.precio_unitario) || 0) * (parseFloat(d.cantidad) || 1)
            : parseFloat(d.total) || 0,
        }))
      };
      
      if (editingFactura) {
        const updatePayload = invoiceBodyLocked
          ? {
              estado: formData.estado,
              nota: formData.nota,
              visual_settings: JSON.stringify({ template: selectedTemplate }),
            }
          : dataToSend;
        await facturasService.update(editingFactura.id, updatePayload);
        addToast(t('Factura actualizada correctamente'), 'success');
      } else {
        await facturasService.create(dataToSend);
        addToast(t('Factura creada correctamente'), 'success');
      }
      setShowModal(false);
      setClienteManual(false);
      setClienteRapido(emptyClienteRapido());
      setClienteRapidoDone(false);
      fetchData();
    } catch (error) {
      console.error('Error saving factura:', error);
      const errorMsg = error.response?.data?.detail || error.message || t('Error al guardar factura');
      addToast(errorMsg, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveFactura();
  };

  const handleDelete = (id) => {
    setConfirmAction({ type: 'delete', id });
  };

  const handleDeleteConfirm = async (id) => {
    try {
      await facturasService.delete(id);
      addToast(t('Factura eliminada correctamente'), 'success');
      if (selectedFactura?.id === id) {
        setShowDetail(false);
        setSelectedFactura(null);
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting factura:', error);
      addToast(error.response?.data?.detail || t('Error al eliminar factura'), 'error');
    }
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    const { type, factura, id } = confirmAction;
    try {
      if (type === 'delete') await handleDeleteConfirm(id);
      else if (type === 'anular') await handleAnularConfirm(factura);
      else if (type === 'dgii') await handleEnviarDGIIConfirm(factura);
    } finally {
      setConfirmAction(null);
    }
  };

  const calcularSubtotal = () => {
    return formData.detalles.reduce((sum, d) => sum + ((d.precio_unitario || 0) * (d.cantidad || 0)), 0);
  };

  const calcularItbis = () => {
    return formData.detalles.reduce((sum, d) => sum + (d.itbis || 0), 0);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const itbis = calcularItbis();
    const descuento = subtotal * (formData.descuento / 100);
    return subtotal + itbis - descuento;
  };

  if (loading) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  return (
    <>
    <div className="space-y-8 no-print">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight mb-2">
            {t('Facturas')}
          </h1>
          <p className="text-on-surface-variant font-medium">
            {t('Abre, revisa y modifica facturas existentes')}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-dim text-on-primary font-semibold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          {t('+ Nueva Factura')}
        </button>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary text-white'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {t(f.key)}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Facturas')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Clientes')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('Fecha')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                {t('Total')}
              </th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-center">
                {t('Estado')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {filteredFacturas.map((factura) => (
              <tr key={factura.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleViewFactura(factura)}
                      className="font-medium text-on-surface font-mono hover:text-primary transition-colors text-left"
                      title="Abrir factura"
                    >
                      {factura.ncf || 'N/A'}
                    </button>
                    <div className="flex items-center gap-1 opacity-70">
                      <button
                        type="button"
                        onClick={() => handleViewFactura(factura)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-container-high hover:text-primary transition-colors"
                        title="Ver"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(factura)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-container-high hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateFactura(factura)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-container-high hover:text-primary transition-colors"
                        title="Duplicar"
                      >
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCobrarFactura(factura)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-container-high hover:text-primary transition-colors"
                        title="Cobrar"
                      >
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 text-on-surface">
                  {factura.cliente_nombre || 'Client'}
                </td>
                <td className="px-8 py-4 text-on-surface-variant">
                  {factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-DO') : '-'}
                </td>
                <td className="px-8 py-4 text-right font-bold text-on-surface">
                  {formatMoney(factura.total)}
                </td>
                <td className="px-8 py-4 text-center">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(factura.estado)}`}>
                    {statusValue(factura.estado) || 'PENDIENTE'}
                  </span>
                </td>
              </tr>
            ))}
            {filteredFacturas.length === 0 && (
              <tr>
                <td colSpan="5" className="px-8 py-8 text-center text-on-surface-variant">
                  {t('No hay facturas')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      {showDetail && selectedFactura && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 overflow-y-auto p-6">
          <div className="w-full max-w-6xl bg-surface rounded-xl shadow-2xl my-6 overflow-hidden">
            <div className="px-8 py-6 border-b border-outline-variant/10 flex items-start justify-between gap-6 no-print">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">
                    {selectedFactura.ncf || 'Factura sin NCF'}
                  </h2>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(selectedFactura.estado)}`}>
                    {statusValue(selectedFactura.estado) || 'PENDIENTE'}
                  </span>
                </div>
                <p className="text-on-surface-variant">
                  {selectedFactura.cliente_nombre || selectedDetailCliente?.nombre || 'Cliente'} · {selectedFactura.fecha ? new Date(selectedFactura.fecha).toLocaleDateString('es-DO') : '-'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleEditFromDetail} className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high" title="Editar">
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button onClick={() => handleDuplicateFactura()} className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high" title="Duplicar">
                  <span className="material-symbols-outlined">content_copy</span>
                </button>
                <button onClick={() => handleCobrarFactura(selectedFactura)} className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high" title="Cobrar">
                  <span className="material-symbols-outlined">payments</span>
                </button>
                {selectedFactura.estado !== 'ENVIADA_DGII' && selectedFactura.estado !== 'ANULADA' && selectedFactura.ncf && (
                  <button
                    onClick={() => handleEnviarDGII()}
                    disabled={dgiiLoading}
                    className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary-container disabled:opacity-40"
                    title="Enviar a DGII"
                  >
                    <span className="material-symbols-outlined">{dgiiLoading ? 'hourglass_top' : 'send'}</span>
                  </button>
                )}
                {selectedFactura.estado === 'ENVIADA_DGII' && (
                  <button
                    onClick={() => handleConsultarDGII()}
                    className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container hover:bg-tertiary-container hover:text-on-tertiary-container"
                    title="Consultar estado DGII"
                  >
                    <span className="material-symbols-outlined">sync</span>
                  </button>
                )}
                <button onClick={() => window.print()} className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high" title="Imprimir">
                  <span className="material-symbols-outlined">print</span>
                </button>
                <button onClick={() => handleAnularFactura()} className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container hover:bg-error-container hover:text-on-error-container" title="Anular">
                  <span className="material-symbols-outlined">block</span>
                </button>
                <button onClick={() => handleDelete(selectedFactura.id)} className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container hover:bg-error-container hover:text-on-error-container" title="Eliminar">
                  <span className="material-symbols-outlined">delete</span>
                </button>
                <button onClick={() => setShowDetail(false)} className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface-container-highest hover:bg-surface-variant" title="Cerrar">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8 p-8">
              <div className="col-span-8 print-area">
                <FacturaPreview
                  formData={{
                    ...selectedFactura,
                    detalles: selectedFactura.detalles || [],
                    descuento: selectedFactura.subtotal ? ((selectedFactura.descuento || 0) / selectedFactura.subtotal) * 100 : 0,
                  }}
                  cliente={selectedDetailCliente}
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={setSelectedTemplate}
                />
              </div>
              <aside className="col-span-4 space-y-4 no-print">
                <div className="bg-surface-container rounded-xl p-6">
                  <h3 className="font-headline text-lg font-bold mb-4 text-on-surface">Resumen</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span className="font-mono">{formatMoney(selectedFactura.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-on-surface-variant">ITBIS</span><span className="font-mono">{formatMoney(selectedFactura.itbis)}</span></div>
                    <div className="flex justify-between"><span className="text-on-surface-variant">Descuento</span><span className="font-mono">-{formatMoney(selectedFactura.descuento)}</span></div>
                    <div className="flex justify-between pt-3 border-t border-outline-variant/20 text-lg font-bold"><span>Total</span><span className="font-mono text-primary">{formatMoney(selectedFactura.total)}</span></div>
                  </div>
                </div>
                {selectedFactura.estado === 'ENVIADA_DGII' && (
                  <div className="bg-tertiary-container/10 border border-tertiary-container/30 rounded-xl p-6">
                    <h3 className="font-headline text-lg font-bold mb-4 text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary">verified</span>
                      DGII
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Estado DGII</span>
                        <span className={`font-bold ${dgiiRegistro?.estado === 'ACEPTADO' ? 'text-green-600' : dgiiRegistro?.estado === 'RECHAZADO' ? 'text-red-600' : 'text-tertiary'}`}>
                          {dgiiRegistro?.estado || 'PENDIENTE'}
                        </span>
                      </div>
                      {dgiiRegistro?.track_id && (
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Track ID</span>
                          <span className="font-mono text-xs font-bold">{dgiiRegistro.track_id}</span>
                        </div>
                      )}
                      {dgiiRegistro?.enviado_at && (
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Enviado</span>
                          <span className="font-mono text-xs">{new Date(dgiiRegistro.enviado_at).toLocaleString('es-DO')}</span>
                        </div>
                      )}
                      {dgiiRegistro?.respondido_at && (
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Respuesta</span>
                          <span className="font-mono text-xs">{new Date(dgiiRegistro.respondido_at).toLocaleString('es-DO')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-6">
                  <h3 className="font-headline text-lg font-bold mb-4 text-on-surface">Renglones</h3>
                  <div className="space-y-3">
                    {(selectedFactura.detalles || []).map((detalle) => (
                      <div key={detalle.id || `${detalle.descripcion}-${detalle.total}`} className="flex justify-between gap-4 text-sm">
                        <div>
                          <p className="font-medium text-on-surface">{detalle.descripcion || 'Detalle'}</p>
                          <p className="text-xs text-on-surface-variant">{detalle.cantidad} x {formatMoney(detalle.precio_unitario)}</p>
                        </div>
                        <span className="font-mono font-bold">{formatMoney(detalle.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedFactura.nota && (
                  <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-6">
                    <h3 className="font-headline text-lg font-bold mb-2 text-on-surface">Notas</h3>
                    <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{selectedFactura.nota}</p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-surface flex items-start justify-center z-50 overflow-y-auto">
          <div className="w-full max-w-7xl p-10">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight mb-2">
                  {editingFactura ? 'Editar Factura' : 'Nueva Factura'}
                </h2>
                <p className="text-on-surface-variant font-medium">
                  {editingFactura ? `Factura #${editingFactura.ncf || 'INV'}` : 'Borrador nuevo'}
                </p>
              </div>
              <div className="flex gap-4">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="px-4 py-2.5 rounded-lg bg-surface-container text-on-surface font-semibold text-sm border border-outline-variant/20"
                >
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="bold">Bold</option>
                  {savedTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-6 py-2.5 rounded-lg bg-surface-container text-on-surface font-semibold text-sm transition-all hover:bg-surface-container-high flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">{showPreview ? 'edit' : 'visibility'}</span>
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-lg bg-surface-container-highest text-on-surface font-semibold text-sm transition-all hover:bg-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveFactura}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-dim text-on-primary font-semibold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Guardar Factura
                </button>
              </div>
            </div>

            {showPreview ? (
              <FacturaPreview 
                formData={formData} 
                cliente={selectedCliente}
                selectedTemplate={selectedTemplate}
                onTemplateChange={setSelectedTemplate}
              />
            ) : (
              <form id="factura-form" onSubmit={handleSubmit} className="grid grid-cols-12 gap-8">
                <div className="col-span-8 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
                  <h3 className="font-headline text-lg font-bold mb-8 text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">person</span>
                    Cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-5">
                        <button
                          type="button"
                          disabled={invoiceBodyLocked}
                          onClick={() => {
                            setClienteManual(false);
                            setClienteRapido(emptyClienteRapido());
                            setClienteRapidoDone(false);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            !clienteManual ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          Cliente existente
                        </button>
                        <button
                          type="button"
                          disabled={invoiceBodyLocked}
                          onClick={() => {
                            setClienteManual(true);
                            setFormData({ ...formData, cliente_id: '' });
                            setClienteSearch('');
                            setClienteRapidoDone(false);
                            setShowClienteDropdown(false);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            clienteManual ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          Cliente nuevo
                        </button>
                      </div>

                      {!clienteManual ? (
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                            Buscar o seleccionar cliente
                          </label>
                          <div className="relative">
                            <input
                              className="w-full bg-transparent border-b border-outline-variant/30 py-3 text-on-surface placeholder:text-outline focus:border-primary transition-all"
                              placeholder="Escribe el nombre, RNC o cedula..."
                              type="text"
                              value={clienteSearch}
                              disabled={invoiceBodyLocked}
                              onChange={(e) => {
                                setClienteSearch(e.target.value);
                                setFormData({ ...formData, cliente_id: '' });
                                setShowClienteDropdown(true);
                              }}
                              onFocus={() => setShowClienteDropdown(true)}
                            />
                            <span className="material-symbols-outlined absolute right-0 top-3 text-on-surface-variant cursor-pointer"
                              onClick={() => setShowClienteDropdown(!showClienteDropdown)}>
                              {showClienteDropdown ? 'expand_less' : 'expand_more'}
                            </span>
                            {showClienteDropdown && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-outline-variant/30 rounded-lg mt-1 max-h-56 overflow-y-auto z-10 shadow-lg">
                                {filteredClientes.length > 0 ? (
                                  filteredClientes.map(c => (
                                    <div
                                      key={c.id}
                                      className="px-4 py-3 hover:bg-surface-container-low cursor-pointer"
                                      onClick={() => {
                                        setFormData({ ...formData, cliente_id: c.id });
                                        setClienteSearch(c.nombre);
                                        setShowClienteDropdown(false);
                                      }}
                                    >
                                      <div className="font-medium text-on-surface">{c.nombre}</div>
                                      <div className="text-xs text-on-surface-variant">{c.rnc}</div>
                                    </div>
                                  ))
                                ) : (
                                  <button
                                    type="button"
                                    className="w-full px-4 py-3 text-left text-primary font-semibold hover:bg-surface-container-low"
                                    onClick={() => {
                                      setClienteManual(true);
                                      setClienteRapido({ ...emptyClienteRapido(), nombre: clienteSearch });
                                      setClienteRapidoDone(false);
                                      setFormData({ ...formData, cliente_id: '' });
                                      setShowClienteDropdown(false);
                                    }}
                                  >
                                    Crear cliente "{clienteSearch || 'nuevo'}"
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-8 gap-y-5 bg-surface-container-low rounded-xl p-5">
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                              Nombre del cliente
                            </label>
                            <input
                              className="w-full bg-transparent border-b border-outline-variant/30 py-2 text-on-surface focus:border-primary transition-all"
                              value={clienteRapido.nombre}
                              onChange={(e) => {
                                setClienteRapido({ ...clienteRapido, nombre: e.target.value });
                                setClienteRapidoDone(false);
                              }}
                              onKeyDown={handleClienteRapidoKeyDown}
                              placeholder="Consumidor final, Juan Perez, Empresa XYZ..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                              RNC o cedula
                            </label>
                            <input
                              className="w-full bg-transparent border-b border-outline-variant/30 py-2 text-on-surface focus:border-primary transition-all"
                              value={clienteRapido.rnc}
                              onChange={(e) => {
                                setClienteRapido({ ...clienteRapido, rnc: e.target.value });
                                setClienteRapidoDone(false);
                              }}
                              onKeyDown={handleClienteRapidoKeyDown}
                              placeholder="Opcional"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                              Telefono
                            </label>
                            <input
                              className="w-full bg-transparent border-b border-outline-variant/30 py-2 text-on-surface focus:border-primary transition-all"
                              value={clienteRapido.telefono}
                              onChange={(e) => {
                                setClienteRapido({ ...clienteRapido, telefono: e.target.value });
                                setClienteRapidoDone(false);
                              }}
                              onKeyDown={handleClienteRapidoKeyDown}
                              placeholder="Opcional"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                              Email
                            </label>
                            <input
                              className="w-full bg-transparent border-b border-outline-variant/30 py-2 text-on-surface focus:border-primary transition-all"
                              value={clienteRapido.email}
                              onChange={(e) => {
                                setClienteRapido({ ...clienteRapido, email: e.target.value });
                                setClienteRapidoDone(false);
                              }}
                              onKeyDown={handleClienteRapidoKeyDown}
                              placeholder="Opcional"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between pt-1">
                            <p className="text-xs text-on-surface-variant">
                              {clienteRapidoDone ? t('Cliente guardado en Clientes.') : t('Presiona Enter o Listo para guardarlo en Clientes.')}
                            </p>
                            <button
                              type="button"
                              onClick={handleClienteRapidoDone}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:opacity-90"
                            >
                              <span className="material-symbols-outlined text-base">done</span>
                              {t('Listo')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                        Invoice Date
                      </label>
                      <input
                        className="w-full bg-transparent border-b border-outline-variant/30 py-3 text-on-surface focus:border-primary transition-all"
                        type="date"
                        value={formData.fecha}
                        disabled={invoiceBodyLocked}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                        Due Date
                      </label>
                      <input
                        className="w-full bg-transparent border-b border-outline-variant/30 py-3 text-on-surface focus:border-primary transition-all"
                        type="date"
                        value={formData.fecha_vencimiento}
                        disabled={invoiceBodyLocked}
                        onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-4 bg-surface-container p-8 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-headline text-lg font-bold mb-6 text-on-surface">Invoice Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-on-surface-variant">Currency</span>
                        <span className="text-sm font-bold text-on-surface">DOP (RD$)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-on-surface-variant">Tax Rate</span>
                        <span className="text-sm font-bold text-on-surface">18%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-on-surface-variant">NCF Type</span>
                        <select
                          value={formData.tipo_ncf}
                          onChange={(e) => setFormData({ ...formData, tipo_ncf: e.target.value })}
                          disabled={Boolean(editingFactura)}
                          className="text-sm font-bold text-on-surface bg-transparent border-none focus:ring-0"
                        >
                          <option value="E41">E-41 Consumidor final electrónico</option>
                          <option value="E31">E-31 Crédito fiscal electrónico</option>
                          <option value="E43">E-43 Gastos menores electrónico</option>
                          <option value="E44">E-44 Regímenes especiales electrónico</option>
                          <option value="B01">B01 Crédito fiscal</option>
                          <option value="B02">B02 Consumidor final</option>
                        </select>
                      </div>
                      {editingFactura && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-on-surface-variant">Status</span>
                          <select
                            value={formData.estado || 'PENDIENTE'}
                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                            className="text-sm font-bold text-on-surface bg-transparent border-none focus:ring-0"
                          >
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="PAGADA">Pagada</option>
                            <option value="ANULADA">Anulada</option>
                          </select>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-on-surface-variant">Discount %</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.descuento}
                          onChange={(e) => setFormData({ ...formData, descuento: parseFloat(e.target.value) || 0 })}
                          disabled={invoiceBodyLocked}
                          className="w-16 text-sm font-bold text-on-surface bg-transparent border-b border-outline-variant/30 text-right focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-outline-variant/20">
                    <div className="flex items-center gap-3 text-on-surface-variant text-sm bg-surface-container-low p-4 rounded-lg">
                      <span className="material-symbols-outlined">info</span>
                      <p>{invoiceBodyLocked ? 'Paid invoices only allow status, notes and template changes' : 'Click Preview to see invoice template'}</p>
                    </div>
                  </div>
                  <div className="mt-6 bg-surface-container-low rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-headline text-base font-bold text-on-surface">En esta factura</h4>
                      <span className="text-xs font-bold text-on-surface-variant">{detallesConNombre.length} items</span>
                    </div>
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {detallesConNombre.map((detalle, index) => (
                        <div key={`${detalleNombre(detalle)}-${index}`} className="flex items-start justify-between gap-3 rounded-lg bg-surface-container-lowest px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{detalleNombre(detalle)}</p>
                            <p className="text-xs text-on-surface-variant">
                              {detalle.tipo === 'manual' ? 'Servicio manual' : 'Producto'} · {detalle.cantidad || 1} x {formatMoney(detalle.precio_unitario)}
                            </p>
                          </div>
                          <span className="text-sm font-bold font-mono text-on-surface">{formatMoney(detalle.total)}</span>
                        </div>
                      ))}
                      {detallesConNombre.length === 0 && (
                        <p className="text-sm text-on-surface-variant">Agrega un producto o escribe un servicio manual para verlo aqui.</p>
                      )}
                    </div>
                    {!invoiceBodyLocked && (
                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={handleAddDetalle}
                          className="flex-1 rounded-lg bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-highest"
                        >
                          + Producto
                        </button>
                        <button
                          type="button"
                          onClick={handleAddServicioManual}
                          className="flex-1 rounded-lg bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-highest"
                        >
                          + Servicio
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-12 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-headline text-lg font-bold text-on-surface">Productos y servicios</h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleAddDetalle}
                        disabled={invoiceBodyLocked}
                        className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-base">inventory_2</span>
                        Producto
                      </button>
                      <button
                        type="button"
                        onClick={handleAddServicioManual}
                        disabled={invoiceBodyLocked}
                        className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-base">edit_note</span>
                        Servicio manual
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left">
                          <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider w-1/2">Producto o servicio</th>
                          <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-center">Cant.</th>
                          <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">Precio</th>
                          <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-center">18%</th>
                          <th className="pb-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">Total</th>
                          <th className="pb-4 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {formData.detalles.map((detalle, index) => (
                          <tr key={index} className="group hover:bg-surface-container-high/30 transition-colors">
                            <td className="py-4 pr-6">
                              {detalle.tipo === 'manual' ? (
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
                                    <span className="material-symbols-outlined text-sm">edit_note</span>
                                    Servicio manual
                                  </span>
                                  <button
                                    type="button"
                                    disabled={invoiceBodyLocked}
                                    onClick={() => {
                                      const newDetalles = [...formData.detalles];
                                      newDetalles[index] = { ...emptyDetalle() };
                                      setFormData({ ...formData, detalles: newDetalles });
                                    }}
                                    className="text-xs font-semibold text-primary hover:underline"
                                  >
                                    usar producto
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={detalle.producto_id}
                                  onChange={(e) => handleDetalleChange(index, 'producto_id', e.target.value)}
                                  disabled={invoiceBodyLocked}
                                  className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                                >
                                  <option value="">Seleccionar producto</option>
                                  {productos.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.nombre} · stock {p.stock ?? 0}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <input
                                className="mt-2 w-full bg-transparent border-b border-outline-variant/20 py-1 text-xs text-on-surface-variant focus:border-primary focus:outline-none"
                                placeholder={detalle.producto_id ? 'Descripción que aparecerá en la factura' : 'Texto del servicio que saldra en la factura'}
                                value={detalle.descripcion || ''}
                                disabled={invoiceBodyLocked}
                                onChange={(e) => handleDetalleChange(index, 'descripcion', e.target.value)}
                              />
                            </td>
                            <td className="py-4 px-4 text-center">
                              <input
                                className="w-12 bg-transparent border-none p-0 text-sm text-center focus:ring-0 font-mono"
                                type="number"
                                min="1"
                                value={detalle.cantidad}
                                disabled={invoiceBodyLocked}
                                onChange={(e) => handleDetalleChange(index, 'cantidad', parseFloat(e.target.value) || 1)}
                              />
                            </td>
                            <td className="py-4 px-4 text-right">
                              <input
                                className="w-24 bg-transparent border-none p-0 text-sm text-right focus:ring-0 font-mono"
                                type="number"
                                step="0.01"
                                value={detalle.precio_unitario}
                                disabled={invoiceBodyLocked}
                                onChange={(e) => handleDetalleChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                type="button"
                                disabled={invoiceBodyLocked}
                                onClick={() => handleDetalleChange(index, 'aplica_itbis', !detalle.aplica_itbis)}
                                className={`mx-auto inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                                  detalle.aplica_itbis !== false ? 'bg-primary' : 'bg-surface-container-highest'
                                }`}
                                title={detalle.aplica_itbis !== false ? 'ITBIS 18% activo' : 'Sin ITBIS'}
                              >
                                <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                  detalle.aplica_itbis !== false ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                              </button>
                              <p className="mt-1 text-[10px] font-bold text-on-surface-variant">
                                {detalle.aplica_itbis !== false ? 'ITBIS' : 'EXENTO'}
                              </p>
                            </td>
                            <td className="py-4 pl-4 text-right font-bold text-sm font-mono">
                              {formatMoney(detalle.total)}
                            </td>
                            <td className="py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleRemoveDetalle(index)}
                                disabled={invoiceBodyLocked}
                                className="material-symbols-outlined text-error cursor-pointer text-lg"
                              >
                                delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="col-span-12 flex justify-end mt-4">
                  <div className="w-full max-w-sm space-y-4">
                    <div className="flex justify-between items-center text-on-surface-variant">
                      <span className="text-sm">Subtotal</span>
                      <span className="font-mono font-medium">{formatMoney(calcularSubtotal())}</span>
                    </div>
                    <div className="flex justify-between items-center text-on-surface-variant">
                      <span className="text-sm">Tax (18%)</span>
                      <span className="font-mono font-medium">{formatMoney(calcularItbis())}</span>
                    </div>
                    {formData.descuento > 0 && (
                      <div className="flex justify-between items-center text-on-surface-variant">
                        <span className="text-sm">Discount ({formData.descuento}%)</span>
                        <span className="font-mono font-medium">-{formatMoney(calcularSubtotal() * formData.descuento / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t-2 border-primary/10">
                      <span className="font-headline font-bold text-lg">Amount Due</span>
                      <span className="font-mono font-bold text-2xl text-primary">{formatMoney(calcularTotal())}</span>
                    </div>
                    <div className="pt-6">
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Internal Notes</label>
                      <textarea
                        className="w-full bg-surface-container rounded-lg border-none text-sm p-4 focus:ring-1 focus:ring-primary/20 resize-none"
                        placeholder="Private notes for your records..."
                        rows="3"
                        value={formData.nota}
                        onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-surface-container shadow-2xl flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-all active:scale-90 group z-50"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'anular' ? t('Anular factura') : confirmAction?.type === 'dgii' ? t('Enviar a DGII') : t('Eliminar factura')}
        message={confirmAction?.type === 'anular' ? `${t('¿Anular la factura')} ${confirmAction?.factura?.ncf || ''}?` : confirmAction?.type === 'dgii' ? t('¿Enviar la factura a la DGII?\n\nSe generará el XML e-CF y se enviará al portal.') : t('¿Está seguro de eliminar esta factura?')}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmAction(null)}
        confirmText={confirmAction?.type === 'anular' ? t('Anular') : confirmAction?.type === 'dgii' ? t('Enviar') : t('Eliminar')}
        variant={confirmAction?.type === 'dgii' ? 'primary' : 'danger'}
      />
    </>
  );
}
