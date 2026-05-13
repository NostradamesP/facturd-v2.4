import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { authService, decodeToken } from '../services/api';
import i18n from '../i18n';

const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const API_URL = `${import.meta.env.VITE_API_URL || '/api'}`.replace(/\/?$/, '/');

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  const syncLanguage = useCallback((empresaData) => {
    if (empresaData?.idioma && ['es', 'en'].includes(empresaData.idioma)) {
      i18n.changeLanguage(empresaData.idioma);
      localStorage.setItem('facturd_idioma', empresaData.idioma);
    }
  }, []);

  const refreshTokenProactively = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return;
    console.log('[Auth] Proactive refresh scheduled, refreshing token...');
    try {
      const res = await axios.post(`${API_URL}auth/refresh`, { refresh_token: refreshToken });
      const { token, refresh_token: newRefresh } = res.data;
      localStorage.setItem('token', token);
      if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
      const payload = decodeToken(token);
      if (payload?.exp) {
        const delay = Math.max(0, (payload.exp * 1000) - Date.now() - REFRESH_MARGIN_MS);
        refreshTimerRef.current = setTimeout(refreshTokenProactively, delay);
      }
    } catch (err) {
      console.warn('[Auth] Refresh failed, clearing tokens:', err.message);
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.data.user);
          setEmpresa(res.data.empresa);
          syncLanguage(res.data.empresa);
          const payload = decodeToken(token);
          if (payload?.exp) {
            const delay = Math.max(0, (payload.exp * 1000) - Date.now() - REFRESH_MARGIN_MS);
            refreshTimerRef.current = setTimeout(refreshTokenProactively, delay);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [syncLanguage, refreshTokenProactively]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    localStorage.setItem('token', res.data.token);
    if (res.data.refresh_token) {
      localStorage.setItem('refresh_token', res.data.refresh_token);
    }
    setUser(res.data.user);
    setEmpresa(res.data.empresa);
    syncLanguage(res.data.empresa);
    const payload = decodeToken(res.data.token);
    if (payload?.exp) {
      const delay = Math.max(0, (payload.exp * 1000) - Date.now() - REFRESH_MARGIN_MS);
      refreshTimerRef.current = setTimeout(refreshTokenProactively, delay);
    }
    if (res.data.empresa) {
      localStorage.setItem('facturd_empresa_branding', JSON.stringify({
        nombre_sistema: res.data.empresa.nombre_sistema,
        logo_url: res.data.empresa.logo_url,
        nombre: res.data.empresa.nombre,
      }));
    }
    return res.data;
  };

  const updateEmpresa = (data) => {
    setEmpresa(data);
  };

  const logout = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setEmpresa(null);
  };

  return (
    <AuthContext.Provider value={{ user, empresa, login, logout, loading, updateEmpresa }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
