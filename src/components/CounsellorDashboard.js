import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Brain, Calendar, ShieldAlert, User, CheckCircle, Video } from 'lucide-react';
import { useUser } from '@clerk/react';

const CounsellorDashboard = () => {
  const { user } = useUser();
  const [appointments, setAppointments] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [myStudents, setMyStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState({
    name: user?.fullName || '',
    specialization: 'General Support'
  });
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const aptRes = await axios.get('http://localhost:5000/api/counselling/appointments');
        const predRes = await axios.get('http://localhost:5000/api/ml/predict');
        setAppointments(aptRes.data);
        setPredictions(predRes.data);
        
        // Fetch current profile
        const cRes = await axios.get('http://localhost:5000/api/counsellors');
        const myProfile = cRes.data.find(c => c.clerk_id === user?.id);
        if (myProfile) {
          setProfile({ name: myProfile.name, specialization: myProfile.specialization });
          const myStRes = await axios.get(`http://localhost:5000/api/counselling/my_students/${encodeURIComponent(myProfile.name)}`);
          setMyStudents(myStRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await axios.post('http://localhost:5000/api/counsellors/profile', {
        clerk_id: user?.id,
        name: profile.name,
        specialization: profile.specialization
      });
      setUpdated(true);
      setTimeout(() => setUpdated(false), 3000);
    } catch (err) {
      console.error('Counsellor Profile Update Error:', err.response || err);
      alert('Failed to update profile. Please see console for details.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div>Loading Counsellor Data...</div>;

  const sosAppointments = appointments.filter(a => a.is_sos && a.counsellor_name === profile.name);
  const regularAppointments = appointments.filter(a => !a.is_sos && a.counsellor_name === profile.name);

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h1>Counsellor Portal</h1>
        <p style={{ color: 'var(--text-muted)' }}>Logged in as: <strong>{profile.name || user?.username}</strong></p>
      </div>

      {/* Profile Section */}
      <div className="glass-panel" style={{ marginBottom: '32px', border: '1px solid var(--primary)' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <User size={24} /> Complete Your Professional Profile
        </h2>
        <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Public Name (Visible to Students)</label>
            <input 
              type="text" 
              value={profile.name} 
              onChange={e => setProfile({...profile, name: e.target.value})}
              placeholder="e.g. Dr. Jane Smith"
              required
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Specialization</label>
            <input 
              type="text" 
              value={profile.specialization} 
              onChange={e => setProfile({...profile, specialization: e.target.value})}
              placeholder="e.g. Stress Management"
              required
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={updating}>
              {updating ? 'Saving...' : 'Update Public Profile'}
            </button>
            {updated && <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={16}/> Saved!</span>}
          </div>
        </form>
        <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tip: Your profile will appear in the Student Portal for session booking.
        </p>
      </div>

      <div className="grid-cards">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ border: sosAppointments.length > 0 ? '1px solid var(--danger)' : '' }}>
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
              <ShieldAlert size={24} /> Urgent SOS Requests
            </h2>
            {sosAppointments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No urgent SOS requests at the moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sosAppointments.map((apt, i) => (
                  <div key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
                    <strong>Student ID:</strong> {apt.regno} <br />
                    <small style={{ color: 'var(--text-muted)' }}>Requested: {new Date(apt.created_at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel">
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={24} color="var(--primary)" /> Scheduled Sessions
            </h2>
            {regularAppointments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No regular appointments scheduled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {regularAppointments.map((apt, i) => (
                  <div key={i} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '1rem' }}>Student ID: {apt.regno}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Scheduled: {apt.date}</span>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        color: 'var(--primary)', 
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.9rem'
                      }}
                      onClick={() => window.open(`https://meet.jit.si/counselling-${apt.regno.replace(/\s+/g, '-')}-${apt.date}`, '_blank')}
                    >
                      <Video size={18} /> Join Video Session
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ border: '1px solid var(--success)' }}>
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
              <User size={24} /> My Linked Students
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
              Detailed analytics for students assigned to you through sessions.
            </p>
            {myStudents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No students linked yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myStudents.map((st, i) => (
                  <div key={i} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', borderLeft: st.is_alarming ? '4px solid var(--danger)' : '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '1.1rem' }}>Student ID: {st.regno.toUpperCase()}</strong>
                      {st.is_alarming && <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 'bold' }}>Needs Attention</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Avg Mood:</span> <strong style={{ color: 'var(--accent)' }}>{st.avg_mood ?? 'N/A'}/5</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Avg Stress:</span> <strong style={{ color: st.avg_stress >= 4 ? 'var(--danger)' : 'var(--primary)' }}>{st.avg_stress ?? 'N/A'}/5</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Parent Stress:</span> <strong style={{ color: st.parent_stress >= 4 ? 'var(--danger)' : 'var(--primary)' }}>{st.parent_stress ?? 'N/A'}/5</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>AI Predicted Risk:</span> <strong style={{ color: st.ml_risk === 'High' ? 'var(--danger)' : 'var(--success)' }}>{st.ml_risk}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Prediction Score:</span> <strong style={{ color: 'var(--accent)' }}>{st.ml_score}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Meals Missed:</span> <strong>{st.meals_missed}</strong></div>
                      <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Parent Contact:</span> {st.parents_contact}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
              <Brain size={24} /> ML Predictive Insights
            </h2>
            <span style={{ background: 'var(--accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Beta API</span>
          </div>
          
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
            The machine learning model flags anonymized student hashes that display predictive patterns of declining mental health based on historical pulse logs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {predictions.map((pred, i) => (
              <div key={i} style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', borderLeft: `4px solid ${pred.risk_level === 'High' ? 'var(--danger)' : 'var(--primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                    {(pred.student_hash || pred.regno || '').substring(0, 16)}...
                  </strong>
                  <span style={{ color: pred.risk_level === 'High' ? 'var(--danger)' : 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{pred.risk_level} Risk</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pattern: {pred.reason}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CounsellorDashboard;
