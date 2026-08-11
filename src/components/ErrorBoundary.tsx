import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Catches render-time crashes and shows a friendly recovery screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
          <span className="text-4xl">⚠️</span>
          <h1 className="mt-4 text-lg font-bold">Something went wrong</h1>
          <p className="mt-1 max-w-[320px] text-[12px] leading-relaxed text-muted">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-green px-5 py-2.5 text-sm font-bold text-bg transition-transform active:scale-95"
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
