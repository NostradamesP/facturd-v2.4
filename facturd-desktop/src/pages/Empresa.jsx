import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { empresaService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { usePageTitle } from '../hooks/usePageTitle';
import { TableSkeleton } from '../components/Skeleton';

export default function Empresa() {
  const { t, i18n } = useTranslation();
  usePageTitle(t('Empresa'));
  const { user, empresa, updateEmpresa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    rnc: '',
    direccion: '',
    telefono: '',
    email: '',
    idioma: 'es',
    nombre_sistema: '',
    logo_url: '',
  });
  const [originalData, setOriginalData] = useState({});
  const { addToast } = useToast();

  useEffect(() => {
    if (user) {
      fetchEmpresa();
    }
  }, [user]);

  const fetchEmpresa = async () => {
    try {
      const res = await empresaService.get();
      if (res.data) {
        const data = {
          nombre: res.data.nombre || '',
          rnc: res.data.rnc || '',
          direccion: res.data.direccion || '',
          telefono: res.data.telefono || '',
          email: res.data.email || '',
          idioma: res.data.idioma || 'es',
          nombre_sistema: res.data.nombre_sistema || '',
          logo_url: res.data.logo_url || '',
        };
        setFormData(data);
        setOriginalData(data);
      }
    } catch (error) {
      console.error('Error fetching empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
        setFormData(prev => ({ ...prev, logo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDiscard = () => {
    setFormData(originalData);
    setLogo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await empresaService.update(formData);
      updateEmpresa(res.data);
      setOriginalData(formData);
      setLogo(null);
      localStorage.setItem('facturd_empresa_branding', JSON.stringify({
        nombre_sistema: formData.nombre_sistema,
        logo_url: formData.logo_url,
        nombre: formData.nombre,
      }));
      addToast(t('Empresa actualizada correctamente'), 'success');
    } catch (error) {
      console.error('Error updating empresa:', error);
      addToast(error.response?.data?.detail || t('Error al actualizar empresa'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6"><TableSkeleton rows={5} cols={5} /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
          {t('Company Settings')}
        </h2>
        <p className="text-on-surface-variant max-w-2xl leading-relaxed">
          {t('Manage your legal identity and fiscal information. These details will be automatically formatted and displayed on all generated invoices and reports.')}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 lg:col-span-7 space-y-8">
          <section className="bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{t('Company Brand')}</span>
                <div className="flex items-center gap-8">
                  <label className="w-32 h-32 rounded-xl bg-surface-container-low border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-on-surface-variant hover:border-primary/50 hover:bg-primary-container/10 transition-all cursor-pointer group">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    {logo ? (
                      <img src={logo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-3xl mb-1 group-hover:scale-110 transition-transform">add_a_photo</span>
                        <span className="text-[10px] font-bold">{t('UPLOAD LOGO')}</span>
                      </>
                    )}
                  </label>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface mb-1">{t('Upload your official logo')}</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{t('Recommended size 400x400px. Supports PNG, JPG, and SVG. Max file size 2MB.')}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-outline-variant/10"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Legal Name')}</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Tax ID (RNC)')}</label>
                  <input
                    type="text"
                    value={formData.rnc}
                    onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Physical Address')}</label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Primary Phone')}</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Business Email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('System Name')}</label>
                  <input
                    type="text"
                    value={formData.nombre_sistema}
                    onChange={(e) => setFormData({ ...formData, nombre_sistema: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                    placeholder="Ej: Mi Sistema de Facturación"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-2">{t('Idioma')}</label>
                  <select
                    value={formData.idioma}
                    onChange={(e) => setFormData({ ...formData, idioma: e.target.value })}
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant/20 focus:ring-0 focus:border-primary px-0 py-2 text-on-surface font-medium transition-colors"
                  >
                    <option value="es">{t('Español')}</option>
                    <option value="en">{t('Inglés')}</option>
                  </select>
                </div>
              </div>

              <div className="pt-8 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="px-6 py-3 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  {t('Discard Changes')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-dim shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? t('Saving...') : t('Save Profile')}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('Live Invoice Preview')}</span>
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{t('Updating Real-time')}</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-10 shadow-[0px_40px_80px_rgba(42,52,57,0.08)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100%]"></div>
            <div className="flex justify-between items-start mb-16 relative z-10">
              <div>
                {logo ? (
                  <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain mb-6" />
                ) : (
                  <div className="w-16 h-16 bg-on-surface rounded-xl flex items-center justify-center text-white mb-6">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      business
                    </span>
                  </div>
                )}
                <h3 className="font-headline font-extrabold text-xl text-on-surface leading-tight">
                  {formData.nombre || 'Your Company Name'}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">Tax ID: {formData.rnc || 'XXX-XXXXXX-X'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-60">{t('INVOICE')}</span>
                <p className="font-headline font-bold text-2xl text-on-surface tracking-tighter mt-1">#INV-0001</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-10 mb-16 border-t border-outline-variant/10 pt-8">
              <div>
                <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">{t('Office Address')}</h4>
                    <p className="text-sm text-on-surface leading-relaxed max-w-full">
                  {formData.direccion || 'Your address here'}
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">{t('Contact Details')}</h4>
                <p className="text-sm text-on-surface mb-1">{formData.telefono || '+1 (555) 000-0000'}</p>
                <p className="text-sm text-on-surface underline decoration-primary/30 underline-offset-4">
                  {formData.email || 'email@company.com'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/5">
                <span className="w-32 h-3 bg-surface-container-high rounded-full"></span>
                <span className="w-16 h-3 bg-surface-container-high rounded-full"></span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/5">
                <span className="w-24 h-3 bg-surface-container-high rounded-full"></span>
                <span className="w-12 h-3 bg-surface-container-high rounded-full"></span>
              </div>
              <div className="flex justify-between items-center pt-8">
                <span className="text-sm font-bold text-on-surface">{t('TOTAL')}</span>
                <span className="text-lg font-headline font-extrabold text-primary">$0.00</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
