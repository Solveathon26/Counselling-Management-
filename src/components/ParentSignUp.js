import React, { useState } from 'react';
import { SignUp, useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ParentSignUp = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [studentRegno, setStudentRegno] = useState('');
  const [linking, setLinking] = useState(false);

  // If the user is already signed up, handle the linking
  const handleLink = async (e) => {
    e.preventDefault();
    if (!studentRegno || !user) return;
    setLinking(true);
    try {
      // Logic to update Clerk metadata or save link in MongoDB
      // For now, let's assume we update Clerk metadata via a backend proxy
      await axios.post('http://localhost:5000/api/users/link', {
        clerk_id: user.id,
        role: 'parent',
        linked_regno: studentRegno.trim().toLowerCase()
      });
      alert('Linked successfully!');
      navigate('/parent');
    } catch (err) {
      console.error(err);
      alert('Failed to establish link.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '40px 20px' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <h1 className="gradient-text" style={{ marginBottom: '16px', textAlign: 'center' }}>Parent Registration</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center' }}>Establish a secure link to your child's student account.</p>

        {!user ? (
          <SignUp 
            appearance={{
              elements: {
                rootBox: "glass-panel",
                card: "bg-transparent shadow-none border-none",
                formButtonPrimary: "btn btn-primary w-full",
              }
            }}
            routing="path"
            path="/sign-up/parent"
            signInUrl="/login/parent"
            forceRedirectUrl="/sign-up/parent/link" // After signup, they need to select the student
            unsafeMetadata={{ role: 'parent' }}
          />
        ) : (
          <div className="glass-panel">
            <h3 style={{ marginBottom: '24px' }}>Finalize Linkage</h3>
            <form onSubmit={handleLink}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Your Child's Student Registration No.</label>
                <input 
                  type="text" 
                  value={studentRegno} 
                  onChange={e => setStudentRegno(e.target.value)} 
                  placeholder="e.g. 3223a"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={linking}>
                {linking ? 'Establishing Link...' : 'Finish Setup'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentSignUp;
