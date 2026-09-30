import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('حدث خطأ غير متوقع أثناء عرض التطبيق.', error, info.componentStack)
  }

  private retry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return <main className="fatal-error" dir="rtl" lang="ar">
        <div className="fatal-error-mark">✳</div>
        <h1>حدث خطأ غير متوقع.</h1>
        <p>بياناتك المحلية لم تتغير. أعد المحاولة أو أعد تحميل التطبيق.</p>
        <div className="fatal-error-actions">
          <button onClick={this.retry}>إعادة المحاولة</button>
          <button onClick={() => window.location.reload()}>إعادة تحميل التطبيق</button>
        </div>
      </main>
    }
    return this.props.children
  }
}
