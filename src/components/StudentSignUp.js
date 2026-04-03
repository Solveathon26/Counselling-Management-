import React, { useState } from 'react';
import { SignUp } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const StudentSignUp = () => {
  const navigate = useNavigate();
  const [selectedBlock, setSelectedBlock] = useState('Block A');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '40px 20px' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
        <button
          onClick={() => navigate('/warden')}
          style={{ position: 'absolute', top: '-48px', left: '0', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={18} /> Back to Warden Dashboard
        </button>

        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 className="gradient-text">Register New Student</h1>
          <p style={{ color: 'var(--text-muted)' }}>Create a official account for a new hostel resident.</p>
        </div>

        <div className="glass-panel" style={{ marginBottom: '24px', padding: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Assign Hostel Block:</label>
          <select 
            value={selectedBlock} 
            onChange={(e) => setSelectedBlock(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }}
          >
            <option value="Block A" style={{ color: 'black' }}>Block A</option>
            <option value="Block B" style={{ color: 'black' }}>Block B</option>
            <option value="Block C" style={{ color: 'black' }}>Block C</option>
            <option value="Block D" style={{ color: 'black' }}>Block D</option>
            <option value="Block E" style={{ color: 'black' }}>Block E</option>
          </select>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            This block will be permanently associated with the student's account for warden analytics.
          </p>
        </div>

        <SignUp 
          appearance={{
            elements: {
              rootBox: "glass-panel animate-fade-in",
              card: "bg-transparent shadow-none border-none",
              headerTitle: "gradient-text text-2xl",
              headerSubtitle: "text-muted-foreground",
              formButtonPrimary: "btn btn-primary w-full",
              footer: "hidden",
            }
          }}
          routing="path"
          path="/warden/signup"
          signInUrl="/login/student"
          forceRedirectUrl="/student" // After registration, they can go to their dashboard
          unsafeMetadata={{ role: 'student', block: selectedBlock }}
        />
      </div>
    </div>
  );
};

export default StudentSignUp;
