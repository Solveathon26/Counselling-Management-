import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Show, RedirectToSignIn, ClerkLoaded, ClerkLoading, useUser } from '@clerk/react';

import Sidebar from './components/Sidebar';
import Landing from './components/Landing';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import WardenDashboard from './components/WardenDashboard';
import CounsellorDashboard from './components/CounsellorDashboard';
import ParentDashboard from './components/ParentDashboard';
import StudentSignUp from './components/StudentSignUp';
import CounsellorSignUp from './components/CounsellorSignUp';
import ParentSignUp from './components/ParentSignUp';
import RoleSelection from './components/RoleSelection';
import WardenSignUp from './components/WardenSignUp';
import './index.css';

const RoleRoute = ({ children, allowedRole }) => {
  const { user } = useUser();
  if (!user) return <Navigate to="/" replace />;
  const role = user?.publicMetadata?.role || user?.unsafeMetadata?.role || 'student';
  if (role !== allowedRole) {
    return <Navigate to={`/${role}`} replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>

          {/* Public */}
          <Route path="/" element={<Landing />} />

          {/* Registration */}
          <Route path="/sign-up" element={<RoleSelection />} />
          <Route path="/sign-up/parent/*" element={<ParentSignUp />} />
          <Route path="/sign-up/warden/*" element={<WardenSignUp />} />
          <Route path="/warden/signup/*" element={<StudentSignUp />} />
          <Route path="/warden/counsellor/signup/*" element={<CounsellorSignUp />} />

          {/* Login */}
          <Route path="/login/student/*" element={<Login fixedRole="student" redirect="/student" />} />
          <Route path="/login/warden/*" element={<Login fixedRole="warden" redirect="/warden" />} />
          <Route path="/login/counsellor/*" element={<Login fixedRole="counsellor" redirect="/counsellor" />} />
          <Route path="/login/parent/*" element={<Login fixedRole="parent" redirect="/parent" />} />

          {/* Protected Layout */}
          <Route
            path="/"
            element={
              <>
                <ClerkLoading>
                  <div>Loading...</div>
                </ClerkLoading>

                <ClerkLoaded>
                  <Show when="signed-in">
                    <Sidebar />
                    <div className="main-content">
                      <Outlet />
                    </div>
                  </Show>

                  <Show when="signed-out">
                    <RedirectToSignIn />
                  </Show>
                </ClerkLoaded>
              </>
            }
          >
            <Route path="student" element={<RoleRoute allowedRole="student"><StudentDashboard /></RoleRoute>} />
            <Route path="warden" element={<RoleRoute allowedRole="warden"><WardenDashboard /></RoleRoute>} />
            <Route path="counsellor" element={<RoleRoute allowedRole="counsellor"><CounsellorDashboard /></RoleRoute>} />
            <Route path="parent" element={<RoleRoute allowedRole="parent"><ParentDashboard /></RoleRoute>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;