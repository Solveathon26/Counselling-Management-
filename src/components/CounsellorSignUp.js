import React, { useState } from 'react';
import { SignUp, ClerkLoaded, ClerkLoading } from '@clerk/react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CounsellorSignUp = () => {
  const navigate = useNavigate();
  const [specialization, setSpecialization] = useState('General Support');

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <button 
        onClick={() => navigate('/warden')}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer'
        }}
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
          <span style={{ 
            background: 'linear-gradient(to right, #60a5fa, #a78bfa)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Counsellor Registration
          </span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Administrative portal for onboarding professional counsellors.</p>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', marginBottom: '24px', padding: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Area of Specialization:</label>
        <select 
          value={specialization} 
          onChange={(e) => setSpecialization(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }}
        >
          <option value="General Support" style={{ color: 'black' }}>General Support</option>
          <option value="Stress Management" style={{ color: 'black' }}>Stress Management</option>
          <option value="Academic Anxiety" style={{ color: 'black' }}>Academic Anxiety</option>
          <option value="Career Counselling" style={{ color: 'black' }}>Career Counselling</option>
          <option value="Trauma Support" style={{ color: 'black' }}>Trauma Support</option>
        </select>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Students will see this when booking a session with you.
        </p>
      </div>

      <ClerkLoading>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignUp 
          path="/warden/counsellor/signup" 
          routing="path" 
          signInUrl="/login/counsellor"
          forceRedirectUrl="/counsellor"
          unsafeMetadata={{ role: 'counsellor', specialization }}
          appearance={{
            elements: {
              formButtonPrimary: 'clerk-btn-primary',
              card: 'clerk-card',
              headerTitle: 'clerk-header-title',
              headerSubtitle: 'clerk-header-subtitle',
            }
          }}
        />
      </ClerkLoaded>
    </div>
  );
};

export default CounsellorSignUp;
