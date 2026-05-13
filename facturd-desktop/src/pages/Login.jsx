import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

function getErrorMessage(err, fallback) {
  const detail = err.response?.data?.detail;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message || fallback).join(', ');
  }
  if (detail && typeof detail === 'object') {
    return detail.msg || detail.message || fallback;
  }

  return fallback;
}

export default function Login() {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [empresaRnc, setEmpresaRnc] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const branding = (() => {
    try {
      return JSON.parse(localStorage.getItem('facturd_empresa_branding') || '{}');
    } catch { return {}; }
  })();

  const sistemaNombre = branding.nombre_sistema || 'FactuRD';
  const sistemaLogo = branding.logo_url;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, t('Error al iniciar sesión')));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await authService.register({
        email,
        password,
        name,
        empresa_rnc: empresaRnc,
        empresa_nombre: empresaNombre,
      });
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, t('Error al registrarse')));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isRegistering ? handleRegister : handleLogin;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-on-primary mx-auto mb-4">
            {sistemaLogo ? (
              <img src={sistemaLogo} alt={sistemaNombre} className="w-10 h-10 object-contain" />
            ) : (
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance_wallet
              </span>
            )}
          </div>
          <h1 className="font-['Manrope'] text-2xl font-extrabold text-[#2a3439]">
            {sistemaNombre}
          </h1>
          <p className="text-on-surface-variant mt-2">{t('Sistema de Facturación DGII')}</p>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-on-surface mb-6">{isRegistering ? t('Crear Cuenta') : t('Iniciar Sesión')}</h2>
          
          {error && (
            <div className="bg-error-container text-on-error-container p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    {t('Nombre')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    required={isRegistering}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    {t('Nombre de Empresa')}
                  </label>
                  <input
                    type="text"
                    value={empresaNombre}
                    onChange={(e) => setEmpresaNombre(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    required={isRegistering}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    {t('RNC')}
                  </label>
                  <input
                    type="text"
                    value={empresaRnc}
                    onChange={(e) => setEmpresaRnc(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    required={isRegistering}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t('Correo Electrónico')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t('Contraseña')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-semibold hover:bg-primary-dim transition-colors disabled:opacity-50"
            >
              {loading ? (isRegistering ? t('Registrando...') : t('Iniciando...')) : (isRegistering ? t('Registrarse') : t('Iniciar Sesión'))}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-on-surface-variant mt-6">
          {isRegistering ? (
            <>{t('¿Ya tienes cuenta?')} <span className="text-primary font-medium cursor-pointer" onClick={() => setIsRegistering(false)}>{t('Inicia sesión')}</span></>
          ) : (
            <>{t('¿No tienes cuenta?')} <span className="text-primary font-medium cursor-pointer" onClick={() => setIsRegistering(true)}>{t('Regístrate')}</span></>
          )}
        </p>
      </div>
    </div>
  );
}
