import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && (parsed.error.includes('permission-denied') || parsed.error.includes('Missing or insufficient permissions'))) {
            errorMessage = `Erro de permissão ao acessar: ${parsed.path || 'dados'}. Por favor, verifique seu acesso.`;
            isPermissionError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
          <div className="max-w-md w-full card space-y-6 text-center shadow-xl border-t-4 border-primary">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">Ops! Algo deu errado</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button 
              onClick={this.handleReset}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest"
            >
              <RefreshCw size={18} /> Recarregar Aplicativo
            </button>
            {isPermissionError && (
              <p className="text-[10px] text-zinc-400 italic">
                Dica: Se você acabou de receber um novo cargo, tente sair e entrar novamente.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
