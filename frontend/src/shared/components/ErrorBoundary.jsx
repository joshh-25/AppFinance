// Finance App File: frontend\src\shared\components\ErrorBoundary.jsx
// Purpose: Catch unhandled React UI crashes and show a fallback instead of a white screen

import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Unhandled React Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-box" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-card)', marginTop: '2rem' }}>
                    <h2 style={{ color: 'var(--error-text)', marginBottom: '1rem' }}>Something went wrong.</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        The application encountered an unexpected error while rendering this page.
                    </p>
                    <pre style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius)', overflowX: 'auto', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        type="button"
                        className="btn btn-theme"
                        style={{ marginTop: '1.5rem' }}
                        onClick={() => window.location.reload()}
                    >
                        Reload application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
