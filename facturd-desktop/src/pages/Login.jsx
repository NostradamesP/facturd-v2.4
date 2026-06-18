import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import landingHtml from '../assets/facturdLanding.html?raw';
import landingCss from '../assets/facturdLanding.css?raw';

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

const enterDesktopButton = `
  <button type="button" class="btn-nav facturd-enter-btn" data-auth-open="login">
    <span class="material-symbols-outlined" style="font-size:16px;">person</span>
    Entrar
  </button>
`;

const enterMobileButton = `
  <button type="button" class="facturd-enter-fab" data-auth-open="login" aria-label="Entrar">
    <span class="material-symbols-outlined">person</span>
  </button>
`;

const landingBridgeCss = `
  .facturd-enter-btn {
    display: inline-flex !important;
    align-items: center;
    gap: 8px;
    border: 0;
    cursor: pointer;
    font-family: inherit;
  }
  .facturd-hero-enter {
    cursor: pointer;
    font-family: inherit;
  }
  .facturd-enter-fab {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 120;
    width: 56px;
    height: 56px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: #ffffff;
    color: #121212;
    display: none;
    align-items: center;
    justify-content: center;
    box-shadow: 0 18px 40px rgba(0,0,0,0.25);
    cursor: pointer;
  }
  @media (max-width: 768px) {
    .facturd-enter-fab { display: inline-flex; }
    .facturd-enter-btn { display: none !important; }
  }
`;

const enhancedLandingHtml = `${landingHtml}`
  .replace(
    '<a href="#contact" class="btn-nav">Demo</a>',
    `<a href="#contact" class="btn-nav">Demo</a>${enterDesktopButton}`,
  )
  .replace(
    '<div class="cta-group">',
    `<div class="cta-group">
      <button type="button" class="btn-secondary facturd-hero-enter" data-auth-open="login">Entrar al sistema</button>`,
  ) + enterMobileButton;

export default function Login() {
  const { t } = useTranslation();
  usePageTitle(t('Login'));
  const landingHostRef = useRef(null);
  const landingRootRef = useRef(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [empresaRnc, setEmpresaRnc] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!landingHostRef.current) return;
    if (!landingRootRef.current) {
      landingRootRef.current = landingHostRef.current.attachShadow({ mode: 'open' });
    }

    const root = landingRootRef.current;
    root.innerHTML = `<style>${landingCss}\n${landingBridgeCss}</style>${enhancedLandingHtml}`;

    const navbar = root.getElementById('navbar');
    const mobileToggle = root.getElementById('mobileToggle');
    const navLinks = root.getElementById('navLinks');
    const animated = Array.from(root.querySelectorAll('.animate-on-view'));

    const onScroll = () => navbar?.classList.toggle('scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);

    const toggleMobile = () => {
      mobileToggle?.classList.toggle('active');
      navLinks?.classList.toggle('open');
    };

    mobileToggle?.addEventListener('click', toggleMobile);

    const closeMobile = () => {
      mobileToggle?.classList.remove('active');
      navLinks?.classList.remove('open');
    };

    const navAnchors = Array.from(root.querySelectorAll('#navLinks a'));
    navAnchors.forEach((anchor) => anchor.addEventListener('click', closeMobile));

    const faqCards = Array.from(root.querySelectorAll('#faq .feature-card'));
    const toggleFaq = (event) => event.currentTarget.classList.toggle('expanded');
    faqCards.forEach((card) => card.addEventListener('click', toggleFaq));

    const authTriggers = Array.from(root.querySelectorAll('[data-auth-open]'));
    const openAuth = (event) => {
      const mode = event.currentTarget.getAttribute('data-auth-open');
      setIsRegistering(mode === 'register');
      setAuthOpen(true);
      setError('');
      closeMobile();
    };
    authTriggers.forEach((trigger) => trigger.addEventListener('click', openAuth));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    animated.forEach((element) => observer.observe(element));

    return () => {
      window.removeEventListener('scroll', onScroll);
      mobileToggle?.removeEventListener('click', toggleMobile);
      navAnchors.forEach((anchor) => anchor.removeEventListener('click', closeMobile));
      faqCards.forEach((card) => card.removeEventListener('click', toggleFaq));
      authTriggers.forEach((trigger) => trigger.removeEventListener('click', openAuth));
      animated.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, []);

  const branding = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('facturd_empresa_branding') || '{}');
    } catch {
      return {};
    }
  }, []);

  const sistemaNombre = branding.nombre_sistema || branding.nombre || 'FactuRD';

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

  return (
    <>
      <style>{`
        .facturd-enter-btn {
          display: inline-flex !important;
          align-items: center;
          gap: 8px;
          border: 0;
          cursor: pointer;
          font-family: inherit;
        }
        .facturd-hero-enter {
          cursor: pointer;
          font-family: inherit;
        }
        .facturd-enter-fab {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 120;
          width: 56px;
          height: 56px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: #ffffff;
          color: #121212;
          display: none;
          align-items: center;
          justify-content: center;
          box-shadow: 0 18px 40px rgba(0,0,0,0.25);
          cursor: pointer;
        }
        .facturd-auth-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .facturd-auth-modal {
          width: min(100%, 460px);
          max-height: calc(100vh - 48px);
          overflow-y: auto;
          background: #111111;
          color: #e8e8e8;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.45);
        }
        .facturd-auth-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }
        .facturd-auth-kicker {
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #777;
          margin-bottom: 8px;
        }
        .facturd-auth-title {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }
        .facturd-auth-close {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #fff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .facturd-auth-copy {
          color: #8a8a8a;
          font-size: 0.92rem;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .facturd-auth-error {
          margin-bottom: 16px;
          border: 1px solid rgba(255,99,99,0.2);
          background: rgba(255,99,99,0.12);
          color: #ffd0d0;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 0.88rem;
        }
        .facturd-auth-form {
          display: grid;
          gap: 14px;
        }
        .facturd-auth-form label {
          display: grid;
          gap: 8px;
          font-size: 0.88rem;
          color: #b8b8b8;
        }
        .facturd-auth-input {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          border-radius: 14px;
          padding: 0 14px;
        }
        .facturd-auth-input input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: #fff;
          font: inherit;
          padding: 14px 0;
          box-shadow: none;
        }
        .facturd-auth-input .material-symbols-outlined {
          color: #6f6f6f;
          font-size: 20px;
        }
        .facturd-auth-submit {
          margin-top: 4px;
          border: 0;
          border-radius: 14px;
          background: #ffffff;
          color: #111111;
          font: inherit;
          font-weight: 700;
          padding: 14px 18px;
          cursor: pointer;
        }
        .facturd-auth-toggle {
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #8a8a8a;
          font-size: 0.9rem;
        }
        .facturd-auth-toggle button {
          background: transparent;
          border: 0;
          color: #ffffff;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          box-shadow: none;
          padding: 0;
        }
        @media (max-width: 768px) {
          .facturd-enter-fab { display: inline-flex; }
          .facturd-enter-btn { display: none !important; }
        }
        @media (max-width: 480px) {
          .facturd-auth-overlay { padding: 0; align-items: flex-end; }
          .facturd-auth-modal {
            width: 100%;
            max-height: 92vh;
            border-radius: 24px 24px 0 0;
            padding: 24px 18px 20px;
          }
          .facturd-auth-title { font-size: 1.6rem; }
        }
      `}</style>
      <div ref={landingHostRef} />

      {authOpen && (
        <div className="facturd-auth-overlay" onClick={() => setAuthOpen(false)}>
          <div className="facturd-auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="facturd-auth-head">
              <div>
                <div className="facturd-auth-kicker">{isRegistering ? 'Registro' : 'Entrar'}</div>
                <div className="facturd-auth-title">
                  {isRegistering ? `Crea tu acceso en ${sistemaNombre}` : `Entrar a ${sistemaNombre}`}
                </div>
              </div>
              <button type="button" className="facturd-auth-close" onClick={() => setAuthOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="facturd-auth-copy">
              Usa tu usuario y contraseña sin salir de la landing.
            </div>

            {error && <div className="facturd-auth-error">{error}</div>}

            <form className="facturd-auth-form" onSubmit={isRegistering ? handleRegister : handleLogin}>
              {isRegistering && (
                <>
                  <label>
                    <span>{t('Nombre')}</span>
                    <div className="facturd-auth-input">
                      <span className="material-symbols-outlined">badge</span>
                      <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                    </div>
                  </label>
                  <label>
                    <span>{t('Nombre de Empresa')}</span>
                    <div className="facturd-auth-input">
                      <span className="material-symbols-outlined">business</span>
                      <input value={empresaNombre} onChange={(e) => setEmpresaNombre(e.target.value)} autoComplete="organization" required />
                    </div>
                  </label>
                  <label>
                    <span>{t('RNC')}</span>
                    <div className="facturd-auth-input">
                      <span className="material-symbols-outlined">receipt_long</span>
                      <input value={empresaRnc} onChange={(e) => setEmpresaRnc(e.target.value)} autoComplete="off" required />
                    </div>
                  </label>
                </>
              )}

              <label>
                <span>{t('Correo Electrónico')}</span>
                <div className="facturd-auth-input">
                  <span className="material-symbols-outlined">person</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="demo@facturd-demo.com"
                    required
                  />
                </div>
              </label>

              <label>
                <span>{t('Contraseña')}</span>
                <div className="facturd-auth-input">
                  <span className="material-symbols-outlined">lock</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    required
                  />
                </div>
              </label>

              <button type="submit" className="facturd-auth-submit" disabled={loading}>
                {loading ? (isRegistering ? t('Registrando...') : t('Iniciando...')) : (isRegistering ? t('Registrarse') : t('Iniciar Sesión'))}
              </button>
            </form>

            <div className="facturd-auth-toggle">
              <span>{isRegistering ? t('¿Ya tienes cuenta?') : t('¿No tienes cuenta?')}</span>
              <button type="button" onClick={() => setIsRegistering((current) => !current)}>
                {isRegistering ? t('Inicia sesión') : t('Regístrate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
