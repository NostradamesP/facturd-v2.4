import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { plantillasService } from '../services/api';

const ELEMENT_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  LINE: 'line',
  SPACER: 'spacer',
  TABLE: 'table',
  QR: 'qr',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  BOX: 'box',
};

const TOOLBOX_CATEGORIES = [
  {
    name: 'Básico',
    items: [
      { type: ELEMENT_TYPES.TEXT, label: 'Texto', icon: 'text_fields', defaultProps: { text: 'Nuevo texto', fontSize: 14, fontWeight: 'normal', color: '#2a3439', align: 'left' } },
      { type: ELEMENT_TYPES.BOX, label: 'Caja de Texto', icon: 'text_snippet', defaultProps: { text: 'Escribe aquí...', width: 200, height: 60, fontSize: 12, backgroundColor: '#ffffff', borderColor: '#a9b4b9', borderWidth: 1, padding: 8 } },
      { type: ELEMENT_TYPES.LINE, label: 'Línea', icon: 'horizontal_rule', defaultProps: { color: '#a9b4b9', thickness: 1, width: 300 } },
    ]
  },
  {
    name: 'Elementos',
    items: [
      { type: ELEMENT_TYPES.IMAGE, label: 'Logo/Imagen', icon: 'image', defaultProps: { src: '', width: 120, height: 80, objectFit: 'contain' } },
      { type: ELEMENT_TYPES.RECTANGLE, label: 'Rectángulo', icon: 'rectangle', defaultProps: { width: 150, height: 80, fillColor: '#dae2ff', borderColor: '#0056d2', borderWidth: 1, borderRadius: 0 } },
      { type: ELEMENT_TYPES.CIRCLE, label: 'Círculo', icon: 'circle', icon: 'circle', defaultProps: { size: 60, fillColor: '#dae2ff', borderColor: '#0056d2', borderWidth: 1 } },
    ]
  },
  {
    name: 'Datos',
    items: [
      { type: ELEMENT_TYPES.TABLE, label: 'Tabla de Productos', icon: 'table_chart', defaultProps: { columns: 4, rows: 5, headers: ['Descripción', 'Cantidad', 'P.Unit', 'Total'], width: '100%' } },
      { type: ELEMENT_TYPES.QR, label: 'Código QR', icon: 'qr_code_2', defaultProps: { size: 80, value: 'NCF-001' } },
      { type: ELEMENT_TYPES.SPACER, label: 'Espaciador', icon: 'vertical_align_bottom', defaultProps: { height: 30 } },
    ]
  },
  {
    name: 'Información',
    items: [
      { type: 'company_name', label: 'Nombre Empresa', icon: 'business', defaultProps: { fontSize: 18, fontWeight: 'bold', color: '#2a3439' } },
      { type: 'company_rnc', label: 'RNC Empresa', icon: 'badge', defaultProps: { fontSize: 10, color: '#566166' } },
      { type: 'company_address', label: 'Dirección', icon: 'location_on', defaultProps: { fontSize: 10, color: '#566166' } },
      { type: 'invoice_number', label: 'Número Factura', icon: 'tag', defaultProps: { fontSize: 14, fontWeight: 'bold', color: '#2a3439' } },
      { type: 'invoice_date', label: 'Fecha', icon: 'calendar_today', defaultProps: { fontSize: 10, color: '#566166' } },
      { type: 'client_name', label: 'Nombre Cliente', icon: 'person', defaultProps: { fontSize: 12, fontWeight: 'medium', color: '#2a3439' } },
      { type: 'client_rnc', label: 'RNC Cliente', icon: 'badge', defaultProps: { fontSize: 10, color: '#566166' } },
      { type: 'subtotal', label: 'Subtotal', icon: 'calculate', defaultProps: { fontSize: 12, color: '#2a3439' } },
      { type: 'itbis', label: 'ITBIS', icon: 'percent', defaultProps: { fontSize: 12, color: '#566166' } },
      { type: 'total', label: 'Total', icon: 'payments', defaultProps: { fontSize: 16, fontWeight: 'bold', color: '#0056d2' } },
    ]
  },
];

const SNAP_GRID = 10;

const PLANTILLAS_PREDEFINIDAS = [
  {
    id: 'minimal',
    nombre: 'Minimalista',
    descripcion: 'Diseño limpio y profesional',
    color: '#1a1a2e',
    elements: [
      { id: 'e1', type: 'company_name', x: 30, y: 30, text: 'NOMBRE EMPRESA', fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
      { id: 'e2', type: 'company_rnc', x: 30, y: 55, fontSize: 9, color: '#666666' },
      { id: 'e3', type: 'company_address', x: 30, y: 70, fontSize: 9, color: '#666666' },
      { id: 'e4', type: ELEMENT_TYPES.LINE, x: 30, y: 100, width: 535, thickness: 2, color: '#1a1a2e' },
      { id: 'e5', type: ELEMENT_TYPES.TEXT, x: 30, y: 120, text: 'FACTURA', fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' },
      { id: 'e6', type: 'invoice_number', x: 400, y: 120, text: '#001', fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
      { id: 'e7', type: 'invoice_date', x: 400, y: 140, fontSize: 10, color: '#666666' },
      { id: 'e8', type: ELEMENT_TYPES.LINE, x: 30, y: 170, width: 535, thickness: 1, color: '#e0e0e0' },
      { id: 'e9', type: 'client_name', x: 30, y: 190, text: 'Cliente: ', fontSize: 11, fontWeight: 'bold', color: '#1a1a2e' },
      { id: 'e10', type: 'client_rnc', x: 30, y: 208, fontSize: 9, color: '#666666' },
      { id: 'e11', type: ELEMENT_TYPES.TABLE, x: 30, y: 240, width: 535, columns: 4, rows: 5, headers: ['Descripción', 'Cantidad', 'P.Unit', 'Total'] },
      { id: 'e12', type: ELEMENT_TYPES.LINE, x: 30, y: 550, width: 535, thickness: 1, color: '#e0e0e0' },
      { id: 'e13', type: 'subtotal', x: 350, y: 575, text: 'Subtotal: ', fontSize: 11, color: '#666666' },
      { id: 'e14', type: 'itbis', x: 350, y: 595, text: 'ITBIS (18%): ', fontSize: 11, color: '#666666' },
      { id: 'e15', type: 'total', x: 350, y: 620, text: 'TOTAL: ', fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
      { id: 'e16', type: ELEMENT_TYPES.QR, x: 480, y: 570, size: 70, value: 'NCF' },
      { id: 'e17', type: ELEMENT_TYPES.TEXT, x: 30, y: 780, text: 'Gracias por su preferencia', fontSize: 10, color: '#999999', align: 'center' },
    ]
  },
  {
    id: 'corporate',
    nombre: 'Corporativo',
    descripcion: 'Estilo azul corporativo',
    color: '#1976d2',
    elements: [
      { id: 'e1', type: ELEMENT_TYPES.RECTANGLE, x: 0, y: 0, width: 595, height: 80, fillColor: '#1976d2', borderWidth: 0 },
      { id: 'e2', type: 'company_name', x: 30, y: 25, text: 'NOMBRE EMPRESA', fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
      { id: 'e3', type: 'company_rnc', x: 30, y: 50, fontSize: 9, color: '#bbdefb' },
      { id: 'e4', type: ELEMENT_TYPES.TEXT, x: 400, y: 30, text: 'FACTURA ELECTRÓNICA', fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
      { id: 'e5', type: 'invoice_number', x: 400, y: 50, fontSize: 11, color: '#bbdefb' },
      { id: 'e6', type: 'invoice_date', x: 400, y: 65, fontSize: 10, color: '#bbdefb' },
      { id: 'e7', type: 'client_name', x: 30, y: 120, text: 'CLIENTE', fontSize: 10, fontWeight: 'bold', color: '#1976d2' },
      { id: 'e8', type: 'client_rnc', x: 30, y: 140, fontSize: 10, color: '#333333' },
      { id: 'e9', type: ELEMENT_TYPES.TABLE, x: 30, y: 170, width: 535, columns: 4, rows: 5, headers: ['Descripción', 'Cantidad', 'Precio', 'Importe'] },
      { id: 'e10', type: ELEMENT_TYPES.BOX, x: 350, y: 560, width: 215, height: 90, fillColor: '#f5f5f5', borderColor: '#1976d2', borderWidth: 1 },
      { id: 'e11', type: 'subtotal', x: 365, y: 575, text: 'Subtotal:', fontSize: 11, color: '#333333' },
      { id: 'e12', type: 'itbis', x: 365, y: 595, text: 'ITBIS (18%):', fontSize: 11, color: '#333333' },
      { id: 'e13', type: 'total', x: 365, y: 620, text: 'TOTAL:', fontSize: 16, fontWeight: 'bold', color: '#1976d2' },
      { id: 'e14', type: ELEMENT_TYPES.QR, x: 480, y: 570, size: 65, value: 'NCF' },
      { id: 'e15', type: ELEMENT_TYPES.TEXT, x: 30, y: 780, text: 'Sistema de Facturación Electrónica - FactuRD', fontSize: 8, color: '#999999', align: 'center' },
    ]
  },
  {
    id: 'moderno',
    nombre: 'Moderno',
    descripcion: 'Diseño contemporáneo con gradiente',
    color: '#6366f1',
    elements: [
      { id: 'e1', type: ELEMENT_TYPES.RECTANGLE, x: 0, y: 0, width: 160, height: 842, fillColor: '#6366f1', borderWidth: 0 },
      { id: 'e2', type: 'company_name', x: 20, y: 40, text: 'EMPRESA', fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
      { id: 'e3', type: 'company_rnc', x: 20, y: 65, fontSize: 8, color: '#a5b4fc' },
      { id: 'e4', type: 'company_address', x: 20, y: 80, fontSize: 8, color: '#a5b4fc' },
      { id: 'e5', type: 'client_name', x: 20, y: 120, text: 'CLIENTE', fontSize: 9, fontWeight: 'bold', color: '#ffffff' },
      { id: 'e6', type: 'client_rnc', x: 20, y: 140, fontSize: 8, color: '#a5b4fc' },
      { id: 'e7', type: ELEMENT_TYPES.TEXT, x: 200, y: 40, text: 'FACTURA', fontSize: 32, fontWeight: 'bold', color: '#6366f1' },
      { id: 'e8', type: 'invoice_number', x: 200, y: 80, fontSize: 12, color: '#6366f1' },
      { id: 'e9', type: 'invoice_date', x: 200, y: 100, fontSize: 11, color: '#666666' },
      { id: 'e10', type: ELEMENT_TYPES.TABLE, x: 200, y: 150, width: 365, columns: 4, rows: 5, headers: ['Item', 'Cant.', 'Precio', 'Total'] },
      { id: 'e11', type: ELEMENT_TYPES.LINE, x: 200, y: 550, width: 365, thickness: 2, color: '#6366f1' },
      { id: 'e12', type: 'subtotal', x: 450, y: 570, text: 'Subtotal:', fontSize: 12, color: '#333333', align: 'right' },
      { id: 'e13', type: 'itbis', x: 450, y: 595, text: 'ITBIS:', fontSize: 12, color: '#666666', align: 'right' },
      { id: 'e14', type: 'total', x: 450, y: 625, text: 'TOTAL:', fontSize: 18, fontWeight: 'bold', color: '#6366f1', align: 'right' },
      { id: 'e15', type: ELEMENT_TYPES.QR, x: 200, y: 680, size: 80, value: 'NCF' },
      { id: 'e16', type: ELEMENT_TYPES.TEXT, x: 200, y: 780, text: 'Gracias por confiar en nosotros', fontSize: 10, color: '#999999', align: 'center' },
    ]
  },
  {
    id: 'elegante',
    nombre: 'Elegante',
    descripcion: 'Estilo premium con dorados',
    color: '#b8860b',
    elements: [
      { id: 'e1', type: ELEMENT_TYPES.RECTANGLE, x: 0, y: 0, width: 595, height: 120, fillColor: '#1a1a1a', borderWidth: 0 },
      { id: 'e2', type: 'company_name', x: 30, y: 30, text: 'EMPRESA', fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
      { id: 'e3', type: 'company_rnc', x: 30, y: 58, fontSize: 9, color: '#888888' },
      { id: 'e4', type: 'company_address', x: 30, y: 75, fontSize: 9, color: '#888888' },
      { id: 'e5', type: ELEMENT_TYPES.RECTANGLE, x: 400, y: 15, width: 165, height: 90, fillColor: '#b8860b', borderWidth: 0 },
      { id: 'e6', type: ELEMENT_TYPES.TEXT, x: 415, y: 35, text: 'FACTURA', fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
      { id: 'e7', type: 'invoice_number', x: 415, y: 60, fontSize: 11, color: '#1a1a1a' },
      { id: 'e8', type: 'invoice_date', x: 415, y: 80, fontSize: 10, color: '#333333' },
      { id: 'e9', type: 'client_name', x: 30, y: 155, text: 'CLIENTE:', fontSize: 10, fontWeight: 'bold', color: '#b8860b' },
      { id: 'e10', type: 'client_rnc', x: 30, y: 175, fontSize: 9, color: '#333333' },
      { id: 'e11', type: ELEMENT_TYPES.TABLE, x: 30, y: 210, width: 535, columns: 4, rows: 5, headers: ['Descripción', 'Cantidad', 'P.Unit', 'Total'] },
      { id: 'e12', type: ELEMENT_TYPES.LINE, x: 30, y: 550, width: 535, thickness: 1, color: '#b8860b' },
      { id: 'e13', type: 'subtotal', x: 350, y: 575, text: 'Subtotal', fontSize: 11, color: '#333333' },
      { id: 'e14', type: 'itbis', x: 350, y: 600, text: 'ITBIS (18%)', fontSize: 11, color: '#666666' },
      { id: 'e15', type: ELEMENT_TYPES.BOX, x: 350, y: 625, width: 215, height: 35, fillColor: '#1a1a1a', borderWidth: 0 },
      { id: 'e16', type: 'total', x: 360, y: 635, text: 'TOTAL:', fontSize: 16, fontWeight: 'bold', color: '#b8860b' },
      { id: 'e17', type: ELEMENT_TYPES.QR, x: 480, y: 575, size: 65, value: 'NCF' },
      { id: 'e18', type: ELEMENT_TYPES.TEXT, x: 30, y: 780, text: 'www.empresa.com | info@empresa.com', fontSize: 9, color: '#888888', align: 'center' },
    ]
  },
  {
    id: 'verde',
    nombre: 'Verde',
    descripcion: 'Ecologista y fresco',
    color: '#2e7d32',
    elements: [
      { id: 'e1', type: ELEMENT_TYPES.RECTANGLE, x: 0, y: 0, width: 595, height: 100, fillColor: '#2e7d32', borderWidth: 0, borderRadius: 0 },
      { id: 'e2', type: ELEMENT_TYPES.CIRCLE, x: 480, y: 10, size: 80, fillColor: '#4caf50', borderWidth: 0 },
      { id: 'e3', type: 'company_name', x: 30, y: 30, text: 'NOMBRE DE LA EMPRESA', fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
      { id: 'e4', type: 'company_rnc', x: 30, y: 55, fontSize: 9, color: '#a5d6a7' },
      { id: 'e5', type: ELEMENT_TYPES.TEXT, x: 30, y: 130, text: 'FACTURA', fontSize: 26, fontWeight: 'bold', color: '#2e7d32' },
      { id: 'e6', type: 'invoice_number', x: 30, y: 165, fontSize: 11, color: '#666666' },
      { id: 'e7', type: 'invoice_date', x: 30, y: 185, fontSize: 10, color: '#666666' },
      { id: 'e8', type: 'client_name', x: 250, y: 130, text: 'CLIENTE', fontSize: 10, fontWeight: 'bold', color: '#2e7d32' },
      { id: 'e9', type: 'client_rnc', x: 250, y: 150, fontSize: 10, color: '#333333' },
      { id: 'e10', type: ELEMENT_TYPES.TABLE, x: 30, y: 230, width: 535, columns: 4, rows: 5, headers: ['Producto/Servicio', 'Cant.', 'Precio', 'Monto'] },
      { id: 'e11', type: ELEMENT_TYPES.LINE, x: 30, y: 550, width: 250, thickness: 2, color: '#4caf50' },
      { id: 'e12', type: 'subtotal', x: 350, y: 570, text: 'Subtotal:', fontSize: 11, color: '#333333' },
      { id: 'e13', type: 'itbis', x: 350, y: 595, text: 'ITBIS 18%:', fontSize: 11, color: '#666666' },
      { id: 'e14', type: 'total', x: 350, y: 625, text: 'TOTAL A PAGAR:', fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
      { id: 'e15', type: ELEMENT_TYPES.QR, x: 480, y: 570, size: 70, value: 'NCF' },
      { id: 'e16', type: ELEMENT_TYPES.TEXT, x: 30, y: 780, text: 'Cuidemos el medio ambiente - Factura digital', fontSize: 9, color: '#999999', align: 'center' },
    ]
  },
  {
    id: 'oscuro',
    nombre: 'Dark',
    descripcion: 'Modo oscuro elegante',
    color: '#212121',
    elements: [
      { id: 'e1', type: ELEMENT_TYPES.RECTANGLE, x: 0, y: 0, width: 595, height: 842, fillColor: '#121212', borderWidth: 0 },
      { id: 'e2', type: ELEMENT_TYPES.RECTANGLE, x: 0, y: 0, width: 595, height: 90, fillColor: '#1e1e1e', borderWidth: 0 },
      { id: 'e3', type: 'company_name', x: 30, y: 30, text: 'EMPRESA', fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
      { id: 'e4', type: 'company_rnc', x: 30, y: 55, fontSize: 9, color: '#aaaaaa' },
      { id: 'e5', type: ELEMENT_TYPES.TEXT, x: 400, y: 30, text: 'INVOICE', fontSize: 24, fontWeight: 'bold', color: '#00e676' },
      { id: 'e6', type: 'invoice_number', x: 400, y: 60, fontSize: 11, color: '#ffffff' },
      { id: 'e7', type: 'invoice_date', x: 400, y: 78, fontSize: 10, color: '#aaaaaa' },
      { id: 'e8', type: 'client_name', x: 30, y: 125, text: 'BILL TO', fontSize: 10, fontWeight: 'bold', color: '#00e676' },
      { id: 'e9', type: 'client_rnc', x: 30, y: 145, fontSize: 10, color: '#ffffff' },
      { id: 'e10', type: ELEMENT_TYPES.TABLE, x: 30, y: 180, width: 535, columns: 4, rows: 5, headers: ['Description', 'Qty', 'Price', 'Amount'] },
      { id: 'e11', type: 'subtotal', x: 350, y: 570, text: 'Subtotal:', fontSize: 11, color: '#ffffff' },
      { id: 'e12', type: 'itbis', x: 350, y: 595, text: 'Tax (18%):', fontSize: 11, color: '#aaaaaa' },
      { id: 'e13', type: 'total', x: 350, y: 625, text: 'TOTAL:', fontSize: 18, fontWeight: 'bold', color: '#00e676' },
      { id: 'e14', type: ELEMENT_TYPES.QR, x: 480, y: 570, size: 70, value: 'NCF' },
      { id: 'e15', type: ELEMENT_TYPES.TEXT, x: 30, y: 780, text: 'Thank you for your business!', fontSize: 10, color: '#666666', align: 'center' },
    ]
  },
  {
    id: 'gradient',
    nombre: 'Gradiente',
    descripcion: 'Colores vibrantes modernos',
    color: '#ff5722',
    elements: [
      { id: 'e1', type: ELEMENT_TYPES.RECTANGLE, x: 0, y: 0, width: 595, height: 110, fillColor: '#ff5722', borderWidth: 0 },
      { id: 'e2', type: ELEMENT_TYPES.RECTANGLE, x: 0, y: 100, width: 595, height: 10, fillColor: '#ffc107', borderWidth: 0 },
      { id: 'e3', type: 'company_name', x: 30, y: 30, text: 'TU EMPRESA', fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
      { id: 'e4', type: 'company_rnc', x: 30, y: 55, fontSize: 9, color: '#ffccbc' },
      { id: 'e5', type: 'company_address', x: 30, y: 72, fontSize: 9, color: '#ffccbc' },
      { id: 'e6', type: ELEMENT_TYPES.TEXT, x: 30, y: 150, text: 'FACTURA', fontSize: 28, fontWeight: 'bold', color: '#212121' },
      { id: 'e7', type: 'invoice_number', x: 30, y: 185, fontSize: 12, color: '#ff5722' },
      { id: 'e8', type: 'invoice_date', x: 30, y: 205, fontSize: 11, color: '#666666' },
      { id: 'e9', type: 'client_name', x: 250, y: 150, text: 'CLIENTE:', fontSize: 10, fontWeight: 'bold', color: '#212121' },
      { id: 'e10', type: 'client_rnc', x: 250, y: 170, fontSize: 10, color: '#666666' },
      { id: 'e11', type: ELEMENT_TYPES.TABLE, x: 30, y: 240, width: 535, columns: 4, rows: 5, headers: ['Artículo', 'Cantidad', 'Unitario', 'Importe'] },
      { id: 'e12', type: ELEMENT_TYPES.LINE, x: 30, y: 550, width: 535, thickness: 3, color: '#ff5722' },
      { id: 'e13', type: 'subtotal', x: 350, y: 575, text: 'Subtotal:', fontSize: 12, color: '#333333' },
      { id: 'e14', type: 'itbis', x: 350, y: 600, text: 'ITBIS:', fontSize: 12, color: '#666666' },
      { id: 'e15', type: 'total', x: 350, y: 630, text: 'TOTAL:', fontSize: 20, fontWeight: 'bold', color: '#ff5722' },
      { id: 'e16', type: ELEMENT_TYPES.QR, x: 480, y: 575, size: 70, value: 'NCF' },
      { id: 'e17', type: ELEMENT_TYPES.TEXT, x: 30, y: 780, text: '¡期待您的光临!', fontSize: 10, color: '#999999', align: 'center' },
    ]
  },
  {
    id: 'clasico',
    nombre: 'Clásico',
    descripcion: 'Estilo tradicional profesional',
    color: '#455a64',
    elements: [
      { id: 'e1', type: ELEMENT_TYPES.TEXT, x: 30, y: 30, text: 'EMPRESA', fontSize: 24, fontWeight: 'bold', color: '#455a64', align: 'center' },
      { id: 'e2', type: 'company_rnc', x: 30, y: 55, fontSize: 10, color: '#455a64', align: 'center' },
      { id: 'e3', type: 'company_address', x: 30, y: 72, fontSize: 9, color: '#666666', align: 'center' },
      { id: 'e4', type: ELEMENT_TYPES.LINE, x: 30, y: 95, width: 535, thickness: 2, color: '#455a64' },
      { id: 'e5', type: ELEMENT_TYPES.TEXT, x: 30, y: 120, text: 'FACTURA DE VENTA', fontSize: 18, fontWeight: 'bold', color: '#455a64' },
      { id: 'e6', type: 'invoice_number', x: 400, y: 120, fontSize: 11, color: '#455a64' },
      { id: 'e7', type: 'invoice_date', x: 400, y: 140, fontSize: 10, color: '#666666' },
      { id: 'e8', type: 'client_name', x: 30, y: 175, text: 'SEÑOR(ES):', fontSize: 10, fontWeight: 'bold', color: '#455a64' },
      { id: 'e9', type: 'client_rnc', x: 30, y: 195, fontSize: 9, color: '#333333' },
      { id: 'e10', type: ELEMENT_TYPES.TABLE, x: 30, y: 230, width: 535, columns: 4, rows: 5, headers: ['Código', 'Descripción', 'Cantidad', 'Precio'] },
      { id: 'e11', type: ELEMENT_TYPES.LINE, x: 30, y: 550, width: 535, thickness: 1, color: '#455a64' },
      { id: 'e12', type: 'subtotal', x: 350, y: 570, text: 'SUBTOTAL:', fontSize: 11, fontWeight: 'bold', color: '#455a64' },
      { id: 'e13', type: 'itbis', x: 350, y: 595, text: 'IMPUESTO (ITBIS):', fontSize: 11, color: '#666666' },
      { id: 'e14', type: ELEMENT_TYPES.BOX, x: 350, y: 620, width: 215, height: 35, fillColor: '#eceff1', borderColor: '#455a64', borderWidth: 1 },
      { id: 'e15', type: 'total', x: 360, y: 630, text: 'TOTAL:', fontSize: 16, fontWeight: 'bold', color: '#455a64' },
      { id: 'e16', type: ELEMENT_TYPES.QR, x: 480, y: 570, size: 70, value: 'NCF' },
      { id: 'e17', type: ELEMENT_TYPES.TEXT, x: 30, y: 780, text: 'Esta factura es un documento fiscal - Contribuyente режим', fontSize: 8, color: '#999999', align: 'center' },
    ]
  }
];

export default function DisenoFactura() {
  const { addToast } = useToast();
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [draggedTool, setDraggedTool] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState('classic');
  const [copiedElement, setCopiedElement] = useState(null);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(true);
  const [templateName, setTemplateName] = useState('');
  
  const canvasRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, elementX: 0, elementY: 0 });

  const generateId = () => `elem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const saveToHistory = useCallback((newElements) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newElements)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      setSelectedElement(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      setSelectedElement(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) || (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          handleDeleteElement(selectedElement);
        }
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        if (selectedElement) {
          const el = elements.find(e => e.id === selectedElement);
          if (el) setCopiedElement(el);
        }
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        if (copiedElement) {
          const newElement = { ...copiedElement, id: generateId(), x: copiedElement.x + 20, y: copiedElement.y + 20 };
          const newElements = [...elements, newElement];
          setElements(newElements);
          saveToHistory(newElements);
          setSelectedElement(newElement.id);
          addToast('Elemento pegado', 'success');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, elements, copiedElement, historyIndex, history]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await plantillasService.getAll();
      setSavedTemplates(res.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const cloneElements = (sourceElements) =>
    JSON.parse(JSON.stringify(sourceElements || [])).map((element) => ({
      ...element,
      id: generateId(),
    }));

  const applyTemplateElements = (sourceElements, options = {}) => {
    const nextElements = options.clone ? cloneElements(sourceElements) : JSON.parse(JSON.stringify(sourceElements || []));
    setElements(nextElements);
    setCurrentTemplateId(options.templateId || null);
    setActiveTemplate(options.activeTemplate || options.templateId || null);
    setSelectedElement(null);
    saveToHistory(nextElements);
    if (options.name !== undefined) setTemplateName(options.name);
    if (options.closeModal !== false) setShowPreviewModal(false);
    addToast(options.message || 'Plantilla aplicada', 'success');
  };

  const getSavedTemplateElements = (template) => {
    try {
      return template.diseno_json ? JSON.parse(template.diseno_json) : [];
    } catch {
      return [];
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      addToast('Ingresa un nombre para la plantilla', 'error');
      return;
    }
    try {
      const disenoJson = JSON.stringify(elements);
      if (currentTemplateId) {
        await plantillasService.update(currentTemplateId, { nombre: templateName, diseno_json: disenoJson });
        addToast('Plantilla actualizada', 'success');
      } else {
        await plantillasService.create({ nombre: templateName, diseno_json: disenoJson });
        addToast('Plantilla guardada', 'success');
      }
      setShowSaveModal(false);
      setTemplateName('');
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      addToast('Error al guardar plantilla', 'error');
    }
  };

  const handleLoadTemplate = (template) => {
    try {
      applyTemplateElements(getSavedTemplateElements(template), {
        templateId: template.id,
        activeTemplate: template.id,
        message: `Plantilla "${template.nombre}" cargada`,
      });
    } catch (error) {
      console.error('Error loading template:', error);
      addToast('Error al cargar plantilla', 'error');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      await plantillasService.delete(templateId);
      addToast('Plantilla eliminada', 'success');
      loadTemplates();
      if (currentTemplateId === templateId) {
        setCurrentTemplateId(null);
        setElements([]);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      addToast('Error al eliminar plantilla', 'error');
    }
  };

  const snapToGrid = (value) => {
    if (!showGrid) return value;
    return Math.round(value / SNAP_GRID) * SNAP_GRID;
  };

  const handleDragStart = (e, item) => {
    setDraggedTool(item);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', item.type);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedTool) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = snapToGrid((e.clientX - rect.left - pan.x) * (100 / zoom));
    const y = snapToGrid((e.clientY - rect.top - pan.y) * (100 / zoom));

    const newElement = {
      id: generateId(),
      type: draggedTool.type,
      ...draggedTool.defaultProps,
      x,
      y,
      rotation: 0,
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
    setDraggedTool(null);
    addToast(`${draggedTool.label} añadido`, 'success');
  };

  const handleElementMouseDown = (e, elementId) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    setSelectedElement(elementId);
    setIsDragging(true);
    
    const rect = canvasRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: element.x,
      elementY: element.y,
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging && selectedElement) {
      const dx = (e.clientX - dragStartRef.current.x) * (100 / zoom);
      const dy = (e.clientY - dragStartRef.current.y) * (100 / zoom);
      
      const newX = snapToGrid(dragStartRef.current.elementX + dx);
      const newY = snapToGrid(dragStartRef.current.elementY + dy);

      setElements(elements.map(el => 
        el.id === selectedElement ? { ...el, x: newX, y: newY } : el
      ));
    }

    if (isResizing && selectedElement) {
      const element = elements.find(el => el.id === selectedElement);
      if (!element) return;

      const dx = (e.clientX - dragStartRef.current.x) * (100 / zoom);
      const dy = (e.clientY - dragStartRef.current.y) * (100 / zoom);

      let newProps = {};
      
      switch (resizeHandle) {
        case 'se':
          newProps = {
            width: snapToGrid(Math.max(20, dragStartRef.current.elementWidth + dx)),
            height: snapToGrid(Math.max(20, dragStartRef.current.elementHeight + dy)),
          };
          break;
        case 'e':
          newProps = { width: snapToGrid(Math.max(20, dragStartRef.current.elementWidth + dx)) };
          break;
        case 's':
          newProps = { height: snapToGrid(Math.max(20, dragStartRef.current.elementHeight + dy)) };
          break;
        case 'n':
          newProps = { 
            y: snapToGrid(dragStartRef.current.elementY + dy),
            height: snapToGrid(Math.max(20, dragStartRef.current.elementHeight - dy)),
          };
          break;
        case 'w':
          newProps = { 
            x: snapToGrid(dragStartRef.current.elementX + dx),
            width: snapToGrid(Math.max(20, dragStartRef.current.elementWidth - dx)),
          };
          break;
        case 'size':
          newProps = { size: snapToGrid(Math.max(20, dragStartRef.current.elementSize + Math.max(dx, dy))) };
          break;
        case 'height':
          newProps = { height: snapToGrid(Math.max(20, dragStartRef.current.elementHeight + dy)) };
          break;
        case 'fontSize':
          newProps = { fontSize: Math.max(6, dragStartRef.current.elementFontSize + Math.round(dy / 2)) };
          break;
      }

      setElements(elements.map(el => 
        el.id === selectedElement ? { ...el, ...newProps } : el
      ));
    }
  }, [isDragging, isResizing, selectedElement, elements, zoom, showGrid, resizeHandle]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      saveToHistory(elements);
    }
    if (isResizing) {
      saveToHistory(elements);
    }
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, [isDragging, isResizing, elements, saveToHistory]);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleResizeStart = (e, handle) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === selectedElement);
    if (!element) return;

    setIsResizing(true);
    setResizeHandle(handle);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elementWidth: element.width || 100,
      elementHeight: element.height || 50,
      elementSize: element.size || 80,
      elementFontSize: element.fontSize || 14,
      elementY: element.y,
      elementX: element.x,
    };
  };

  const handleDeleteElement = (elementId) => {
    const newElements = elements.filter(el => el.id !== elementId);
    setElements(newElements);
    saveToHistory(newElements);
    if (selectedElement === elementId) setSelectedElement(null);
    addToast('Elemento eliminado', 'success');
  };

  const handleDuplicateElement = (elementId) => {
    const element = elements.find(el => el.id === elementId);
    if (element) {
      const newElement = { ...element, id: generateId(), x: element.x + 20, y: element.y + 20 };
      const newElements = [...elements, newElement];
      setElements(newElements);
      saveToHistory(newElements);
      setSelectedElement(newElement.id);
      addToast('Elemento duplicado', 'success');
    }
  };

  const handleCopyElement = (elementId) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    setCopiedElement(element);
    addToast('Elemento copiado', 'success');
  };

  const handlePasteElement = () => {
    if (!copiedElement) return;
    const newElement = { ...copiedElement, id: generateId(), x: copiedElement.x + 20, y: copiedElement.y + 20 };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
    addToast('Elemento pegado', 'success');
  };

  const handleMoveLayer = (elementId, direction) => {
    const currentIndex = elements.findIndex(el => el.id === elementId);
    if (currentIndex === -1) return;

    const nextElements = [...elements];
    const [element] = nextElements.splice(currentIndex, 1);
    let targetIndex = currentIndex;

    if (direction === 'front') targetIndex = nextElements.length;
    if (direction === 'back') targetIndex = 0;
    if (direction === 'forward') targetIndex = Math.min(nextElements.length, currentIndex + 1);
    if (direction === 'backward') targetIndex = Math.max(0, currentIndex - 1);

    nextElements.splice(targetIndex, 0, element);
    setElements(nextElements);
    saveToHistory(nextElements);
    setSelectedElement(elementId);
  };

  const updateElementProperty = (property, value) => {
    const newElements = elements.map(el => 
      el.id === selectedElement ? { ...el, [property]: value } : el
    );
    setElements(newElements);
  };

  const updateElementAndSave = (property, value) => {
    updateElementProperty(property, value);
    saveToHistory(elements.map(el => 
      el.id === selectedElement ? { ...el, [property]: value } : el
    ));
  };

  const renderDynamicText = (type, props) => {
    const mockData = {
      company_name: 'Sterling Architecture LLC',
      company_rnc: '901.442.883-4',
      company_address: '448 S Hill St, Suite 601, LA',
      invoice_number: '#INV-2024-001',
      invoice_date: '24/03/2026',
      client_name: 'Cliente Demo',
      client_rnc: '123-456-789-0',
      subtotal: '$1,000.00',
      itbis: '$180.00',
      total: '$1,180.00',
    };
    return mockData[type] || type;
  };

  const renderElement = (element) => {
    const isSelected = selectedElement === element.id;
    const baseStyle = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      cursor: isDragging && selectedElement === element.id ? 'grabbing' : 'grab',
    };

    const SelectionBox = () => isSelected ? (
      <div className="absolute -inset-2 border-2 border-primary border-dashed pointer-events-none">
        <div className="absolute -top-10 left-0 flex items-center gap-1 rounded-lg bg-surface-container-lowest border border-outline-variant/20 shadow-lg p-1 pointer-events-auto">
          <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => handleCopyElement(element.id)} className="p-1 rounded hover:bg-surface-container-high" title="Copiar">
            <span className="material-symbols-outlined text-sm">content_copy</span>
          </button>
          <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => handleDuplicateElement(element.id)} className="p-1 rounded hover:bg-surface-container-high" title="Duplicar">
            <span className="material-symbols-outlined text-sm">control_point_duplicate</span>
          </button>
          <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => handleMoveLayer(element.id, 'backward')} className="p-1 rounded hover:bg-surface-container-high" title="Enviar atras">
            <span className="material-symbols-outlined text-sm">flip_to_back</span>
          </button>
          <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => handleMoveLayer(element.id, 'forward')} className="p-1 rounded hover:bg-surface-container-high" title="Traer adelante">
            <span className="material-symbols-outlined text-sm">flip_to_front</span>
          </button>
          <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => handleDeleteElement(element.id)} className="p-1 rounded hover:bg-error-container hover:text-on-error-container" title="Eliminar">
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, 'se')} />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full" />
      </div>
    ) : null;

    switch (element.type) {
      case ELEMENT_TYPES.TEXT:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              fontSize: element.fontSize,
              fontWeight: element.fontWeight,
              color: element.color,
              textAlign: element.align,
              whiteSpace: 'pre-wrap',
            }}
            className="select-none"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            {element.text}
            <SelectionBox />
          </div>
        );

      case ELEMENT_TYPES.BOX:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              width: element.width,
              height: element.height,
              fontSize: element.fontSize,
              backgroundColor: element.backgroundColor,
              border: `${element.borderWidth}px solid ${element.borderColor}`,
              borderRadius: 4,
              padding: element.padding,
              color: element.color || '#2a3439',
            }}
            className="select-none overflow-hidden"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            {element.text}
            <SelectionBox />
          </div>
        );

      case ELEMENT_TYPES.IMAGE:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              width: element.width,
              height: element.height,
            }}
            className="select-none"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            {element.src ? (
              <img src={element.src} alt="" style={{ width: '100%', height: '100%', objectFit: element.objectFit }} />
            ) : (
              <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 bg-surface-container-low">
                <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                <span className="text-xs">Subir</span>
              </div>
            )}
            <SelectionBox />
          </div>
        );

      case ELEMENT_TYPES.LINE:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              width: element.width || 300,
              height: element.thickness,
              backgroundColor: element.color,
            }}
            className="select-none"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <SelectionBox />
          </div>
        );

      case ELEMENT_TYPES.SPACER:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              height: element.height,
              width: '100%',
            }}
            className="select-none"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <div className="h-full w-full bg-surface-container" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #e8eff3 5px, #e8eff3 10px)' }}>
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant bg-surface px-1">{element.height}px</div>
            </div>
            <SelectionBox />
          </div>
        );

      case ELEMENT_TYPES.RECTANGLE:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              width: element.width,
              height: element.height,
              backgroundColor: element.fillColor,
              border: `${element.borderWidth}px solid ${element.borderColor}`,
              borderRadius: element.borderRadius,
            }}
            className="select-none"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <SelectionBox />
          </div>
        );

      case ELEMENT_TYPES.CIRCLE:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              width: element.size,
              height: element.size,
              backgroundColor: element.fillColor,
              border: `${element.borderWidth}px solid ${element.borderColor}`,
              borderRadius: '50%',
            }}
            className="select-none"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <SelectionBox />
          </div>
        );

      case ELEMENT_TYPES.TABLE:
        return (
          <div
            key={element.id}
            style={{ ...baseStyle, width: element.width || '100%' }}
            className="select-none"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  {element.headers?.map((h, i) => (
                    <th key={i} className="bg-primary-container text-primary p-2 text-left font-semibold border border-outline">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array(element.rows).fill(null).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {Array(element.columns).fill(null).map((_, colIdx) => (
                      <td key={colIdx} className="p-2 border border-outline text-center">-</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <SelectionBox />
          </div>
        );

      case ELEMENT_TYPES.QR:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              width: element.size,
              height: element.size,
            }}
            className="select-none"
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <div className="w-full h-full bg-surface-container p-1 rounded-lg">
              <div className="w-full aspect-square bg-primary/10 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-primary">qr_code_2</span>
              </div>
              <div className="text-[8px] text-center mt-1 text-on-surface-variant">{element.value}</div>
            </div>
            <SelectionBox />
          </div>
        );

      default:
        if (element.type.startsWith('company_') || element.type.startsWith('invoice_') || element.type.startsWith('client_') || element.type.startsWith('subtotal') || element.type.startsWith('itbis') || element.type.startsWith('total')) {
          return (
            <div
              key={element.id}
              style={{
                ...baseStyle,
                fontSize: element.fontSize,
                fontWeight: element.fontWeight,
                color: element.color,
              }}
              className="select-none text-placeholder"
              onMouseDown={(e) => handleElementMouseDown(e, element.id)}
            >
              {`{{ ${element.type} }}`}
            </div>
          );
        }
        return null;
    }
  };

  const selectedEl = elements.find(el => el.id === selectedElement);

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex justify-between items-center px-6 py-4 bg-surface-container border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-headline text-2xl font-extrabold text-on-surface">Diseñador de Facturas</h1>
            <p className="text-on-surface-variant text-sm">Arrastra, redimensiona y personaliza</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30"
            title="Deshacer (Ctrl+Z)"
          >
            <span className="material-symbols-outlined">undo</span>
          </button>
          <button
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30"
            title="Rehacer (Ctrl+Y)"
          >
            <span className="material-symbols-outlined">redo</span>
          </button>

          <button
            onClick={() => selectedElement && handleCopyElement(selectedElement)}
            disabled={!selectedElement}
            className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30"
            title="Copiar elemento"
          >
            <span className="material-symbols-outlined">content_copy</span>
          </button>
          <button
            onClick={handlePasteElement}
            disabled={!copiedElement}
            className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30"
            title="Pegar elemento"
          >
            <span className="material-symbols-outlined">content_paste</span>
          </button>
          <button
            onClick={() => selectedElement && handleDuplicateElement(selectedElement)}
            disabled={!selectedElement}
            className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30"
            title="Duplicar elemento"
          >
            <span className="material-symbols-outlined">control_point_duplicate</span>
          </button>
          <button
            onClick={() => selectedElement && handleMoveLayer(selectedElement, 'backward')}
            disabled={!selectedElement}
            className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30"
            title="Enviar atrás"
          >
            <span className="material-symbols-outlined">flip_to_back</span>
          </button>
          <button
            onClick={() => selectedElement && handleMoveLayer(selectedElement, 'forward')}
            disabled={!selectedElement}
            className="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30"
            title="Traer adelante"
          >
            <span className="material-symbols-outlined">flip_to_front</span>
          </button>
          
          <div className="h-6 w-px bg-outline-variant/20 mx-2" />
          
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg ${showGrid ? 'bg-primary-container text-primary' : 'hover:bg-surface-container-high'}`}
            title="Mostrar/Mostrar cuadrícula"
          >
            <span className="material-symbols-outlined">grid_on</span>
          </button>
          
          <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1.5 hover:bg-surface-container rounded"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <span className="text-xs font-medium w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="p-1.5 hover:bg-surface-container rounded"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>

          <select
            value={currentTemplateId || ''}
            onChange={(e) => {
              const template = savedTemplates.find(t => t.id === e.target.value);
              if (template) handleLoadTemplate(template);
            }}
            className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm min-w-[180px]"
          >
            <option value="">Mis plantillas...</option>
            {savedTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-sm flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">palette</span>
            Plantillas
          </button>

          <button
            onClick={() => { setElements([]); setSelectedElement(null); setCurrentTemplateId(null); saveToHistory([]); addToast('Lienzo limpiado', 'success'); }}
            className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
            Limpiar
          </button>
          
          <button
            onClick={() => {
              if (currentTemplateId) {
                const template = savedTemplates.find(t => t.id === currentTemplateId);
                setTemplateName(template?.nombre || '');
              } else {
                setTemplateName('');
              }
              setShowSaveModal(true);
            }}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-dim text-on-primary font-semibold shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Guardar
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-surface-container flex flex-col overflow-hidden">
          <div className="p-3 border-b border-outline-variant/10">
            <h3 className="font-semibold text-on-surface text-sm">Elementos</h3>
            <p className="text-xs text-on-surface-variant">Arrastra al lienzo</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {TOOLBOX_CATEGORIES.map((category) => (
              <div key={category.name}>
                <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">{category.name}</h4>
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      className="flex items-center gap-3 p-2.5 bg-surface-container-lowest rounded-lg cursor-grab hover:bg-primary-container hover:text-primary transition-all text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div 
          className="flex-1 bg-surface overflow-auto relative"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedElement(null);
          }}
        >
          <div className="min-w-[595px] min-h-[842px] flex justify-center p-8">
            <div
              ref={canvasRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedElement(null);
              }}
              className="bg-white shadow-lg relative"
              style={{
                width: 595,
                height: 842,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                backgroundImage: showGrid ? `
                  linear-gradient(to right, #f0f0f0 1px, transparent 1px),
                  linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)
                ` : 'none',
                backgroundSize: `${SNAP_GRID * (zoom / 100)}px ${SNAP_GRID * (zoom / 100)}px`,
              }}
            >
              {elements.map((element) => renderElement(element))}
              
              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="w-full max-w-md text-center">
                    <span className="material-symbols-outlined text-7xl mb-4 opacity-20 text-primary">dashboard_customize</span>
                    <p className="text-xl font-bold text-on-surface">Elige una base para empezar</p>
                    <p className="text-sm text-on-surface-variant mt-1">Usa una plantilla y luego copia, duplica o mueve sus piezas.</p>
                    <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                      {PLANTILLAS_PREDEFINIDAS.slice(0, 4).map((plantilla) => (
                        <button
                          key={plantilla.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            applyTemplateElements(plantilla.elements, {
                              activeTemplate: plantilla.id,
                              message: `Plantilla "${plantilla.nombre}" aplicada`,
                            });
                          }}
                          className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-3 text-left hover:border-primary hover:shadow-md transition-all"
                        >
                          <span className="block h-2 w-10 rounded-full mb-3" style={{ backgroundColor: plantilla.color }} />
                          <span className="block text-sm font-bold text-on-surface">{plantilla.nombre}</span>
                          <span className="block text-xs text-on-surface-variant truncate">{plantilla.descripcion}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPreviewModal(true);
                      }}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
                    >
                      <span className="material-symbols-outlined text-base">palette</span>
                      Ver todas las plantillas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedEl && (
          <div className="w-72 bg-surface-container border-l border-outline-variant/10 overflow-y-auto">
            <div className="p-4 border-b border-outline-variant/10">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-on-surface">Propiedades</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopyElement(selectedElement)}
                    className="p-1.5 hover:bg-surface-container rounded"
                    title="Copiar"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                  </button>
                  <button
                    onClick={() => handleMoveLayer(selectedElement, 'backward')}
                    className="p-1.5 hover:bg-surface-container rounded"
                    title="Enviar atras"
                  >
                    <span className="material-symbols-outlined text-sm">flip_to_back</span>
                  </button>
                  <button
                    onClick={() => handleMoveLayer(selectedElement, 'forward')}
                    className="p-1.5 hover:bg-surface-container rounded"
                    title="Traer adelante"
                  >
                    <span className="material-symbols-outlined text-sm">flip_to_front</span>
                  </button>
                  <button
                    onClick={() => handleDuplicateElement(selectedElement)}
                    className="p-1.5 hover:bg-surface-container rounded"
                    title="Duplicar"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                  </button>
                  <button
                    onClick={() => handleDeleteElement(selectedElement)}
                    className="p-1.5 hover:bg-error-container text-error rounded"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {(selectedEl.type === ELEMENT_TYPES.TEXT || selectedEl.type === 'company_name' || selectedEl.type === 'invoice_number' || selectedEl.type === 'total') && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Texto</label>
                  <textarea
                    value={selectedEl.text || ''}
                    onChange={(e) => updateElementProperty('text', e.target.value)}
                    onBlur={() => saveToHistory(elements)}
                    className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                    rows={3}
                  />
                </div>
              )}

              {(selectedEl.type === ELEMENT_TYPES.TEXT || selectedEl.type === ELEMENT_TYPES.BOX || selectedEl.type.startsWith('company_') || selectedEl.type.startsWith('invoice_') || selectedEl.type.startsWith('client_') || selectedEl.type.startsWith('subtotal') || selectedEl.type.startsWith('itbis') || selectedEl.type.startsWith('total')) && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Tamaño</label>
                      <input
                        type="number"
                        value={selectedEl.fontSize || 14}
                        onChange={(e) => updateElementProperty('fontSize', parseInt(e.target.value))}
                        onBlur={() => saveToHistory(elements)}
                        className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                        min={6}
                        max={72}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Peso</label>
                      <select
                        value={selectedEl.fontWeight || 'normal'}
                        onChange={(e) => { updateElementProperty('fontWeight', e.target.value); saveToHistory(elements); }}
                        className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="lighter">Light</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedEl.color || '#000000'}
                        onChange={(e) => updateElementProperty('color', e.target.value)}
                        onBlur={() => saveToHistory(elements)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedEl.color || '#000000'}
                        onChange={(e) => updateElementProperty('color', e.target.value)}
                        onBlur={() => saveToHistory(elements)}
                        className="flex-1 p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {(selectedEl.type === ELEMENT_TYPES.TEXT || selectedEl.type === ELEMENT_TYPES.BOX) && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Alineación</label>
                  <div className="flex bg-surface-container-low rounded-lg p-1">
                    {['left', 'center', 'right'].map((align) => (
                      <button
                        key={align}
                        onClick={() => { updateElementProperty('align', align); saveToHistory(elements); }}
                        className={`flex-1 p-2 rounded ${(selectedEl.align || 'left') === align ? 'bg-primary text-white' : ''}`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {align === 'left' ? 'format_align_left' : align === 'center' ? 'format_align_center' : 'format_align_right'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selectedEl.type === ELEMENT_TYPES.IMAGE || selectedEl.type === ELEMENT_TYPES.RECTANGLE || selectedEl.type === ELEMENT_TYPES.BOX) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Ancho</label>
                    <input
                      type="number"
                      value={selectedEl.width || 100}
                      onChange={(e) => updateElementProperty('width', parseInt(e.target.value))}
                      onBlur={() => saveToHistory(elements)}
                      className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                    />
                  </div>
                  {(selectedEl.type !== ELEMENT_TYPES.IMAGE || selectedEl.type === ELEMENT_TYPES.BOX) && (
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Alto</label>
                      <input
                        type="number"
                        value={selectedEl.height || 50}
                        onChange={(e) => updateElementProperty('height', parseInt(e.target.value))}
                        onBlur={() => saveToHistory(elements)}
                        className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {(selectedEl.type === ELEMENT_TYPES.RECTANGLE || selectedEl.type === ELEMENT_TYPES.CIRCLE || selectedEl.type === ELEMENT_TYPES.BOX) && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Color de relleno</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedEl.fillColor || selectedEl.backgroundColor || '#ffffff'}
                        onChange={(e) => { updateElementProperty('fillColor', e.target.value); updateElementProperty('backgroundColor', e.target.value); }}
                        onBlur={() => saveToHistory(elements)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedEl.fillColor || selectedEl.backgroundColor || '#ffffff'}
                        onChange={(e) => { updateElementProperty('fillColor', e.target.value); updateElementProperty('backgroundColor', e.target.value); }}
                        onBlur={() => saveToHistory(elements)}
                        className="flex-1 p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Color de borde</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedEl.borderColor || '#000000'}
                        onChange={(e) => updateElementProperty('borderColor', e.target.value)}
                        onBlur={() => saveToHistory(elements)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedEl.borderColor || '#000000'}
                        onChange={(e) => updateElementProperty('borderColor', e.target.value)}
                        onBlur={() => saveToHistory(elements)}
                        className="flex-1 p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Grosor de borde</label>
                    <input
                      type="number"
                      value={selectedEl.borderWidth || 0}
                      onChange={(e) => updateElementProperty('borderWidth', parseInt(e.target.value))}
                      onBlur={() => saveToHistory(elements)}
                      className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                      min={0}
                      max={10}
                    />
                  </div>
                </>
              )}

              {selectedEl.type === ELEMENT_TYPES.LINE && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Color</label>
                    <input
                      type="color"
                      value={selectedEl.color || '#000000'}
                      onChange={(e) => updateElementProperty('color', e.target.value)}
                      onBlur={() => saveToHistory(elements)}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Grosor</label>
                      <input
                        type="number"
                        value={selectedEl.thickness || 1}
                        onChange={(e) => updateElementProperty('thickness', parseInt(e.target.value))}
                        onBlur={() => saveToHistory(elements)}
                        className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                        min={1}
                        max={10}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Ancho</label>
                      <input
                        type="number"
                        value={selectedEl.width || 300}
                        onChange={(e) => updateElementProperty('width', parseInt(e.target.value))}
                        onBlur={() => saveToHistory(elements)}
                        className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedEl.type === ELEMENT_TYPES.SPACER && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Altura</label>
                  <input
                    type="number"
                    value={selectedEl.height || 30}
                    onChange={(e) => updateElementProperty('height', parseInt(e.target.value))}
                    onBlur={() => saveToHistory(elements)}
                    className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                    min={5}
                    max={200}
                  />
                </div>
              )}

              {selectedEl.type === ELEMENT_TYPES.QR && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Valor NCF</label>
                    <input
                      type="text"
                      value={selectedEl.value || ''}
                      onChange={(e) => updateElementProperty('value', e.target.value)}
                      onBlur={() => saveToHistory(elements)}
                      className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Tamaño</label>
                    <input
                      type="number"
                      value={selectedEl.size || 80}
                      onChange={(e) => updateElementProperty('size', parseInt(e.target.value))}
                      onBlur={() => saveToHistory(elements)}
                      className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                      min={40}
                      max={200}
                    />
                  </div>
                </>
              )}

              {selectedEl.type === ELEMENT_TYPES.TABLE && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Columnas</label>
                      <input
                        type="number"
                        value={selectedEl.columns || 4}
                        onChange={(e) => updateElementProperty('columns', parseInt(e.target.value))}
                        onBlur={() => saveToHistory(elements)}
                        className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                        min={1}
                        max={6}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Filas</label>
                      <input
                        type="number"
                        value={selectedEl.rows || 5}
                        onChange={(e) => updateElementProperty('rows', parseInt(e.target.value))}
                        onBlur={() => saveToHistory(elements)}
                        className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                        min={1}
                        max={20}
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedEl.type === ELEMENT_TYPES.CIRCLE && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Tamaño</label>
                  <input
                    type="number"
                    value={selectedEl.size || 60}
                    onChange={(e) => updateElementProperty('size', parseInt(e.target.value))}
                    onBlur={() => saveToHistory(elements)}
                    className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                    min={20}
                    max={200}
                  />
                </div>
              )}

              <div className="pt-4 border-t border-outline-variant/10">
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Posición</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-on-surface-variant">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedEl.x)}
                      onChange={(e) => updateElementProperty('x', parseInt(e.target.value))}
                      onBlur={() => saveToHistory(elements)}
                      className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-on-surface-variant">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedEl.y)}
                      onChange={(e) => updateElementProperty('y', parseInt(e.target.value))}
                      onBlur={() => saveToHistory(elements)}
                      className="w-full p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-4">
              {currentTemplateId ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2">Nombre de la plantilla</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Mi plantilla de facturas"
                  className="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface"
                  autoFocus
                />
              </div>
              {savedTemplates.length > 0 && !currentTemplateId && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">O reemplazar existente</label>
                  <select
                    onChange={(e) => {
                      const template = savedTemplates.find(t => t.id === e.target.value);
                      if (template) {
                        setCurrentTemplateId(template.id);
                        setTemplateName(template.nombre);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface"
                  >
                    <option value="">Seleccionar...</option>
                    {savedTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowSaveModal(false); setTemplateName(''); }}
                className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-dim text-on-primary font-semibold"
              >
                {currentTemplateId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8">
          <div className="bg-surface-container rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant/20">
              <div>
                <h2 className="font-headline text-xl font-bold text-on-surface">Elige una Plantilla</h2>
                <p className="text-sm text-on-surface-variant">Selecciona un diseño para tu factura</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-surface-container-high rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {savedTemplates.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-headline text-lg font-bold text-on-surface mb-3">Mis plantillas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedTemplates.map((template) => (
                      <div key={template.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-on-surface">{template.nombre}</p>
                            <p className="text-xs text-on-surface-variant">Plantilla guardada</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1.5 rounded-lg hover:bg-error-container hover:text-on-error-container"
                            title="Eliminar"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => handleLoadTemplate(template)}
                            className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              applyTemplateElements(getSavedTemplateElements(template), {
                                clone: true,
                                name: `${template.nombre} copia`,
                                message: `Copia de "${template.nombre}" lista para editar`,
                              });
                            }}
                            className="flex-1 rounded-lg bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-highest"
                          >
                            Duplicar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="font-headline text-lg font-bold text-on-surface mb-3">Plantillas base</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {PLANTILLAS_PREDEFINIDAS.map((plantilla) => (
                  <div
                    key={plantilla.id}
                    className="bg-white rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all shadow-md hover:shadow-lg group"
                  >
                    <div className="h-40 bg-gray-100 relative overflow-hidden" style={{ backgroundColor: plantilla.color + '10' }}>
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <div 
                          className="w-32 h-44 bg-white shadow-lg rounded relative overflow-hidden"
                          style={{ transform: 'scale(0.35)', transformOrigin: 'center' }}
                        >
                          {plantilla.elements.slice(0, 8).map((el, idx) => {
                            if (el.type === 'company_name' || el.type === ELEMENT_TYPES.TEXT) {
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    position: 'absolute',
                                    left: el.x / 3,
                                    top: el.y / 3,
                                    fontSize: (el.fontSize || 10) / 3,
                                    fontWeight: el.fontWeight,
                                    color: el.color,
                                    width: el.width ? el.width / 3 : 'auto',
                                    textAlign: el.align
                                  }}
                                >
                                  {el.text || 'Texto'}
                                </div>
                              );
                            }
                            if (el.type === ELEMENT_TYPES.RECTANGLE) {
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    position: 'absolute',
                                    left: el.x / 3,
                                    top: el.y / 3,
                                    width: el.width / 3,
                                    height: el.height / 3,
                                    backgroundColor: el.fillColor,
                                  }}
                                />
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                      <div 
                        className="absolute bottom-0 left-0 right-0 py-1 px-2 text-white text-xs font-medium opacity-90"
                        style={{ backgroundColor: plantilla.color }}
                      >
                        {plantilla.nombre}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-on-surface-variant">{plantilla.descripcion}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            applyTemplateElements(plantilla.elements, {
                              activeTemplate: plantilla.id,
                              message: `Plantilla "${plantilla.nombre}" aplicada`,
                            });
                          }}
                          className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary"
                        >
                          Usar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            applyTemplateElements(plantilla.elements, {
                              clone: true,
                              activeTemplate: `${plantilla.id}-copy`,
                              name: `${plantilla.nombre} copia`,
                              message: `Copia de "${plantilla.nombre}" lista para editar`,
                            });
                          }}
                          className="flex-1 rounded-lg bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-highest"
                        >
                          Duplicar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
