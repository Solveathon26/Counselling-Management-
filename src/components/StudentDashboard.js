import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ShieldAlert, Calendar, CheckCircle, Activity, Heart, Moon, Zap, Video, MessageSquare } from 'lucide-react';
import { useUser } from '@clerk/react';


const row = (label, val, unit = '', color = 'var(--text-main)') =>
  val != null ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: '600', color }}>{val}{unit}</span>
    </div>
  ) : null;

const StudentDashboard = () => {
  const { user } = useUser();
  const regno = user?.username?.toLowerCase();
  const block = user?.unsafeMetadata?.block || user?.publicMetadata?.block || 'Block A';

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [logStatus, setLogStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [counsellors, setCounsellors] = useState([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState('');
  const [appointments, setAppointments] = useState([]);

  const [peerStudents, setPeerStudents] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [friendForm, setFriendForm] = useState({ stress_obs: 3, social_obs: 3 });
  const [friendSaving, setFriendSaving] = useState(false);
  const [friendLogStatus, setFriendLogStatus] = useState('');

  const [addFriendRegno, setAddFriendRegno] = useState('');
  const [connStatus, setConnStatus] = useState('');

  const [complaintMsg, setComplaintMsg] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('');

  const [form, setForm] = useState({
    mood_score: 3,
    stress_score: 3,
    pulse_bpm: 72,
    sleep_hours: 7,
    social_life: 3,
    meals_missed: 0,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const moodLabel = ['', 'Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'];
  const stressLabel = ['', 'Very Low', 'Low', 'Manageable', 'High', 'Severe'];
  const socialLabel = ['', 'Isolated', 'Withdrawn', 'Normal', 'Socially Active', 'Very Social'];

  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/wellbeing/summary/${regno}`);
      setSummary(res.data);

      const cRes = await axios.get('http://localhost:5000/api/counsellors');
      setCounsellors(cRes.data);
      if (cRes.data.length > 0 && !selectedCounsellor) {
        setSelectedCounsellor(cRes.data[0].name);
      }

      const aptRes = await axios.get('http://localhost:5000/api/counselling/appointments');
      const myApts = aptRes.data.filter(a => a.regno === regno);
      setAppointments(myApts);

      const stdRes = await axios.get('http://localhost:5000/api/students/all');
      const peers = stdRes.data.filter(id => id !== regno);
      setPeerStudents(peers);

      if (peers.length > 0 && (!selectedFriend || !peers.includes(selectedFriend))) {
        setSelectedFriend(peers[0]);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [regno, selectedCounsellor, selectedFriend]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    // Socket logic removed as per request
  }, []);

  const handleLogWellbeing = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('http://localhost:5000/api/wellbeing', {
        regno,
        block,
        submitted_by: 'student',
        mood_score: parseInt(form.mood_score),
        stress_score: parseInt(form.stress_score),
        pulse_bpm: parseInt(form.pulse_bpm),
        sleep_hours: parseFloat(form.sleep_hours),
        social_life: parseInt(form.social_life),
        meals_missed: parseInt(form.meals_missed),
      });
      setLogStatus('Entry Saved!');
      setTimeout(() => setLogStatus(''), 3000);
      fetchSummary();
    } catch { alert('Failed to save entry.'); }
    finally { setSaving(false); }
  };

  const handleFriendLog = async (e) => {
    e.preventDefault();
    if (!selectedFriend) return;
    setFriendSaving(true);
    try {
      await axios.post('http://localhost:5000/api/wellbeing', {
        regno: selectedFriend,
        block,
        submitted_by: 'friend',
        friend_stress_obs: parseInt(friendForm.stress_obs),
        friend_social_obs: parseInt(friendForm.social_obs),
      });
      setFriendLogStatus('Peer observation saved!');
      setTimeout(() => setFriendLogStatus(''), 3000);
      fetchSummary();
    } catch { alert('Failed to save peer entry.'); }
    finally { setFriendSaving(false); }
  };

  // Friend request handlers removed

  const handleBook = async (isSos = false) => {
    if (!isSos && !bookingDate) { alert('Please select a date.'); return; }
    try {
      await axios.post('http://localhost:5000/api/counselling/book', {
        regno,
        date: isSos ? new Date().toISOString().split('T')[0] : bookingDate,
        is_sos: isSos,
        counsellor_name: isSos ? 'Emergency Duty Counsellor' : selectedCounsellor
      });
      setBookingStatus(isSos ? 'SOS Alert Sent! Counsellor will contact you shortly.' : 'Session Booked!');
      fetchSummary();
      setTimeout(() => setBookingStatus(''), 5000);
    } catch { alert('Failed to book session.'); }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    if (!complaintMsg.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/complaints', {
        block: block,
        message: complaintMsg
      });
      setComplaintStatus('Sent anonymously!');
      setComplaintMsg('');
      setTimeout(() => setComplaintStatus(''), 4000);
    } catch {
      alert('Failed to send complaint.');
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>;

  const s = summary?.student;
  const p = summary?.parent;
  const fr = summary?.friend;

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>



      <div className="dashboard-header">
        <h1>Welcome, Reg. No. {regno}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Your 7-day well-being snapshot — tracked by you and your friends.</p>
      </div>

      {/* SOS Banner */}
      {summary?.is_alarming && (
        <div className="glass-panel" style={{ border: '1px solid var(--danger)', background: 'rgba(239,68,68,0.1)', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ShieldAlert color="var(--danger)" size={48} />
            <div>
              <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>High Stress Detected</h2>
              <p>Your recent tracking shows elevated levels. We strongly recommend speaking to a counsellor.</p>
              <button onClick={() => handleBook(true)} className="btn btn-danger" style={{ marginTop: '16px' }}>
                Trigger SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ML Prediction Badge */}
      {summary?.prediction && (
        <div className="glass-panel" style={{
          marginBottom: '32px',
          border: `1px solid ${summary.prediction.risk_level === 'High' ? 'var(--danger)' : 'var(--accent)'}`,
          background: 'rgba(255,255,255,0.02)'
        }}>
          <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
            <Zap size={20} /> ML Health Insight
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Based on your patterns, our AI predicts your current stress level as:
            </p>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                background: summary.prediction.risk_level === 'High' ? 'var(--danger)' : 'var(--accent)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                {summary.prediction.risk_level} Risk
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Score: {summary.prediction.risk_score}/100
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Daily Check-in ─── */}
      <div className="glass-panel" style={{ marginBottom: '32px', border: '1px solid var(--accent)' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent)' }}>
          <Activity size={22} /> Daily Check-in
        </h2>

        <form onSubmit={handleLogWellbeing}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '28px' }}>

            {/* Mood */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Heart size={15} color="var(--accent)" /> Mood</span>
                <strong style={{ color: 'var(--accent)' }}>{moodLabel[form.mood_score]}</strong>
              </label>
              <input type="range" min="1" max="5" value={form.mood_score} onChange={e => set('mood_score', e.target.value)} />
            </div>

            {/* Stress */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={15} color="var(--primary)" /> Stress Level</span>
                <strong style={{ color: form.stress_score >= 4 ? 'var(--danger)' : 'var(--primary)' }}>{stressLabel[form.stress_score]}</strong>
              </label>
              <input type="range" min="1" max="5" value={form.stress_score} onChange={e => set('stress_score', e.target.value)} />
            </div>

            {/* Pulse BPM */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={15} color="#f472b6" /> Pulse Rate</span>
                <strong style={{ color: form.pulse_bpm > 100 ? 'var(--danger)' : '#f472b6' }}>{form.pulse_bpm} BPM</strong>
              </label>
              <input
                type="number"
                min="40" max="200"
                value={form.pulse_bpm}
                onChange={e => set('pulse_bpm', e.target.value)}
                placeholder="e.g. 72"
                style={{ marginBottom: 0 }}
              />
            </div>

            {/* Sleep */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Moon size={15} color="#a78bfa" /> Sleep Hours</span>
                <strong style={{ color: '#a78bfa' }}>{form.sleep_hours} hrs</strong>
              </label>
              <input type="range" min="1" max="12" step="0.5" value={form.sleep_hours} onChange={e => set('sleep_hours', e.target.value)} />
            </div>

            {/* Social Life */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '15px' }}>👥</span> Social Life</span>
                <strong style={{ color: '#34d399' }}>{socialLabel[form.social_life]}</strong>
              </label>
              <input type="range" min="1" max="5" value={form.social_life} onChange={e => set('social_life', e.target.value)} />
            </div>

            {/* Meals Missed */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={15} color="#f472b6" /> Meals Missed Today</span>
                <strong style={{ color: form.meals_missed > 2 ? 'var(--danger)' : '#f472b6' }}>{form.meals_missed || 0}</strong>
              </label>
              <input
                type="number"
                min="0" max="10"
                value={form.meals_missed}
                onChange={e => set('meals_missed', e.target.value)}
                placeholder="0"
                style={{ marginBottom: 0 }}
              />
            </div>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '28px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
            {logStatus && (
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> {logStatus}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ─── Friend Check-in ─── */}
      <div className="glass-panel" style={{ marginBottom: '32px', border: '1px solid rgba(52,211,153,0.4)' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399' }}>
          <span style={{ fontSize: '22px' }}>👥</span> Log Friend Observation
        </h2>
        <form onSubmit={handleFriendLog}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '28px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Select Student</label>
              <select value={selectedFriend} onChange={e => setSelectedFriend(e.target.value)}>
                {peerStudents.map((p, i) => <option key={i} value={p}>{p}</option>)}
                {peerStudents.length === 0 && <option value="">No other students found</option>}
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={15} color="#34d399" /> Stress Level</span>
                <strong style={{ color: friendForm.stress_obs >= 4 ? 'var(--danger)' : '#34d399' }}>{stressLabel[friendForm.stress_obs]}</strong>
              </label>
              <input type="range" min="1" max="5" value={friendForm.stress_obs} onChange={e => setFriendForm({ ...friendForm, stress_obs: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '15px' }}>👥</span> Social Life</span>
                <strong style={{ color: '#34d399' }}>{socialLabel[friendForm.social_obs]}</strong>
              </label>
              <input type="range" min="1" max="5" value={friendForm.social_obs} onChange={e => setFriendForm({ ...friendForm, social_obs: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '28px' }}>
            <button type="submit" className="btn btn-secondary" disabled={friendSaving}>
              {friendSaving ? 'Saving...' : 'Save Observation'}
            </button>
            {friendLogStatus && (
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> {friendLogStatus}
              </span>
            )}
          </div>
        </form>
      </div>



      {/* ─── 7-Day Summary ─── */}
      {summary?.has_data && (
        <>
          <h2 style={{ marginBottom: '16px' }}>Your 7-Day Averages</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>

            <div className="glass-panel">
              <h3 style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>📊 Self-Reported</h3>
              {row('Mood', s?.avg_mood, '/5', 'var(--accent)')}
              {row('Stress', s?.avg_stress, '/5', s?.avg_stress >= 4 ? 'var(--danger)' : 'var(--primary)')}
              {row('Pulse Rate', s?.avg_pulse, ' BPM', s?.avg_pulse > 100 ? 'var(--danger)' : '#f472b6')}
              {row('Sleep', s?.avg_sleep, ' hrs', '#a78bfa')}
              {row('Social Life', s?.avg_social, '/5', '#34d399')}
              {!s?.count && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No entries yet.</p>}
            </div>


            <div className="glass-panel" style={{ border: fr?.count ? '1px solid rgba(52,211,153,0.35)' : '' }}>
              <h3 style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>👥 Peer Observations</h3>
              {fr?.count ? (
                <>
                  {row('Mood', fr?.avg_mood_obs, '/5', 'var(--accent)')}
                  {row('Stress', fr?.avg_stress_obs, '/5', fr?.avg_stress_obs >= 4 ? 'var(--danger)' : 'var(--primary)')}
                  {row('Social Life', fr?.avg_social_obs, '/5', '#34d399')}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>{fr.count} report(s)</p>
                </>
              ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No peer data yet. Peers can log observations for you from their dashboard.</p>}
            </div>

          </div>
        </>
      )}

      {/* ─── Book Session ─── */}
      <div className="glass-panel">
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={24} color="var(--primary)" /> Book a Counselling Session
        </h2>
        {bookingStatus && (
          <div style={{ padding: '14px', background: 'rgba(16,185,129,0.15)', border: '1px solid var(--success)', borderRadius: '8px', marginBottom: '20px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} /> {bookingStatus}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Choose Counsellor</label>
            <select value={selectedCounsellor} onChange={e => setSelectedCounsellor(e.target.value)}>
              {counsellors.map((c, i) => (
                <option key={i} value={c.name}>{c.name} ({c.specialization})</option>
              ))}
              {counsellors.length === 0 && <option>No counsellors registered yet</option>}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={{ marginBottom: 0 }} />
            <button className="btn btn-primary" onClick={() => handleBook(false)}>Book</button>
          </div>
        </div>

        {/* Upcoming Sessions */}
        {appointments.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Upcoming Sessions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appointments.map((apt, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block' }}>{apt.counsellor_name}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{apt.date}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onClick={() => window.open(`https://meet.jit.si/counselling-${regno.replace(/\s+/g, '-')}-${apt.date}`, '_blank')}
                    >
                      <Video size={14} /> Join Video Session
                    </button>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: apt.status === 'pending' ? 'rgba(255,255,255,0.1)' : 'rgba(52,211,153,0.1)',
                      color: apt.status === 'pending' ? 'var(--text-muted)' : 'var(--success)'
                    }}>
                      {apt.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Anonymous Complaint Box ─── */}
      <div className="glass-panel" style={{ marginTop: '32px', border: '1px solid var(--accent)' }}>
        <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
          <MessageSquare size={24} /> Anonymous Warden Feedback
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
          Report issues safely. Your Registration Number will <strong>never</strong> be shared with the warden, only your hostel block ({block}).
        </p>
        <form onSubmit={handleComplaintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            rows="4"
            placeholder="Describe your issue or provide feedback here..."
            value={complaintMsg}
            onChange={(e) => setComplaintMsg(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              border: '1px solid var(--border)',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button type="submit" className="btn btn-secondary" style={{ background: 'var(--accent)', color: 'white' }}>
              Send Anonymously
            </button>
            {complaintStatus && (
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> {complaintStatus}
              </span>
            )}
          </div>
        </form>
      </div>

    </div>
  );
};

export default StudentDashboard;
