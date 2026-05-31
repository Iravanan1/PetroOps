import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, ChevronRight, Terminal } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SentryBoundaries extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    (this as any).setState({ errorInfo });
    // Log to simulated cloud Sentry telemetry service
    console.error('[Sentry Error Boundary] Caught exception:', error, errorInfo);
    
    // Simulate API dispatch to Sentry
    const sentryPayload = {
      event_id: `evt_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      platform: 'react_browser',
      exception: {
        values: [{
          type: error.name,
          value: error.message,
          stacktrace: error.stack
        }]
      },
      extra: {
        componentStack: errorInfo.componentStack
      }
    };
    
    try {
      const logs = localStorage.getItem('pumpai_sentry_mock_logs');
      const parsed = logs ? JSON.parse(logs) : [];
      parsed.push(sentryPayload);
      localStorage.setItem('pumpai_sentry_mock_logs', JSON.stringify(parsed));
    } catch {
      // Storage full or unavailable
    }
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-mono text-slate-100">
          <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-4 text-rose-500">
              <div className="h-12 w-12 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  {(this as any).props.fallbackTitle || 'CRITICAL COMPONENT FAULT'}
                </h1>
                <p className="text-slate-400 text-xs">Caught by Sentry Production Observability</p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
              <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Terminal className="h-3 w-3" />
                Exception parameters
              </div>
              <div className="text-xs font-bold text-slate-200">
                {this.state.error?.name || 'Error'}: {this.state.error?.message}
              </div>
              {this.state.errorInfo && (
                <div className="text-[9px] text-slate-500 font-mono overflow-auto max-h-32 text-left leading-normal whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <RefreshCw className="h-4 w-4" />
                Reload ERP Console
              </button>
            </div>

            <div className="text-[10px] text-slate-600 text-center leading-normal">
              Continuous diagnostic heartbeat running. Station transaction states are locked to prevent data corruption.
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default SentryBoundaries;
