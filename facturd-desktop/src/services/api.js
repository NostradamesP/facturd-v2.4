import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}`.replace(/\/?$/, '/');

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (import.meta.env.DEV) {
    // console.log('AXIOS Request:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'YES' : 'NO');
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(proceed, data) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (proceed) resolve(data);
    else reject(data);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (import.meta.env.DEV) {
      console.log('AXIOS Response Error:', error.response?.status, originalRequest?.url);
    }
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('auth/')) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post(`${API_URL}auth/refresh`, { refresh_token: refreshToken });
        const { token, refresh_token: newRefresh } = res.data;
        localStorage.setItem('token', token);
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
        processQueue(true, token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch {
        processQueue(false, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

const unwrapItems = (request) =>
  request.then((response) => ({
    ...response,
    data: response.data?.items || response.data,
  }));

export const authService = {
  login: (email, password) => api.post('auth/login', { email, password }),
  register: (data) => api.post('auth/register', data),
  getMe: () => api.get('auth/me'),
};

export const facturasService = {
  getAll: () => unwrapItems(api.get('facturas')),
  getById: (id) => api.get(`facturas/${id}`),
  create: (data) => api.post('facturas', data),
  update: (id, data) => api.put(`facturas/${id}`, data),
  delete: (id) => api.delete(`facturas/${id}`),
};

export const clientesService = {
  getAll: () => unwrapItems(api.get('clientes')),
  getById: (id) => api.get(`clientes/${id}`),
  create: (data) => api.post('clientes', data),
  update: (id, data) => api.put(`clientes/${id}`, data),
  delete: (id) => api.delete(`clientes/${id}`),
};

export const proveedoresService = {
  getAll: () => unwrapItems(api.get('proveedores')),
  create: (data) => api.post('proveedores', data),
  update: (id, data) => api.put(`proveedores/${id}`, data),
  delete: (id) => api.delete(`proveedores/${id}`),
};

export const productosService = {
  getAll: () => unwrapItems(api.get('productos')),
  create: (data) => api.post('productos', data),
  update: (id, data) => api.put(`productos/${id}`, data),
  delete: (id) => api.delete(`productos/${id}`),
};

export const cotizacionesService = {
  getAll: () => unwrapItems(api.get('cotizaciones')),
  create: (data) => api.post('cotizaciones', data),
  update: (id, data) => api.put(`cotizaciones/${id}`, data),
  delete: (id) => api.delete(`cotizaciones/${id}`),
};

export const pagosService = {
  getAll: () => unwrapItems(api.get('pagos')),
  create: (data) => api.post('pagos', data),
};

export const empresaService = {
  get: () => api.get('empresa'),
  update: (data) => api.put('empresa', data),
};

export const plantillasService = {
  getAll: () => api.get('plantillas'),
  getById: (id) => api.get(`plantillas/${id}`),
  create: (data) => api.post('plantillas', data),
  update: (id, data) => api.put(`plantillas/${id}`, data),
  delete: (id) => api.delete(`plantillas/${id}`),
  duplicate: (id) => api.post(`plantillas/${id}/duplicar`),
};

export const gastosService = {
  getAll: () => unwrapItems(api.get('gastos')),
  create: (data) => api.post('gastos', data),
  update: (id, data) => api.put(`gastos/${id}`, data),
  delete: (id) => api.delete(`gastos/${id}`),
  getResumen: () => api.get('gastos/resumen'),
};

export const dgiiService = {
  enviar: (facturaId) => api.post(`dgii/enviar/${facturaId}`),
  consultar: (facturaId) => api.post(`dgii/consultar/${facturaId}`),
  getRegistro: (facturaId) => api.get(`dgii/facturas/${facturaId}`),
  getFacturasEnviadas: () => api.get('dgii/facturas'),
  validarRNC: (rnc) => api.get(`dgii/rnc/${encodeURIComponent(rnc)}`),
  getConfig: () => api.get('dgii/config'),
  getEstadisticas: () => api.get('dgii/estadisticas'),
};

export const pdfService = {
    generate: (facturaId) => api.post(`pdf/invoice/${facturaId}`, {}, { responseType: 'blob' }),
};

export default api;
