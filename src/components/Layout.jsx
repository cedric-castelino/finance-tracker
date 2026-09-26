import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  PlusIcon, ListBulletIcon, ChartPieIcon, ArrowTrendingUpIcon, BuildingLibraryIcon, Cog6ToothIcon, PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const NAV = [
  { to: '/add', label: 'Add Transaction', short: 'Add', icon: PlusCircleIcon },
  { to: '/transactions', label: 'Transactions', short: 'Activity', icon: ListBulletIcon },
  { to: '/insights', label: 'Insights', short: 'Insights', icon: ChartPieIcon },
  { to: '/investing', label: 'Investing', short: 'Invest', icon: ArrowTrendingUpIcon },
  { to: '/net-worth', label: 'Net Worth', short: 'Net Worth', icon: BuildingLibraryIcon },
];

function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-forest-900 text-cream-100 z-30">
      <div className="px-6 pt-7 pb-8">
        <Logo />
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition ${
                isActive ? 'bg-forest-700 text-white shadow-inner' : 'text-cream-200/80 hover:bg-forest-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition ${
              isActive ? 'bg-forest-700 text-white' : 'text-cream-200/80 hover:bg-forest-800 hover:text-white'
            }`
          }
        >
          <Cog6ToothIcon className="h-5 w-5" />
          Settings
        </NavLink>
        <div className="flex items-center gap-3 px-3.5 pt-4 pb-2">
          <div className="h-9 w-9 rounded-full bg-gold-500 text-forest-950 grid place-items-center font-semibold">
            {(user?.firstName || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-xs text-cream-200/60 truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-forest-900 text-cream-50 safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        <Logo compact />
        <Link to="/settings" aria-label="Settings" className="h-10 w-10 -mr-2 grid place-items-center rounded-full hover:bg-white/10">
          <Cog6ToothIcon className="h-6 w-6" />
        </Link>
      </div>
    </header>
  );
}

function TabBar() {
  const items = [NAV[1], NAV[2], NAV[0], NAV[3], NAV[4]];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-line safe-bottom">
      <div className="grid grid-cols-5 h-[64px]">
        {items.map(({ to, short, icon: Icon }) =>
          to === '/add' ? (
            <NavLink key={to} to={to} aria-label="Add transaction" className="flex items-center justify-center">
              {({ isActive }) => (
                <span className={`-mt-6 h-14 w-14 rounded-full grid place-items-center shadow-lg ring-4 ring-cream-50 transition ${isActive ? 'bg-gold-500 text-forest-950' : 'bg-forest-800 text-cream-50'}`}>
                  <PlusIcon className="h-7 w-7" strokeWidth={2.2} />
                </span>
              )}
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? 'text-forest-800' : 'text-muted'}`
              }
            >
              <Icon className="h-6 w-6" />
              {short}
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}

export default function Layout() {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <MobileHeader />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 lg:px-10 pt-5 lg:pt-9 pb-tabbar">
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  );
}
