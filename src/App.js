import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Show, RedirectToSignIn, ClerkLoaded, ClerkLoading } from '@clerk/react';

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

import './index.css';

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
            <Route path="student" element={<StudentDashboard />} />
            <Route path="warden" element={<WardenDashboard />} />
            <Route path="counsellor" element={<CounsellorDashboard />} />
            <Route path="parent" element={<ParentDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;