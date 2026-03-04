// Finance App File: frontend\src\App.jsx
// Purpose: Frontend/support source file for the Finance app.

import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import LoginPage from '../features/auth/LoginPage.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import PaymentFormPage from '../features/bills/PaymentFormPage.jsx';
import BillReviewPage from '../features/bills/BillReviewPage.jsx';
import PropertyRecordsPage from '../features/property/PropertyRecordsPage.jsx';
import BillsRecordsPage from '../features/bills/RecordsPage.jsx';
import ExpensesPage from '../features/expenses/ExpensesPage.jsx';
import ExpensesRecordsPage from '../features/records/ExpensesRecordsPage.jsx';
import RecordsLandingPage from '../features/records/RecordsLandingPage.jsx';
import { checkSession } from '../shared/lib/auth.js';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';

function ProtectedRoute({ children }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['session'],
    queryFn: checkSession,
    retry: false,
    staleTime: 15000,
    gcTime: 60000,
    refetchOnMount: true,
    refetchOnReconnect: true
  });

  if (isLoading) {
    return (
      <main className="page">
        <p>Checking session...</p>
      </main>
    );
  }

  if (isError || data?.authenticated !== true) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/payments" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/billings" element={<Navigate to="/bills/wifi" replace />} />

      {/* Single persistent bill route — no re-mount when switching tabs */}
      <Route
        path="/bills/review"
        element={
          <ProtectedRoute>
            <BillReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bills/:billType"
        element={
          <ProtectedRoute>
            <PaymentFormPage />
          </ProtectedRoute>
        }
      />
      {/* /bills with no type → default to wifi */}
      <Route path="/bills" element={<Navigate to="/bills/wifi" replace />} />

      <Route
        path="/records"
        element={
          <ProtectedRoute>
            <RecordsLandingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records/bills"
        element={
          <ProtectedRoute>
            <BillsRecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records/expenses"
        element={
          <ProtectedRoute>
            <ExpensesRecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-records/*"
        element={
          <ProtectedRoute>
            <PropertyRecordsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}`;

  return (
    <ErrorBoundary resetKey={resetKey}>
      <AppRoutes />
    </ErrorBoundary>
  );
}
