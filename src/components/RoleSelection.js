import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users } from 'lucide-react';

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '20px' }}>
      <h1 className="gradient-text" style={{ marginBottom: '40px', fontSize: '2.5rem' }}>Welcome to Pulse Tracker</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '48px', fontSize: '1.2rem' }}>Please select your role to continue registration.</p>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div 
          onClick={() => navigate('/warden/signup')} // Using existing student signup path for student
          className="glass-panel" 
          style={{ cursor: 'pointer', padding: '40px', width: '280px', textAlign: 'center', transition: 'transform 0.2s', border: '1px solid var(--primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <User size={64} color="var(--primary)" style={{ marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '12px' }}>Student</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Log your pulse, mood, and track your well-being snapshots.</p>
        </div>

        <div 
          onClick={() => navigate('/sign-up/parent')}
          className="glass-panel" 
          style={{ cursor: 'pointer', padding: '40px', width: '280px', textAlign: 'center', transition: 'transform 0.2s', border: '1px solid var(--accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Users size={64} color="var(--accent)" style={{ marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '12px' }}>Parent</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor your child's stress and well-being patterns privately.</p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
