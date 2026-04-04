import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert, CheckCircle, Activity, Heart, Moon } from 'lucide-react';
import { useUser } from '@clerk/react';
import { sendParentAlert } from '../utils/emailService';

const row = (label, val, unit = '', color = 'var(--text-main)') =>
  val != null ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: '600', color }}>{val}{unit}</span>
    </div>
  ) : null;

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [regno, setRegno] = useState(user?.publicMetadata?.linkedStudentRegno || '');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const [alertMsg, setAlertMsg] = useState('');
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);

  const [parentStress, setParentStress] = useState(3);
  const [savingLog, setSavingLog] = useState(false);
  const [logStatus, setLogStatus] = useState('');

  React.useEffect(() => {
    const fetchLink = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/meta/${user.id}`);
        if (res.data.linked_regno) {
          const lr = res.data.linked_regno.trim().toLowerCase();
          setRegno(lr);
          const summaryRes = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/wellbeing/summary/${lr}`);
          setSummary(summaryRes.data);
        } else if (user.publicMetadata?.linkedStudentRegno) {
          // Fallback if user has Clerk metadata instead
          const cr = user.publicMetadata.linkedStudentRegno.trim().toLowerCase();
          setRegno(cr);
          const summaryRes = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/wellbeing/summary/${cr}`);
          setSummary(summaryRes.data);
        }
      } catch (err) {
        console.error('Data loading failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLink();
  }, [user]);

  const fetchSummary = async (e) => {
    e.preventDefault();
    if (!regno) return;
    setLoading(true);
    setSummary(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/wellbeing/summary/${regno.trim().toLowerCase()}`);
      setSummary(res.data);
    } catch {
      alert('Failed to fetch analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleAlert = async (e) => {
    e.preventDefault();
    setAlerting(true);
    try {
      await axios.post((process.env.REACT_APP_API_URL || (process.env.REACT_APP_API_URL || 'http://localhost:5000')) + '/api/warden/alert', {
        regno: regno.trim().toLowerCase(),
        message: alertMsg || 'Parent reported concerns regarding student.'
      });
      await sendParentAlert(regno.trim().toLowerCase(), alertMsg || 'Parent reported concerns regarding student.');
      setAlerted(true);
      setTimeout(() => setAlerted(false), 5000);
      setAlertMsg('');
    } catch {
      alert('Failed to send alert.');
    } finally {
      setAlerting(false);
    }
  };

  const handleLogStress = async (e) => {
    e.preventDefault();
    if (!regno) return;
    setSavingLog(true);
    try {
      await axios.post((process.env.REACT_APP_API_URL || (process.env.REACT_APP_API_URL || 'http://localhost:5000')) + '/api/wellbeing', {
        regno: regno.trim().toLowerCase(),
        submitted_by: 'parent',
        parent_stress_obs: parseInt(parentStress)
      });
      setLogStatus('Observation saved!');
      setTimeout(() => setLogStatus(''), 3000);
    } catch {
      alert('Failed to save observation.');
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '40px 20px' }}>
      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <h1 className="gradient-text">Parent Portal</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {regno 
            ? `Monitoring Well-being for Student: ${regno.toUpperCase()}` 
            : `Logged in as Parent: ${user?.username || 'User'}. Please link a student account.`}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        {!regno && (
          <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
            <div className="glass-panel">
              <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-muted)' }}>Student Search</h3>
              <form onSubmit={fetchSummary}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Student Registration No.</label>
                  <input
                    type="text"
                    value={regno}
                    onChange={e => setRegno(e.target.value)}
                    placeholder="e.g., 3223a"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Searching...' : 'View Analytics'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div style={{ flex: regno ? '1 1 300px' : '1 1 300px', maxWidth: '400px' }}>

          {summary?.has_data && (
            <>
              <div className="glass-panel" style={{ marginTop: '24px', border: '1px solid var(--accent)' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                  <Activity size={20} /> Log Stress Observation
                </h3>
                <form onSubmit={handleLogStress}>
                  <label style={{ display: 'block', marginBottom: '8px' }}>How stressed does your child seem today?</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <input 
                      type="range" min="1" max="5" 
                      value={parentStress} 
                      onChange={e => setParentStress(e.target.value)} 
                      style={{ flex: 1 }}
                    />
                    <strong style={{ minWidth: '40px', color: 'var(--accent)' }}>{parentStress}/5</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingLog}>
                      {savingLog ? 'Saving...' : 'Save Observation'}
                    </button>
                    {logStatus && <span style={{ color: 'var(--success)', display: 'flex', gap: '4px', alignItems: 'center' }}><CheckCircle size={16}/> {logStatus}</span>}
                  </div>
                </form>
              </div>

              <div className="glass-panel" style={{ marginTop: '24px', border: '1px solid var(--danger)' }}>
                <h3 style={{ marginBottom: '16px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={20} /> Inform Warden
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  If you notice concerning patterns in your child's analytics, you can send a direct alert to the hostel warden.
                </p>
                <form onSubmit={handleAlert}>
                  <textarea
                    value={alertMsg}
                    onChange={e => setAlertMsg(e.target.value)}
                    placeholder="Additional details..."
                    style={{ width: '100%', minHeight: '80px', marginBottom: '16px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button type="submit" className="btn btn-danger" disabled={alerting}>
                      {alerting ? 'Sending...' : 'Send Alert'}
                    </button>
                    {alerted && <span style={{ color: 'var(--danger)', display: 'flex', gap: '4px', alignItems: 'center' }}><CheckCircle size={16} /> Alert Sent</span>}
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        <div style={{ flex: '2 1 400px' }}>
          {summary ? (
            summary.has_data ? (
              <div className="glass-panel">
                <h2 style={{ marginBottom: '24px', color: '#f472b6' }}>7-Day Analytics for {regno.toUpperCase()}</h2>

                {(summary.student?.avg_stress >= 4 || summary.friend?.avg_stress_obs >= 4) && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--danger)', marginBottom: '24px' }}>
                    <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '4px' }}>Attention</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Your child's recent analytics show elevated stress levels.</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ color: 'var(--accent)', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Heart size={16} /> Student Self-Reported</h3>
                    {row('Avg Stress', summary.student?.avg_stress, '/5', summary.student?.avg_stress >= 4 ? 'var(--danger)' : 'var(--primary)')}
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ color: '#34d399', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '16px' }}>👥</span> Peer Observations</h3>
                    {summary.friend?.count > 0 ? (
                      <>
                        {row('Observed Stress', summary.friend?.avg_stress_obs, '/5', summary.friend?.avg_stress_obs >= 4 ? 'var(--danger)' : 'var(--primary)')}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>Based on {summary.friend.count} reports</p>
                      </>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No peer observations recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <p style={{ color: 'var(--text-muted)' }}>No data available for student {regno.toUpperCase()}</p>
              </div>
            )
          ) : (
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Enter a Student Registration No. to view analytics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
