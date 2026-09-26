import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import AddTransaction from './pages/AddTransaction';
import Transactions from './pages/Transactions';
const Insights = lazy(() => import('./pages/Insights'));
const Portfolio = lazy(() => import('./pages/investing/Portfolio'));
import Trades from './pages/investing/Trades';
const NetWorth = lazy(() => import('./pages/networth/NetWorth'));
import MoneyOwed from './pages/networth/MoneyOwed';
import Settings from './pages/Settings';

function FullScreenLoader() {
  return (
    <div className="min-h-dvh grid place-items-center text-forest-700">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

function DataGate() {
  const { loading, error, reload } = useData();
  if (loading) return <FullScreenLoader />;
  if (error) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div>
          <p className="font-semibold text-forest-900">Couldn’t load your data</p>
          <p className="text-sm text-ink-soft mt-1">{error}</p>
          <button className="btn btn-primary mt-4" onClick={reload}>Try again</button>
        </div>
      </div>
    );
  }
  return <Layout />;
}

const page = el => <Suspense fallback={<div className="py-24 grid place-items-center text-forest-700"><Spinner className="h-7 w-7" /></div>}>{el}</Suspense>;

function RequireAuth() {
  const { user, checking } = useAuth();
  if (checking) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DataProvider key={user.id}>
      <DataGate />
    </DataProvider>
  );
}

function GuestOnly() {
  const { user, checking } = useAuth();
  if (checking) return <FullScreenLoader />;
  if (user) return <Navigate to="/add" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/add" replace />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/insights" element={page(<Insights />)} />
            <Route path="/investing" element={<Navigate to="/investing/portfolio" replace />} />
            <Route path="/investing/portfolio" element={page(<Portfolio />)} />
            <Route path="/investing/trades" element={<Trades />} />
            <Route path="/net-worth" element={page(<NetWorth />)} />
            <Route path="/net-worth/owed" element={<MoneyOwed />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
