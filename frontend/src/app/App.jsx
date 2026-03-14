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
import AccessDeniedPage from '../shared/components/AccessDeniedPage.jsx';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';
import { getSessionQueryOptions } from '../shared/lib/auth.js';
import { canRoleAccessRole } from '../shared/lib/permissions.js';

function ProtectedRoute({ children, requiredRole = 'viewer' }) {
  const { data, isLoading, isError } = useQuery(getSessionQueryOptions());

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

  if (!canRoleAccessRole(data?.role, requiredRole)) {
    return <AccessDeniedPage requiredRole={requiredRole} currentRole={data?.role || ''} />;
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
          <ProtectedRoute requiredRole="viewer">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/billings" element={<Navigate to="/bills/wifi" replace />} />

      {/* Single persistent bill route — no re-mount when switching tabs */}
      <Route
        path="/bills/review"
        element={
          <ProtectedRoute requiredRole="editor">
            <BillReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bills/:billType"
        element={
          <ProtectedRoute requiredRole="editor">
            <PaymentFormPage />
          </ProtectedRoute>
        }
      />
      {/* /bills with no type → default to wifi */}
      <Route path="/bills" element={<Navigate to="/bills/wifi" replace />} />

      <Route
        path="/records"
        element={
          <ProtectedRoute requiredRole="viewer">
            <RecordsLandingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records/bills"
        element={
          <ProtectedRoute requiredRole="viewer">
            <BillsRecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records/expenses"
        element={
          <ProtectedRoute requiredRole="viewer">
            <ExpensesRecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute requiredRole="admin">
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/property-records/*"
        element={
          <ProtectedRoute requiredRole="viewer">
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
