import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ShieldAlert, Calendar, CheckCircle, Activity, Heart, Moon, Zap, Video } from 'lucide-react';
import { useUser } from '@clerk/react';

const socket = io('http://localhost:5000', { transports: ['polling', 'websocket'] });

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
  const block = user?.publicMetadata?.block || 'Block A';

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

  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [addFriendRegno, setAddFriendRegno] = useState('');
  const [connStatus, setConnStatus] = useState('');
  const [incomingPing, setIncomingPing] = useState(null);

  const [form, setForm] = useState({
    mood_score: 3,
    stress_score: 3,
    pulse_bpm: 72,
    sleep_hours: 7,
    social_life: 3,
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

      const friendRes = await axios.get(`http://localhost:5000/api/friends/${regno}`);
      const fList = friendRes.data.friends || [];
      setFriendsList(fList);
      setPendingRequests(friendRes.data.pending_requests || []);

      if (fList.length > 0 && (!selectedFriend || !fList.includes(selectedFriend))) {
        setSelectedFriend(fList[0]);
      } else if (fList.length === 0) {
        setSelectedFriend('');
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [regno, selectedCounsellor, selectedFriend]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (regno) {
      socket.emit('join', { regno });
    }
  }, [regno]);

  useEffect(() => {
    socket.on('new_friend_request', (data) => {
      setPendingRequests(prev => {
        if (!prev.includes(data.sender)) return [...prev, data.sender];
        return prev;
      });
      setIncomingPing(data.sender);
    });

    socket.on('friend_request_approved', (data) => {
      setFriendsList(prev => {
        if (!prev.includes(data.user)) return [...prev, data.user];
        return prev;
      });
      fetchSummary(); 
    });

    return () => {
      socket.off('new_friend_request');
      socket.off('friend_request_approved');
    };
  }, [fetchSummary]);

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
      });
      setLogStatus('Entry Saved!');
      setTimeout(() => setLogStatus(''), 3000);
      fetchSummary();
    } catch { alert('Failed to save entry.'); }
    finally { setSaving(false); }
  };

  const handleFriendLog = async (e) => {
    e.preventDefault();
    if (!selectedFriend || !friendsList.includes(selectedFriend)) return;
    setFriendSaving(true);
    try {
      await axios.post('http://localhost:5000/api/wellbeing', {
        regno: selectedFriend,
        block,
        submitted_by: 'friend',
        friend_stress_obs: parseInt(friendForm.stress_obs),
        friend_social_obs: parseInt(friendForm.social_obs),
      });
      setFriendLogStatus('Friend observation saved!');
      setTimeout(() => setFriendLogStatus(''), 3000);
      fetchSummary();
    } catch { alert('Failed to save friend entry.'); }
    finally { setFriendSaving(false); }
  };

  const handleSendReq = async (e) => {
    e.preventDefault();
    if (!addFriendRegno) return;
    try {
      await axios.post('http://localhost:5000/api/friends/request', { sender: regno, target: addFriendRegno });
      setConnStatus('Request sent!');
      setAddFriendRegno('');
      setTimeout(() => setConnStatus(''), 3000);
      fetchSummary();
    } catch { alert('Failed to send request.'); }
  };

  const handleApprove = async (requester) => {
    try {
      await axios.post('http://localhost:5000/api/friends/approve', { user: regno, requester });
      if (incomingPing === requester) setIncomingPing(null);
      fetchSummary();
    } catch { alert('Failed to approve request.'); }
  };

  const handleReject = async (requester) => {
    try {
      await axios.post('http://localhost:5000/api/friends/reject', { user: regno, requester });
      if (incomingPing === requester) setIncomingPing(null);
      fetchSummary();
    } catch { alert('Failed to reject request.'); }
  };

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

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>;

  const s = summary?.student;
  const p = summary?.parent;
  const fr = summary?.friend;

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      
      {/* Real-time incoming ping modal */}
      {incomingPing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ background: 'var(--bg-dark)', border: '1px solid var(--primary)', padding: '32px', textAlign: 'center', maxWidth: '400px', width: '90%', animation: 'fade-in 0.3s ease-out' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Incoming Friend Request!</h2>
            <p style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>
              <strong>{incomingPing.toUpperCase()}</strong> has sent you a connection ping. They want to be able to log peer observations for you.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="btn btn-success" style={{ width: '120px' }} onClick={() => handleApprove(incomingPing)}>
                Approve
              </button>
              <button className="btn btn-danger" style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', width: '120px' }} onClick={() => handleReject(incomingPing)}>
                Reject
              </button>
            </div>
            <button style={{ marginTop: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => setIncomingPing(null)}>
              Decide later
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <h1>Welcome, Reg. No. {regno}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Your 7-day well-being snapshot — tracked by you, your parents, and friends.</p>
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
              <label style={{ display: 'block', marginBottom: '8px' }}>Select Friend</label>
              <select value={selectedFriend} onChange={e => setSelectedFriend(e.target.value)}>
                {friendsList.map((p, i) => <option key={i} value={p}>{p}</option>)}
                {friendsList.length === 0 && <option value="">No friends added yet</option>}
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

      {/* ─── Manage Friends ─── */}
      <div className="glass-panel" style={{ marginBottom: '32px', border: '1px solid var(--primary)' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <span style={{ fontSize: '22px' }}>🤝</span> Manage Friend Connections
        </h2>

        {pendingRequests.length > 0 && (
          <div style={{ marginBottom: '24px', background: 'rgba(239,68,68,0.05)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--danger)' }}>Pending Requests</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingRequests.map(req => (
                <div key={req} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '4px' }}>
                  <span><strong style={{ color: 'var(--text-main)' }}>{req.toUpperCase()}</strong> wants to add you</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleApprove(req)}>Approve</button>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleReject(req)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSendReq} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div style={{ flex: '1', maxWidth: '300px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Send Friend Request</label>
            <input
              list="peers_list"
              type="text"
              value={addFriendRegno}
              onChange={e => setAddFriendRegno(e.target.value)}
              placeholder="Friend's Reg No."
              style={{ marginBottom: 0 }}
              required
            />
            <datalist id="peers_list">
              {peerStudents.map((p, i) => <option key={i} value={p} />)}
            </datalist>
          </div>
          <button type="submit" className="btn btn-primary">Send Request</button>
          {connStatus && <span style={{ color: 'var(--success)' }}>{connStatus}</span>}
        </form>

        <div>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>My Friends List</h3>
          {friendsList.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {friendsList.map(f => (
                <span key={f} style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '16px', fontSize: '0.9rem', border: '1px solid rgba(59,130,246,0.3)' }}>
                  {f.toUpperCase()}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You haven't added any friends yet. Add them above to let them log observations for you!</p>
          )}
        </div>
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

            <div className="glass-panel" style={{ border: p?.count ? '1px solid rgba(244,114,182,0.35)' : '' }}>
              <h3 style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>👨‍👩‍👦 Parent Observations</h3>
              {p?.count ? (
                <>
                  {row('Mood', p?.avg_mood_obs, '/5', 'var(--accent)')}
                  {row('Stress', p?.avg_stress_obs, '/5', p?.avg_stress_obs >= 4 ? 'var(--danger)' : 'var(--primary)')}
                  {row('Sleep Cycle', p?.avg_sleep_obs, ' hrs', '#a78bfa')}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>{p.count} report(s)</p>
                </>
              ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No parent data yet. Ask your parent to use the <strong>Parent Portal</strong>.</p>}
            </div>

            <div className="glass-panel" style={{ border: fr?.count ? '1px solid rgba(52,211,153,0.35)' : '' }}>
              <h3 style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>👥 Friend Observations</h3>
              {fr?.count ? (
                <>
                  {row('Mood', fr?.avg_mood_obs, '/5', 'var(--accent)')}
                  {row('Stress', fr?.avg_stress_obs, '/5', fr?.avg_stress_obs >= 4 ? 'var(--danger)' : 'var(--primary)')}
                  {row('Social Life', fr?.avg_social_obs, '/5', '#34d399')}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>{fr.count} report(s)</p>
                </>
              ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No friend data yet. Friends can use the <strong>Friend Portal</strong>.</p>}
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
    </div>
  );
};

export default StudentDashboard;
