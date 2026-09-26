import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070c18',
          color: '#f8fafc',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '560px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <AlertTriangle size={48} color="#f43f5e" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Command Center Interface Recovered
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              A rendering exception was intercepted to prevent a screen blackout:
              <br />
              <code style={{ color: '#fda4af', background: 'rgba(0,0,0,0.4)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.5rem' }}>
                {this.state.error?.message || 'Unknown runtime error'}
              </code>
            </p>
            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #00f2fe 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} /> Reinitialize Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
