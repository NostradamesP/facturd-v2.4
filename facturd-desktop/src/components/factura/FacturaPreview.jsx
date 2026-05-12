import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { plantillasService } from '../../services/api';

const templates = [
  { id: 'classic', name: 'Classic', description: 'Traditional elegant design' },
  { id: 'modern', name: 'Modern', description: 'Clean and minimal' },
  { id: 'bold', name: 'Bold', description: 'Strong visual impact' },
];

export default function FacturaPreview({ formData, cliente, selectedTemplate, onTemplateChange }) {
  const { empresa } = useAuth();
  const [customTemplate, setCustomTemplate] = useState(null);

  useEffect(() => {
    if (!selectedTemplate || selectedTemplate === 'classic' || selectedTemplate === 'modern' || selectedTemplate === 'bold') {
      setCustomTemplate(null);
      return;
    }
    const controller = new AbortController();
    plantillasService.getById(selectedTemplate, { signal: controller.signal })
      .then(res => {
        try {
          setCustomTemplate(res.data.diseno_json ? JSON.parse(res.data.diseno_json) : null);
        } catch (e) {
          setCustomTemplate(null);
        }
      })
      .catch(err => {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error('Error loading template:', err);
          setCustomTemplate(null);
        }
      });
    return () => controller.abort();
  }, [selectedTemplate]);
  
  const detalles = formData.detalles || [];
  const subtotal = detalles.reduce((sum, d) => sum + ((Number(d.precio_unitario) || 0) * (Number(d.cantidad) || 0)), 0);
  const itbis = detalles.reduce((sum, d) => sum + (Number(d.itbis) || 0), 0);
  const descuento = subtotal * ((Number(formData.descuento) || 0) / 100);
  const total = subtotal + itbis - descuento;

  const selectedClient = cliente;
  const formatMoney = (value) => `RD$ ${(Number(value) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  const resolveElementText = (element) => {
    const values = {
      company_name: empresa?.nombre || 'Nombre Empresa',
      company_rnc: `RNC: ${empresa?.rnc || ''}`,
      company_address: empresa?.direccion || 'Direccion empresa',
      invoice_number: formData.ncf || formData.tipo_ncf || 'NCF pendiente',
      invoice_date: formData.fecha || '-',
      client_name: selectedClient?.nombre || 'Cliente',
      client_rnc: `RNC: ${selectedClient?.rnc || ''}`,
      subtotal: `Subtotal: ${formatMoney(subtotal)}`,
      itbis: `ITBIS: ${formatMoney(itbis)}`,
      total: `Total: ${formatMoney(total)}`,
    };
    return values[element.type] || element.text || element.type.replace(/_/g, ' ');
  };

  const TemplateClassic = () => (
    <div className="bg-white p-8 rounded-lg text-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center text-white mb-4">
            <span className="material-symbols-outlined text-2xl">receipt</span>
          </div>
          <h3 className="font-bold text-lg text-gray-900">{empresa?.nombre || 'Company Name'}</h3>
          <p className="text-gray-500 text-xs">RNC: {empresa?.rnc || 'XXX-XXXXXX-X'}</p>
          <p className="text-gray-500 text-xs">{empresa?.direccion || 'Address'}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400 uppercase tracking-wider">INVOICE</span>
          <p className="font-bold text-2xl text-gray-900">#INV-001</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-400 uppercase mb-2">Bill To</p>
          <p className="font-medium text-gray-900">{selectedClient?.nombre || 'Client Name'}</p>
          <p className="text-gray-500 text-xs">{selectedClient?.rnc || 'RNC'}</p>
          <p className="text-gray-500 text-xs">{selectedClient?.direccion || 'Address'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">Date: <span className="text-gray-700">{formData.fecha || '-'}</span></p>
          <p className="text-xs text-gray-400 mb-1">Due: <span className="text-gray-700">{formData.fecha_vencimiento || '-'}</span></p>
          <p className="text-xs text-gray-400">NCF: <span className="text-gray-700">{formData.tipo_ncf}</span></p>
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="text-xs text-gray-400 uppercase border-b border-gray-200">
            <th className="text-left py-3">Description</th>
            <th className="text-center py-3">Qty</th>
            <th className="text-right py-3">Price</th>
            <th className="text-right py-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {detalles.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-3 text-gray-700">{item.descripcion || 'Item'}</td>
              <td className="py-3 text-center text-gray-700">{item.cantidad || 0}</td>
              <td className="py-3 text-right text-gray-700">${(item.precio_unitario || 0).toFixed(2)}</td>
              <td className="py-3 text-right text-gray-700 font-medium">
                ${((item.precio_unitario || 0) * (item.cantidad || 0)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-gray-500 text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-sm">
            <span>ITBIS (18%)</span>
            <span>${itbis.toFixed(2)}</span>
          </div>
          {formData.descuento > 0 && (
            <div className="flex justify-between text-gray-500 text-sm">
              <span>Discount ({formData.descuento}%)</span>
              <span>-${descuento.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const TemplateModern = () => (
    <div className="bg-white p-8 rounded-lg text-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="font-headline font-extrabold text-2xl text-gray-900">{empresa?.nombre || 'Company'}</h3>
          <p className="text-gray-400 text-xs mt-1">RNC: {empresa?.rnc || 'XXX'} | {empresa?.direccion || 'Address'}</p>
        </div>
        <div className="bg-gray-900 text-white px-4 py-2 rounded-lg">
          <p className="text-xs opacity-60">INVOICE</p>
          <p className="font-bold text-xl">#INV-001</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-400 uppercase mb-2">From</p>
          <p className="font-medium text-gray-900">{empresa?.nombre || 'Company'}</p>
          <p className="text-gray-500 text-xs">{empresa?.telefono || 'Phone'}</p>
          <p className="text-gray-500 text-xs">{empresa?.email || 'email@company.com'}</p>
        </div>
        <div className="bg-primary/5 p-4 rounded-lg">
          <p className="text-xs text-primary uppercase mb-2">Bill To</p>
          <p className="font-medium text-gray-900">{selectedClient?.nombre || 'Client'}</p>
          <p className="text-gray-500 text-xs">{selectedClient?.rnc || 'RNC'}</p>
          <p className="text-gray-500 text-xs">{selectedClient?.direccion || 'Address'}</p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {detalles.map((item, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-800">{item.descripcion || 'Item'}</p>
              <p className="text-xs text-gray-400">{item.cantidad || 0} x ${(item.precio_unitario || 0).toFixed(2)}</p>
            </div>
            <p className="font-bold text-gray-900">${((item.precio_unitario || 0) * (item.cantidad || 0)).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <div className="w-72 bg-gray-900 text-white p-6 rounded-xl">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Tax</span>
            <span>${itbis.toFixed(2)}</span>
          </div>
          <div className="h-px bg-gray-700 my-3"></div>
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span className="text-primary">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const TemplateBold = () => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-lg text-sm text-white">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-white text-xl">diamond</span>
          </div>
          <h3 className="font-bold text-xl">{empresa?.nombre || 'COMPANY'}</h3>
          <p className="text-gray-400 text-xs">{empresa?.direccion || 'Address'}</p>
        </div>
        <div className="text-right">
          <span className="text-primary text-xs font-bold uppercase tracking-widest">Invoice</span>
          <p className="font-bold text-3xl">#INV-001</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b border-gray-700">
        <div>
          <p className="text-gray-400 text-xs uppercase mb-2">Client</p>
          <p className="font-bold text-lg">{selectedClient?.nombre || 'Client Name'}</p>
          <p className="text-gray-400 text-xs">{selectedClient?.rnc || 'RNC'}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Date: <span className="text-white">{formData.fecha || '-'}</span></p>
          <p className="text-gray-400 text-xs">Due: <span className="text-white">{formData.fecha_vencimiento || '-'}</span></p>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {detalles.map((item, i) => (
          <div key={i} className="flex justify-between items-center">
            <div>
              <p className="font-medium">{item.descripcion || 'Item'}</p>
              <p className="text-gray-400 text-xs">{item.cantidad || 0} units</p>
            </div>
            <p className="font-bold text-lg">${((item.precio_unitario || 0) * (item.cantidad || 0)).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/10 p-6 rounded-xl">
        <div className="flex justify-between mb-2 text-gray-300">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-2 text-gray-300">
          <span>Tax (18%)</span>
          <span>${itbis.toFixed(2)}</span>
        </div>
        <div className="h-px bg-white/20 my-3"></div>
        <div className="flex justify-between text-2xl font-bold">
          <span className="text-primary">Total</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  const renderTemplate = () => {
    switch (selectedTemplate) {
      case 'modern':
        return <TemplateModern />;
      case 'bold':
        return <TemplateBold />;
      default:
        return <TemplateClassic />;
    }
  };

  const isCustomTemplate = selectedTemplate && !templates.find(t => t.id === selectedTemplate);

  const renderCustomTemplate = () => {
    if (!customTemplate || customTemplate.length === 0) {
      return (
        <div className="bg-white p-8 rounded-lg text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl mb-2">design_services</span>
          <p>Esta plantilla no tiene elementos</p>
        </div>
      );
    }

    return (
      <div className="bg-white p-8 rounded-lg text-sm relative overflow-hidden" style={{ minHeight: '842px' }}>
        {customTemplate.map((element) => {
          const style = { position: 'absolute', left: element.x, top: element.y };
          
          switch (element.type) {
            case 'text':
            case 'company_name':
            case 'company_rnc':
            case 'company_address':
            case 'invoice_number':
            case 'invoice_date':
            case 'client_name':
            case 'client_rnc':
            case 'subtotal':
            case 'itbis':
            case 'total':
              return (
                <div key={element.id} style={{ ...style, fontSize: element.fontSize, fontWeight: element.fontWeight, color: element.color }}>
                  {resolveElementText(element)}
                </div>
              );
            case 'box':
              return (
                <div key={element.id} style={{ ...style, width: element.width, height: element.height, backgroundColor: element.backgroundColor, border: `${element.borderWidth}px solid ${element.borderColor}`, padding: element.padding, borderRadius: 4 }}>
                  {element.text}
                </div>
              );
            case 'image':
              return element.src ? (
                <img key={element.id} src={element.src} alt="" style={{ ...style, width: element.width }} />
              ) : (
                <div key={element.id} style={{ ...style, width: element.width, height: element.height, backgroundColor: '#f0f0f0' }} className="flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined">image</span>
                </div>
              );
            case 'line':
              return <div key={element.id} style={{ ...style, width: element.width || 300, height: element.thickness, backgroundColor: element.color }} />;
            case 'rectangle':
              return <div key={element.id} style={{ ...style, width: element.width, height: element.height, backgroundColor: element.fillColor, border: `${element.borderWidth}px solid ${element.borderColor}`, borderRadius: element.borderRadius }} />;
            case 'circle':
              return <div key={element.id} style={{ ...style, width: element.size, height: element.size, backgroundColor: element.fillColor, border: `${element.borderWidth}px solid ${element.borderColor}`, borderRadius: '50%' }} />;
            case 'qr':
              return (
                <div key={element.id} style={{ ...style, width: element.size }}>
                  <div className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-primary">qr_code_2</span>
                  </div>
                </div>
              );
            case 'table':
              return (
                <div key={element.id} style={{ ...style, width: element.width || '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr>
                        {element.headers?.map((h, i) => (
                          <th key={i} className="bg-gray-100 p-2 text-left font-semibold border">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(detalles.length ? detalles : Array(element.rows).fill(null)).map((detalle, rowIdx) => (
                        <tr key={rowIdx}>
                          <td className="p-2 border">{detalle?.descripcion || '-'}</td>
                          <td className="p-2 border text-right">{detalle?.cantidad || '-'}</td>
                          <td className="p-2 border text-right">{detalle?.precio_unitario !== undefined ? formatMoney(detalle.precio_unitario) : '-'}</td>
                          <td className="p-2 border text-right">{detalle?.total !== undefined ? formatMoney(detalle.total) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4 no-print">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedTemplate === template.id
                ? 'bg-primary text-white'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {template.name}
          </button>
        ))}
        {isCustomTemplate && (
          <span className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-container text-primary">
            Personalizada
          </span>
        )}
      </div>
      {isCustomTemplate ? renderCustomTemplate() : renderTemplate()}
    </div>
  );
}
