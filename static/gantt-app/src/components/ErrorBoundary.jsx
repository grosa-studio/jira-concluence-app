import React from 'react';

// Without a boundary, any render error blanks the app and the Forge iframe
// collapses to a thin box. This catches it and shows the error on screen so
// it can be diagnosed without the browser console.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Gantera render error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <div style={{
          minHeight: 320, padding: 24, overflow: 'auto',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          background: 'var(--ds-background-danger, #FFEBE6)', color: 'var(--ds-text, #172B4D)',
        }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ds-text-danger, #AE2A19)', marginBottom: 8 }}>
            ⚠ Gantera — render error
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            {String(e?.stack || e?.message || e)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
