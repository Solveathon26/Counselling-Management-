import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, Activity, ShieldAlert, LogOut } from 'lucide-react';
import { useUser, useClerk } from '@clerk/react';

const Sidebar = () => {
  const { user } = useUser();
  const { signOut } = useClerk();

  const userName = user?.username || 'User';
  const role = user?.publicMetadata?.role || user?.unsafeMetadata?.role || 'student';

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="sidebar">
      <h2 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
        VCalm
      </h2>

      <div style={{ flex: 1 }}>
        {role === 'student' && (
          <NavLink to="/student" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <User size={20} />
            <span>My Essentials</span>
          </NavLink>
        )}

        {(role === 'warden' || role === 'counsellor') && (
          <NavLink to="/warden" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Activity size={20} />
            <span>Block Analytics</span>
          </NavLink>
        )}

        {role === 'counsellor' && (
          <NavLink to="/counsellor" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <ShieldAlert size={20} />
            <span>Counsellor Insights</span>
          </NavLink>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Logged in as: {userName}</p>
        <button onClick={handleLogout} className="btn" style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent', color: 'var(--danger)' }}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
