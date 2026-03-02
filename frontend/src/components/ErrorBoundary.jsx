// Finance App File: frontend\src\components\ErrorBoundary.jsx
// Purpose: Catch unexpected React runtime errors and render a recoverable fallback UI.

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: String(error?.message || 'Unexpected application error.')
    };
  }

  componentDidCatch(error, errorInfo) {
    // Keep full details in console for debugging while showing safe fallback in UI.
    // eslint-disable-next-line no-console
    console.error('Finance App runtime error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.hasError
      && this.props.resetKey !== prevProps.resetKey
    ) {
      this.setState({
        hasError: false,
        errorMessage: ''
      });
    }
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="page">
        <section className="card" style={{ maxWidth: '680px', margin: '48px auto' }}>
          <h2>Something went wrong</h2>
          <p className="muted-text">
            The page crashed because of an unexpected error. Reload the app to continue.
          </p>
          <p className="error" style={{ marginTop: '10px' }}>
            {this.state.errorMessage}
          </p>
          <div className="actions" style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-primary" onClick={this.handleReload}>
              Reload App
            </button>
          </div>
        </section>
      </main>
    );
  }
}
