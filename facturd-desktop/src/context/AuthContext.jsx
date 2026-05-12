import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';
import i18n from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncLanguage = useCallback((empresaData) => {
    if (empresaData?.idioma && ['es', 'en'].includes(empresaData.idioma)) {
      i18n.changeLanguage(empresaData.idioma);
      localStorage.setItem('facturd_idioma', empresaData.idioma);
    }
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
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [syncLanguage]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setEmpresa(res.data.empresa);
    syncLanguage(res.data.empresa);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setEmpresa(null);
  };

  return (
    <AuthContext.Provider value={{ user, empresa, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
