import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Lock, Users, ChevronDown, ChevronUp, UserPlus, MessageSquare } from 'lucide-react';
import API_URL from '../config';

const WardenDashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [res, compRes] = await Promise.all([
          axios.get(`${API_URL}/api/analytics/blocks`),
          axios.get(`${API_URL}/api/complaints`)
        ]);
        setAnalytics(res.data);
        setComplaints(compRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const toggleBlockDetail = async (block) => {
    if (selectedBlock === block) {
      setSelectedBlock(null);
      setStudents([]);
      return;
    }

    setSelectedBlock(block);
    setStudentsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/analytics/students/${block}`);
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStudentsLoading(false);
    }
  };

  if (loading) return <div>Loading Analytics...</div>;

  const highStressBlocks = analytics.filter(block => block.avg_stress >= 3.5);

  const getMoodColor = (score) => {
    if (score >= 4) return 'var(--success)';
    if (score >= 3) return 'var(--primary)';
    return 'var(--danger)';
  };

  const getStressColor = (score) => {
    if (score >= 4) return 'var(--danger)';
    if (score >= 3) return '#f59e0b';
    return 'var(--success)';
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Block Analytics</h1>
          <p style={{ color: 'var(--text-muted)' }}>Aggregated hostel well-being metrics. Click a block to see individual details.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <button 
            onClick={() => navigate('/warden/signup')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', width: '220px' }}
          >
            <UserPlus size={18} /> Sign Up New Student
          </button>
          <button 
            onClick={() => navigate('/warden/counsellor/signup')}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', width: '220px', background: 'var(--accent)' }}
          >
            <UserPlus size={18} /> Sign Up Counsellor
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--primary)', color: 'var(--primary)', marginTop: '8px' }}>
            <Lock size={14} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Privacy-Preserved (SHA-256)</span>
          </div>
        </div>
      </div>

      {highStressBlocks.length > 0 && (
        <div className="glass-panel" style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '32px' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={24} /> Action Required
          </h2>
          <p style={{ marginBottom: '16px' }}>The following blocks have aggregated high-stress and require counsellor visits:</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {highStressBlocks.map(b => (
              <div key={b.block} style={{ background: 'var(--danger)', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}>
                {b.block} (Avg Stress: {b.avg_stress})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="glass-panel" style={{ height: '380px', marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '24px' }}>Block-Level Stress & Mood Distribution</h2>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={analytics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="block" stroke="var(--text-main)" />
            <YAxis stroke="var(--text-muted)" domain={[0, 5]} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
            <Legend />
            <Bar dataKey="avg_stress" name="Avg Stress Level" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="avg_mood" name="Avg Mood Level" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Complaints Box */}
      <div className="glass-panel" style={{ marginBottom: '32px', border: '1px solid var(--accent)' }}>
        <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
          <MessageSquare size={24} /> Anonymous Feedback & Complaints
        </h2>
        {complaints.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No anonymous complaints have been submitted yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {complaints.map((c, i) => (
              <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <strong style={{ color: 'var(--accent)' }}>{c.block}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.95rem', margin: 0, whiteSpace: 'pre-wrap' }}>{c.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block Cards with expandable individual details */}
      <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users size={22} color="var(--primary)" /> Block Details
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {analytics.map(b => (
          <div key={b.block} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Block Summary Row */}
            <div
              className="glass-panel"
              onClick={() => toggleBlockDetail(b.block)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selectedBlock === b.block ? '0' : '0', borderBottomLeftRadius: selectedBlock === b.block ? '0' : '16px', borderBottomRightRadius: selectedBlock === b.block ? '0' : '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <h3 style={{ minWidth: '80px' }}>{b.block}</h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{b.total_logs} total entries</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Avg Mood: </span>
                  <span style={{ fontWeight: 'bold', color: getMoodColor(b.avg_mood) }}>{b.avg_mood}/5</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Avg Stress: </span>
                  <span style={{ fontWeight: 'bold', color: getStressColor(b.avg_stress) }}>{b.avg_stress}/5</span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {selectedBlock === b.block ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {/* Expandable Individual Students Table */}
            {selectedBlock === b.block && (
              <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border)', borderTop: 'none', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', padding: '24px' }}>
                {studentsLoading ? (
                  <p style={{ color: 'var(--text-muted)' }}>Loading student details...</p>
                ) : students.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No data in the last 7 days for this block.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ color: 'var(--text-muted)' }}>Individual Student Averages (Last 7 Days)</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <Lock size={12} />
                        IDs anonymized via SHA-256
                      </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left',   padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Anon ID</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Mood</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Stress</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Sleep</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Screen</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Missed</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Meals Skipped</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Entries</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.8rem' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: s.is_alarming ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                            <td style={{ padding: '11px 12px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.short_id}...</td>
                            <td style={{ padding: '11px 12px', textAlign: 'center', fontWeight: 'bold', color: getMoodColor(s.avg_mood) }}>{s.avg_mood ?? '—'}/5</td>
                            <td style={{ padding: '11px 12px', textAlign: 'center', fontWeight: 'bold', color: getStressColor(s.avg_stress) }}>{s.avg_stress ?? '—'}/5</td>
                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#a78bfa' }}>{s.avg_sleep != null ? `${s.avg_sleep}h` : '—'}</td>
                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#38bdf8' }}>{s.avg_screen != null ? `${s.avg_screen}h` : '—'}</td>
                            <td style={{ padding: '11px 12px', textAlign: 'center', color: s.avg_missed >= 4 ? 'var(--danger)' : '#fb923c' }}>{s.avg_missed ?? '—'}</td>
                            <td style={{ padding: '11px 12px', textAlign: 'center', color: s.avg_meals_skipped >= 2 ? 'var(--danger)' : '#f472b6' }}>{s.avg_meals_skipped ?? '—'}</td>
                            <td style={{ padding: '11px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>{s.logs_count}</td>
                            <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                              {s.is_alarming
                                ? <span style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 'bold' }}>⚠ Alert</span>
                                : <span style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--success)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem' }}>✓ OK</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default WardenDashboard;
