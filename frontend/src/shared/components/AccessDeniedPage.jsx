import { Link } from 'react-router-dom';
import { formatUserRole } from '../lib/permissions.js';

export default function AccessDeniedPage({ requiredRole = 'viewer', currentRole = '' }) {
  const requiredLabel = formatUserRole(requiredRole);
  const currentLabel = formatUserRole(currentRole || 'viewer');

  return (
    <main className="page">
      <section className="card">
        <h1>Access Restricted</h1>
        <p>This screen requires {requiredLabel} access.</p>
        <p>You are signed in as {currentLabel}. Use another module or ask an administrator to update your role.</p>
        <div className="action-buttons">
          <Link to="/dashboard" className="btn btn-secondary">
            Go to Dashboard
          </Link>
          <Link to="/records" className="btn btn-secondary">
            Open Records
          </Link>
        </div>
      </section>
    </main>
  );
}
