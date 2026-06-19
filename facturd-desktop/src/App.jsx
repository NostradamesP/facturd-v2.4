import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';

const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Facturas = lazy(() => import('./pages/Facturas'));
const DisenoFactura = lazy(() => import('./pages/DisenoFactura'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Proveedores = lazy(() => import('./pages/Proveedores'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Cobros = lazy(() => import('./pages/Cobros'));
const Gastos = lazy(() => import('./pages/Gastos'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Empresa = lazy(() => import('./pages/Empresa'));

function LoadingScreen() {
  return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="facturas" element={<Facturas />} />
          <Route path="diseno" element={<DisenoFactura />} />
          <Route path="cotizaciones" element={<div className="text-center py-10">Quotes - Coming Soon</div>} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="cobros" element={<Cobros />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="empresa" element={<Empresa />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');

  return (
    isGitHubPages ? (
      <HashRouter>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </HashRouter>
    ) : (
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    )
  );
}
