import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import { LoadingState } from './components/States';
import RedirectToLogin from './components/RedirectToLogin';

const L = (f: () => Promise<{ default: React.ComponentType }>) => lazy(f);
const Dashboard = L(() => import('./pages/Dashboard'));
const Organizations = L(() => import('./pages/Organizations'));
const Students = L(() => import('./pages/Students'));
const Wardens = L(() => import('./pages/Wardens'));
const Hostels = L(() => import('./pages/Hostels'));
const Buildings = L(() => import('./pages/Buildings'));
const Floors = L(() => import('./pages/Floors'));
const Rooms = L(() => import('./pages/Rooms'));
const Beds = L(() => import('./pages/Beds'));
const Allocations = L(() => import('./pages/Allocations'));
const Admissions = L(() => import('./pages/Admissions'));
const Fees = L(() => import('./pages/Fees'));
const Payments = L(() => import('./pages/Payments'));
const Attendance = L(() => import('./pages/Attendance'));
const Complaints = L(() => import('./pages/Complaints'));
const Leave = L(() => import('./pages/Leave'));
const Visitors = L(() => import('./pages/Visitors'));
const Inventory = L(() => import('./pages/Inventory'));
const Expenses = L(() => import('./pages/Expenses'));
const Notices = L(() => import('./pages/Notices'));
const Reports = L(() => import('./pages/Reports'));
const Subscriptions = L(() => import('./pages/Subscriptions'));
const Settings = L(() => import('./pages/Settings'));

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingState /></div>}>
      <Routes>
        <Route path="/admin/login" element={<RedirectToLogin />} />
        <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
              <Route path="organizations" element={<Organizations />} />
            </Route>
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="students" element={<Students />} />
            <Route path="wardens" element={<Wardens />} />
            <Route path="hostels" element={<Hostels />} />
            <Route path="buildings" element={<Buildings />} />
            <Route path="floors" element={<Floors />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="beds" element={<Beds />} />
            <Route path="allocations" element={<Allocations />} />
            <Route path="admissions" element={<Admissions />} />
            <Route path="fees" element={<Fees />} />
            <Route path="payments" element={<Payments />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="leave" element={<Leave />} />
            <Route path="visitors" element={<Visitors />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="notices" element={<Notices />} />
            <Route path="reports" element={<Reports />} />
            </Route>
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
