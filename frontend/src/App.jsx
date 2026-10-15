import { Navigate, Route, Routes } from 'react-router-dom';
import { auth } from './api.js';
import { DataProvider } from './store.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Setup from './pages/Setup.jsx';
import Planner from './pages/Planner.jsx';
import Assign from './pages/Assign.jsx';
import Timetable from './pages/Timetable.jsx';
import Availability from './pages/Availability.jsx';
import Booking from './pages/Booking.jsx';
import Reports from './pages/Reports.jsx';

function Protected({ children }) {
  return auth.get() ? <DataProvider>{children}</DataProvider> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="setup" element={<Setup />} />
        <Route path="planner" element={<Planner />} />
        <Route path="assign" element={<Assign />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="availability" element={<Availability />} />
        <Route path="booking" element={<Booking />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
