import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Bars3Icon } from "@heroicons/react/24/outline";
import Home from './Home'
import Login from './Login'
import Register from './Register'
import Monthly from './Monthly'
import TransactionViewer from './TransactionViewer'
import NetWorth from './NetWorth'
import Profile from './Profile'
import './App.css'

function App() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';

  return (
    <>
      {!hideNavbar && (
        <>
          <div className="navbar bg-base-100 shadow-sm pl-4 pt-4 pb-4 w-full">
            <div className="flex-1">
              <h1 className="text-4xl font-bold">Finance Tracker</h1>
            </div>
            <div className="flex-none hidden lg:block">
              <ul className="menu menu-horizontal px-0">
                <li><Link to="/home">New Transaction</Link></li>
                <li className='border-l border-gray-300'><Link to="/monthly">Monthly Breakdown</Link></li>
                <li className='border-l border-gray-300'><Link to="/transactionviewer">Transaction Viewer</Link></li>
                <li className='border-l border-gray-300'><Link to="/networth">Net Worth</Link></li>
                <li className='border-l border-gray-300'><Link to="/profile">Profile</Link></li>
              </ul>
            </div>
            <div className="flex-none lg:hidden">
              <label htmlFor="my-drawer" className="btn btn-ghost">
                <Bars3Icon className="h-6 w-6" />
              </label>
            </div>
          </div>

          <div className="drawer lg:hidden">
            <input id="my-drawer" type="checkbox" className="drawer-toggle" />
            <div className="drawer-content" />
            <div className="drawer-side">
              <label htmlFor="my-drawer" className="drawer-overlay"></label>
              <ul className="menu bg-base-200 text-base-content min-h-full w-80 p-4">
                <li><Link to="/home">New Transaction</Link></li>
                <li><Link to="/monthly">Monthly Breakdown</Link></li>
                <li><Link to="/transactionviewer">Transaction Viewer</Link></li>
                <li><Link to="/networth">Net Worth</Link></li>
                <li><Link to="/profile">Profile</Link></li>
              </ul>
            </div>
          </div>
        </>
      )}

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/monthly" element={<Monthly />} />
        <Route path="/transactionviewer" element={<TransactionViewer />} />
        <Route path="/networth" element={<NetWorth />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  );
}

export default App;