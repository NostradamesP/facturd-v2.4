import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Algo sali\u00f3 mal</h2>
            <p className="text-gray-600 mb-4">
              Ocurri\u00f3 un error inesperado. Intenta recargar la p\u00e1gina.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recargar p\u00e1gina
            </button>
            {this.props.showDetails && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">Detalles t\u00e9cnicos</summary>
                <pre className="mt-2 text-xs text-red-700 bg-red-50 p-3 rounded overflow-auto max-h-40">
                  {this.state.error?.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
