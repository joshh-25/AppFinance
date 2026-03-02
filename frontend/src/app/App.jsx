// Finance App File: frontend\src\App.jsx
// Purpose: Frontend/support source file for the Finance app.

import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import LoginPage from '../features/auth/LoginPage.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import WaterBillsPage from '../features/bills/WaterBillsPage.jsx';
import ElectricityBillsPage from '../features/bills/ElectricityBillsPage.jsx';
import WifiBillsPage from '../features/bills/WifiBillsPage.jsx';
import AssociationBillsPage from '../features/bills/AssociationBillsPage.jsx';
import PropertyRecordsPage from '../features/property/PropertyRecordsPage.jsx';
import RecordsPage from '../features/bills/RecordsPage.jsx';
import { checkSession } from '../shared/lib/auth.js';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';

function ProtectedRoute({ children }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-guard'],
    queryFn: checkSession,
    retry: false,
    staleTime: 15000,
    gcTime: 60000,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  if (isLoading) {
    return <main className="page"><p>Checking session...</p></main>;
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
        element={(
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/bills/water"
        element={(
          <ProtectedRoute>
            <WaterBillsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/bills/water/list"
        element={(
          <ProtectedRoute>
            <WaterBillsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/bills/electricity"
        element={(
          <ProtectedRoute>
            <ElectricityBillsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/bills/electricity/list"
        element={(
          <ProtectedRoute>
            <ElectricityBillsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/bills/wifi"
        element={(
          <ProtectedRoute>
            <WifiBillsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/bills/wifi/list"
        element={(
          <ProtectedRoute>
            <WifiBillsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/bills/association"
        element={(
          <ProtectedRoute>
            <AssociationBillsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/bills/association/list"
        element={(
          <ProtectedRoute>
            <AssociationBillsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/records"
        element={(
          <ProtectedRoute>
            <RecordsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/property-records"
        element={(
          <ProtectedRoute>
            <PropertyRecordsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/property-records/list"
        element={(
          <ProtectedRoute>
            <PropertyRecordsPage />
          </ProtectedRoute>
        )}
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
