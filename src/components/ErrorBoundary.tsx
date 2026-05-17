import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Sentry } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-dvh flex items-center justify-center bg-gradient-subtle p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {!import.meta.env.PROD && this.state.error && (
              <div className="text-left bg-muted p-4 rounded-lg mb-4 text-sm overflow-auto">
                <code>{this.state.error.message}</code>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} className="flex-1" variant="outline">
                Refresh Page
              </Button>
              <Button
                onClick={this.handleReset}
                className="flex-1 bg-gradient-primary text-primary-foreground"
              >
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
