import React from 'react';
import { SignUp, ClerkLoaded, ClerkLoading } from '@clerk/react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CounsellorSignUp = () => {
  const navigate = useNavigate();

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

      <ClerkLoading>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignUp 
          path="/warden/counsellor/signup" 
          routing="path" 
          signInUrl="/login/counsellor"
          forceRedirectUrl="/counsellor"
          unsafeMetadata={{ role: 'counsellor' }}
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
