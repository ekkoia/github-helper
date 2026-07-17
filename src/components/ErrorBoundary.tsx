import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 shadow-sm text-center">
            <h1 className="text-lg font-semibold text-foreground mb-2">
              Algo deu errado
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              A tela encontrou um erro inesperado. Recarregue para continuar.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs text-left bg-muted p-2 rounded mb-4 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
