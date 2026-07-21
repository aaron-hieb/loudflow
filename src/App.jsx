import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Contacts from './pages/Contacts';
import MonthlyExpenses from './pages/MonthlyExpenses';
import PastEvents from './pages/PastEvents';
import Inventory from './pages/Inventory';
import Venues from './pages/Venues';
import TodoList from './pages/TodoList';
import PurchaseList from './pages/PurchaseList';
import LargePurchaseList from './pages/LargePurchaseList';
import RepairList from './pages/RepairList';
import AdminReceipts from './pages/AdminReceipts';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PendingApprovalScreen from './components/PendingApprovalScreen';
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const ApprovalGate = ({ children }) => {
  const { user } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    if (user.role === "admin") { setApprovalStatus("approved"); setChecking(false); return; }

    const checkOrCreate = async () => {
      const existing = await base44.entities.UserApproval.filter({ user_email: user.email });
      if (existing.length > 0) {
        setApprovalStatus(existing[0].status);
      } else {
        await base44.entities.UserApproval.create({
          user_email: user.email,
          user_name: user.full_name || user.email,
          status: "pending",
        });
        setApprovalStatus("pending");
      }
      setChecking(false);
    };
    checkOrCreate();
  }, [user]);

  if (checking) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );

  if (approvalStatus === "pending" || approvalStatus === "denied") {
    return <PendingApprovalScreen status={approvalStatus} />;
  }

  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<ApprovalGate><Layout /></ApprovalGate>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:eventId" element={<EventDetail />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/monthly-expenses" element={<MonthlyExpenses />} />
          <Route path="/admin-receipts" element={<AdminReceipts />} />
          <Route path="/past-events" element={<PastEvents />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/todo" element={<TodoList />} />
          <Route path="/purchases" element={<PurchaseList />} />
          <Route path="/repairs" element={<RepairList />} />
          <Route path="/large-purchases" element={<LargePurchaseList />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App