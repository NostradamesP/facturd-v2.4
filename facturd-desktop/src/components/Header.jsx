import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { empresaService } from '../services/api';

export default function Header({ title, onMenuClick }) {
  const { user, empresa, login } = useAuth();
  const { t, i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);

  const switchLanguage = async (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('facturd_idioma', lang);
    if (empresa?.id) {
      try {
        await empresaService.update({ ...empresa, idioma: lang });
      } catch (e) {
        console.error('Failed to sync language to backend:', e);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur flex justify-between items-center px-4 lg:px-8 py-3 lg:py-4 w-full border-b border-outline-variant/10 font-['Inter'] text-sm antialiased">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 hover:bg-surface-container rounded-lg"
        >
          <span className="material-symbols-outlined text-[#2a3439]">menu</span>
        </button>
        <span className="font-['Manrope'] font-bold text-[#2a3439] tracking-tight text-lg lg:text-xl">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2 lg:gap-6">
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-sm">translate</span>
            {i18n.language === 'en' ? 'EN' : 'ES'}
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/10 py-1 min-w-[120px]">
                <button
                  onClick={() => { switchLanguage('es'); setLangOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-surface-container-high ${i18n.language === 'es' ? 'text-primary' : 'text-on-surface'}`}
                >
                  {t('Español')}
                </button>
                <button
                  onClick={() => { switchLanguage('en'); setLangOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-surface-container-high ${i18n.language === 'en' ? 'text-primary' : 'text-on-surface'}`}
                >
                  {t('Inglés')}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="h-6 lg:h-8 w-px bg-outline-variant opacity-20 hidden lg:block"></div>
        {empresa?.logo_url ? (
          <img
            src={empresa.logo_url}
            alt={empresa.nombre || 'Logo'}
            className="h-8 lg:h-10 w-auto max-w-[120px] object-contain"
          />
        ) : (
          <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm lg:text-base">
            {user?.name?.charAt(0) || 'U'}
          </div>
        )}
        <div className="flex items-center gap-2 lg:gap-3 cursor-pointer group active:opacity-70">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-[#2a3439] leading-none">
              {user?.name || 'Usuario'}
            </p>
            <p className="text-[10px] text-[#566166] font-medium tracking-wider">
              {user?.role?.toUpperCase() || 'ADMIN'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
