import { Component } from 'react';
import AnimatedButton from './AnimatedButton';
import { recoverFromChunkError } from '../utils/chunkRecovery';


export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error:', error, errorInfo);
    void recoverFromChunkError(error);

    const splash = document.getElementById('gs-boot-splash');
    if (splash) {
      splash.classList.add('is-leaving');
      window.setTimeout(() => splash.remove(), 180);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-primary, #EFE8F5)'
        }}>
          <h2 style={{ fontFamily: 'Martel, serif', fontSize: '1.5rem', marginBottom: '1rem', color: '#E8A33D' }}>
            Something went wrong loading this section
          </h2>
          <p style={{ color: 'var(--text-secondary, #A59BB0)', marginBottom: '1.5rem', maxWidth: '480px' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering.'}
          </p>
          <AnimatedButton
            onClick={() => window.location.reload()}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid #C99A4E',
              backgroundColor: 'rgba(201, 154, 78, 0.15)',
              color: '#EFE8F5',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.9rem'
            }}
          >
            Reload Page
          </AnimatedButton>
        </div>
      );
    }

    return this.props.children;
  }
}
