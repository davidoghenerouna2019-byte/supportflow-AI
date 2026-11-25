import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthPage } from './pages/AuthPage';
import { CustomerChatPage } from './pages/CustomerChatPage';
import { LandingPage } from './pages/LandingPage';
import { AgentsPage } from './pages/dashboard/AgentsPage';
import { AnalyticsPage } from './pages/dashboard/AnalyticsPage';
import { ConversationsPage } from './pages/dashboard/ConversationsPage';
import { CustomersPage } from './pages/dashboard/CustomersPage';
import { DepartmentsPage } from './pages/dashboard/DepartmentsPage';
import { KnowledgeBasePage } from './pages/dashboard/KnowledgeBasePage';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { RoutingRulesPage } from './pages/dashboard/RoutingRulesPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Verifying session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN' && user.role !== 'AGENT') {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/chat" element={<CustomerChatPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />

          <Route
            path="/dashboard"
            element={
              <StaffRoute>
                <DashboardLayout />
              </StaffRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route
              path="conversations"
              element={<ConversationsPage mode="all" />}
            />
            <Route
              path="inbox"
              element={<ConversationsPage mode="inbox" />}
            />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="knowledge" element={<KnowledgeBasePage />} />
            <Route path="routing" element={<RoutingRulesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
