import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] caught error:', error, errorInfo)
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined })
        window.location.href = '/'
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-cairo">
                    <div className="glass max-w-md w-full p-12 text-center space-y-8 rounded-[3rem] border-white/40 shadow-2xl">
                        <div className="size-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto text-rose-600 animate-pulse">
                            <AlertCircle size={40} />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                We encountered an unexpected error. Don't worry, your data is safe.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="p-4 bg-slate-900/5 rounded-2xl border border-slate-900/5 text-left overflow-hidden">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Error Trace</p>
                                <p className="text-[11px] font-mono text-slate-600 truncate">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={this.handleReset}
                            className="btn-aura w-full py-4 flex items-center justify-center gap-3"
                        >
                            <RefreshCw size={18} />
                            <span className="font-black text-xs uppercase tracking-[0.2em]">Reset Application</span>
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
