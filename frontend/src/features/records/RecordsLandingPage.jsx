// Finance App File: frontend/src/features/records/RecordsLandingPage.jsx
// Purpose: Records landing page with entry points for bills and expenses records.

import { useNavigate } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';

export default function RecordsLandingPage() {
  const navigate = useNavigate();

  return (
    <AppLayout title="Records">
      <section className="card records-landing-card">
        <div className="records-choice-grid">
          <article className="records-choice-card">
            <div className="records-choice-icon records-choice-icon-bills" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.2">
                <rect x="14" y="10" width="36" height="46" rx="4" />
                <rect x="24" y="6" width="16" height="8" rx="2.5" fill="currentColor" stroke="none" />
                <path d="M22 24h20M22 32h20M22 40h14" strokeLinecap="round" />
                <circle cx="46" cy="44" r="11" fill="currentColor" stroke="none" />
                <path d="M43.5 44h5.5a2.5 2.5 0 0 0 0-5h-4a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5h-6" stroke="#fff" />
              </svg>
            </div>
            <button
              type="button"
              className="records-choice-btn records-choice-btn-bills"
              onClick={() => navigate('/records/bills')}
            >
              Bills Records
            </button>
          </article>

          <article className="records-choice-card">
            <div className="records-choice-icon records-choice-icon-expenses" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
                <path
                  d="M20 10h22a3 3 0 0 1 3 3v29l-3.5-2.6-3.5 2.6-3.5-2.6-3.5 2.6-3.5-2.6-3.5 2.6-3.5-2.6V13a3 3 0 0 1 3-3z"
                  fill="currentColor"
                  stroke="none"
                />
                <path d="M25 20h15M25 27h12" stroke="#fff" strokeLinecap="round" />
                <path d="M29 34h8" stroke="#fff" strokeLinecap="round" />
                <circle cx="46.5" cy="41.5" r="11.5" fill="currentColor" stroke="none" />
                <path d="M41.7 41.8l3 3 6.4-7.1" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <button
              type="button"
              className="records-choice-btn records-choice-btn-expenses"
              onClick={() => navigate('/records/expenses')}
            >
              Expenses Records
            </button>
          </article>
        </div>
      </section>
    </AppLayout>
  );
}
