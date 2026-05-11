import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/facturas', label: 'Facturas', icon: 'receipt_long' },
  { path: '/diseno', label: 'Diseño', icon: 'design_services' },
  { path: '/clientes', label: 'Clientes', icon: 'group' },
  { path: '/proveedores', label: 'Proveedores', icon: 'store' },
  { path: '/inventario', label: 'Inventario', icon: 'inventory_2' },
  { path: '/cobros', label: 'Cobros', icon: 'payments' },
  { path: '/reportes', label: 'Reportes', icon: 'analytics' },
  { path: '/empresa', label: 'Empresa', icon: 'settings' },
];

const defaultBrand = {
  primary: '#0056d2',
  surface: '#f7f9fb',
  sidebar: '#e8eff3',
  text: '#2a3439',
};

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

const mix = (hex, target, weight) => {
  const from = hexToRgb(hex);
  const to = hexToRgb(target);
  return rgbToHex({
    r: from.r * (1 - weight) + to.r * weight,
    g: from.g * (1 - weight) + to.g * weight,
    b: from.b * (1 - weight) + to.b * weight,
  });
};

const applyBrand = (brand) => {
  const root = document.documentElement;
  const surfaceContainer = brand.sidebar;
  root.style.setProperty('--color-primary', brand.primary);
  root.style.setProperty('--color-primary-dim', mix(brand.primary, '#000000', 0.12));
  root.style.setProperty('--color-on-primary', '#ffffff');
  root.style.setProperty('--color-primary-container', mix(brand.primary, '#ffffff', 0.84));
  root.style.setProperty('--color-on-primary-container', mix(brand.primary, '#000000', 0.12));
  root.style.setProperty('--color-surface', brand.surface);
  root.style.setProperty('--color-background', brand.surface);
  root.style.setProperty('--color-surface-bright', brand.surface);
  root.style.setProperty('--color-surface-container', surfaceContainer);
  root.style.setProperty('--color-surface-container-low', mix(surfaceContainer, '#ffffff', 0.35));
  root.style.setProperty('--color-surface-container-high', mix(surfaceContainer, '#000000', 0.05));
  root.style.setProperty('--color-surface-container-highest', mix(surfaceContainer, '#000000', 0.09));
  root.style.setProperty('--color-surface-container-lowest', mix(brand.surface, '#ffffff', 0.78));
  root.style.setProperty('--color-on-surface', brand.text);
  root.style.setProperty('--color-on-background', brand.text);
  root.style.setProperty('--color-on-surface-variant', mix(brand.text, '#ffffff', 0.34));
};

export default function Sidebar({ isOpen = true, onClose }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [brand, setBrand] = useState(defaultBrand);
  const [brandOpen, setBrandOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('facturd_brand_settings');
    const nextBrand = saved ? { ...defaultBrand, ...JSON.parse(saved) } : defaultBrand;
    setBrand(nextBrand);
    applyBrand(nextBrand);
  }, []);

  const updateBrand = (key, value) => {
    const nextBrand = { ...brand, [key]: value };
    setBrand(nextBrand);
    localStorage.setItem('facturd_brand_settings', JSON.stringify(nextBrand));
    applyBrand(nextBrand);
  };

  const resetBrand = () => {
    setBrand(defaultBrand);
    localStorage.removeItem('facturd_brand_settings');
    applyBrand(defaultBrand);
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      <aside className={`
        fixed lg:relative lg:left-0 top-0 h-full w-64 bg-surface-container border-r border-outline-variant/20 flex flex-col py-5 gap-y-1 z-50
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:translate-x-0
      `}>
        <div className="px-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-lg text-on-primary flex-shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance
              </span>
            </div>
            <div>
              <h1 className="font-headline text-lg font-extrabold text-on-surface leading-tight">
                FactuRD
              </h1>
              <p className="text-xs text-on-surface-variant font-medium opacity-70">
                Premium ERP
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-y-1 overflow-y-auto px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-4 py-3 px-6 lg:px-8 transition-all duration-300 group ${
                  isActive
                    ? 'text-on-surface bg-surface-container-lowest rounded-lg shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg'
                }`
              }
            >
              <span className={`material-symbols-outlined group-hover:scale-110 transition-transform ${location.pathname === item.path ? 'text-primary' : ''}`}
                    style={location.pathname === item.path ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className="font-headline font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-y-1 px-3">
          <a 
            href="mailto:soporte@facturd.com" 
            className="flex items-center gap-4 text-on-surface-variant hover:text-on-surface px-6 py-3 transition-all duration-300 hover:bg-surface-container-high rounded-lg group"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">contact_support</span>
            <span className="font-headline font-medium text-sm">Soporte</span>
          </a>
          <button
            onClick={() => { logout(); if (onClose) onClose(); }}
            className="flex items-center gap-4 text-on-surface-variant hover:text-on-surface px-6 py-3 transition-all duration-300 hover:bg-surface-container-high rounded-lg group"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">logout</span>
            <span className="font-headline font-medium text-sm">Salir</span>
          </button>
          <div className="mt-3 rounded-xl bg-surface-container-low border border-outline-variant/20 p-3">
            <button
              type="button"
              onClick={() => setBrandOpen(!brandOpen)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="flex items-center gap-3 text-on-surface">
                <span className="material-symbols-outlined text-primary">palette</span>
                <span className="font-headline text-sm font-bold">Ajustes de marca</span>
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-lg">
                {brandOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {brandOpen && (
              <div className="mt-4 space-y-3">
                {[
                  ['primary', 'Color principal'],
                  ['surface', 'Fondo'],
                  ['sidebar', 'Menu lateral'],
                  ['text', 'Texto'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-xs font-semibold text-on-surface-variant">
                    <span>{label}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase">{brand[key]}</span>
                      <input
                        type="color"
                        value={brand[key]}
                        onChange={(e) => updateBrand(key, e.target.value)}
                        className="h-7 w-8 cursor-pointer rounded border border-outline-variant/30 bg-transparent p-0"
                      />
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={resetBrand}
                  className="w-full rounded-lg bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-highest"
                >
                  Restablecer colores
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
