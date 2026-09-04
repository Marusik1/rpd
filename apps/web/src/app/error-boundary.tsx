import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? <section role="alert"><h1>Ошибка отображения</h1><button onClick={() => window.location.reload()}>Повторить</button></section> : this.props.children; }
}
