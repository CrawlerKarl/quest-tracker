'use client';

import { useState, useEffect } from 'react';

interface Submission {
  id: number;
  quest_id: number;
  quest_title: string;
  quest_category: string;
  quest_difficulty: string;
  quest_xp_reward: number;
  evidenceLinks: string[];
  reflection: string;
  submitted_at: string;
}

interface Quest {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  xp_reward: number;
  steps: string[];
  why_it_matters: string;
  safety_notes: string;
  evidenceExamples: string[];
  is_active: boolean;
  is_locked: boolean;
  is_lucky_quest?: boolean;
  tier?: string;
  unlock_at_xp?: number;
  sort_order: number;
  progress: {
    id: number;
    status: string;
  } | null;
}

interface Stats {
  totalXp: number;
  level: number;
  questsCompleted: number;
  currentStreak: number;
}

interface Activity {
  id: number;
  action: string;
  quest_title: string;
  details: any;
  created_at: string;
}

const REACTIONS = ['🔥', '💪', '👏', '🎯', '💎'];

const TIERS = [
  { value: 'rookie', label: '🌱 ROOKIE', xp: 0 },
  { value: 'apprentice', label: '⚡ APPRENTICE', xp: 500 },
  { value: 'pro', label: '🔥 PRO', xp: 1500 },
  { value: 'elite', label: '💎 ELITE', xp: 3500 },
  { value: 'legend', label: '👑 LEGEND', xp: 7000 },
];

function getRank(xp: number): { name: string; icon: string; color: string } {
  if (xp >= 7000) return { name: 'LEGEND', icon: '👑', color: '#ffd700' };
  if (xp >= 3500) return { name: 'ELITE', icon: '💎', color: '#ff0080' };
  if (xp >= 1500) return { name: 'PRO', icon: '🔥', color: '#ff9500' };
  if (xp >= 500) return { name: 'APPRENTICE', icon: '⚡', color: '#00d4ff' };
  return { name: 'ROOKIE', icon: '🌱', color: '#9898a8' };
}

export default function GuideDashboard() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'quests' | 'history'>('inbox');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [questForm, setQuestForm] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    xpReward: 100,
    steps: [''],
    whyItMatters: '',
    safetyNotes: '',
    evidenceExamples: [''],
    isLocked: true,
    tier: 'rookie',
    unlockAtXp: 0,
    sortOrder: 999,
  });
  const [saving, setSaving] = useState(false);
  const [showHeroUrl, setShowHeroUrl] = useState(false);
  
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchData() {
    try {
      const [submissionsRes, questsRes, statsRes, activityRes] = await Promise.all([
        fetch('/api/submissions'),
        fetch('/api/quests'),
        fetch('/api/stats'),
        fetch('/api/activity'),
      ]);

      const submissionsData = await submissionsRes.json();
      const questsData = await questsRes.json();
      const statsData = await statsRes.json();
      const activityData = await activityRes.json();

      setSubmissions(submissionsData.submissions || []);
      setQuests(questsData.quests || []);
      setStats(statsData.stats);
      setActivities(activityData.activities || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(action: 'approve' | 'reject') {
    if (!selectedSubmission) return;
    
    setReviewing(true);
    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback }),
      });

      const data = await res.json();
      
      if (res.ok) {
        if (action === 'approve') {
          setToast(`✅ Approved! Hero earned +${data.xpAwarded} XP`);
        } else {
          setToast('🔄 Sent back for revision');
        }
        setSelectedSubmission(null);
        setFeedback('');
        fetchData();
      } else {
        alert(data.error || 'Failed to process review');
      }
    } catch (error) {
      console.error('Failed to review:', error);
    } finally {
      setReviewing(false);
    }
  }

  async function sendReaction(progressId: number, reaction: string) {
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressId, reaction }),
      });
      setToast(`${reaction} sent to Hero!`);
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  }

  async function setLuckyQuest(questId: number) {
    try {
      await fetch('/api/quests/lucky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId }),
      });
      setToast('🍀 Lucky quest updated!');
      fetchData();
    } catch (error) {
      console.error('Failed to set lucky quest:', error);
    }
  }

  async function handleSaveQuest() {
    setSaving(true);
    try {
      const url = editingQuest?.id ? `/api/quests/${editingQuest.id}` : '/api/quests';
      const method = editingQuest?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...questForm,
          steps: questForm.steps.filter(s => s.trim()),
          evidenceExamples: questForm.evidenceExamples.filter(e => e.trim()),
        }),
      });

      if (res.ok) {
        setToast(editingQuest?.id ? '✅ Quest updated!' : '✅ Quest created!');
        setEditingQuest(null);
        resetQuestForm();
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save quest');
      }
    } catch (error) {
      console.error('Failed to save quest:', error);
    } finally {
      setSaving(false);
    }
  }

  function resetQuestForm() {
    setQuestForm({
      title: '', description: '', category: '', difficulty: 'beginner',
      xpReward: 100, steps: [''], whyItMatters: '', safetyNotes: '',
      evidenceExamples: [''], isLocked: true, tier: 'rookie', unlockAtXp: 0, sortOrder: 999,
    });
  }

  function openQuestEditor(quest?: Quest) {
    if (quest) {
      setEditingQuest(quest);
      setQuestForm({
        title: quest.title,
        description: quest.description,
        category: quest.category,
        difficulty: quest.difficulty,
        xpReward: quest.xp_reward,
        steps: quest.steps?.length > 0 ? quest.steps : [''],
        whyItMatters: quest.why_it_matters || '',
        safetyNotes: quest.safety_notes || '',
        evidenceExamples: quest.evidenceExamples?.length > 0 ? quest.evidenceExamples : [''],
        isLocked: quest.is_locked || false,
        tier: quest.tier || 'rookie',
        unlockAtXp: quest.unlock_at_xp || 0,
        sortOrder: quest.sort_order || 999,
      });
    } else {
      setEditingQuest({} as Quest);
      resetQuestForm();
    }
  }

  function handleTierChange(tier: string) {
    const tierData = TIERS.find(t => t.value === tier);
    setQuestForm({
      ...questForm,
      tier,
      unlockAtXp: tierData?.xp || 0,
      isLocked: tier !== 'rookie',
    });
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getActivityIcon(action: string): string {
    const icons: Record<string, string> = {
      quest_started: '🚀', quest_submitted: '📤', quest_approved: '✅',
      quest_rejected: '🔄', badge_earned: '🏅', achievement_unlocked: '🏆', reaction_added: '💬'
    };
    return icons[action] || '📋';
  }

  function getActivityLabel(activity: Activity): string {
    const details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;
    const labels: Record<string, string> = {
      quest_started: `Started: ${activity.quest_title}`,
      quest_submitted: `Submitted: ${activity.quest_title}`,
      quest_approved: `Victory! ${activity.quest_title} (+${details?.xpAwarded || 0} XP)`,
      quest_rejected: `Returned: ${activity.quest_title}`,
      badge_earned: `Badge: ${details?.badgeIcon} ${details?.badgeName}`,
      achievement_unlocked: `Achievement: ${details?.achievementIcon} ${details?.achievementName}`,
      reaction_added: `Reaction sent: ${details?.reaction}`,
    };
    return labels[activity.action] || activity.action;
  }

  const categories = Array.from(new Set(quests.map(q => q.category).filter(Boolean)));
  const rank = getRank(stats?.totalXp || 0);
  const luckyQuest = quests.find(q => q.is_lucky_quest);
  const completedQuests = quests.filter(q => q.progress?.status === 'completed');

  // Group quests by tier
  const questsByTier: Record<string, Quest[]> = {};
  for (const quest of quests) {
    const tier = quest.tier || 'rookie';
    if (!questsByTier[tier]) questsByTier[tier] = [];
    questsByTier[tier].push(quest);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner"></div>
        <div style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-cyan)' }}>LOADING...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '100px', right: '20px', padding: '1rem 1.5rem',
          background: 'var(--bg-card)', border: '1px solid var(--neon-green)',
          borderRadius: '12px', boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)', zIndex: 2000
        }}>
          <span style={{ color: 'var(--neon-green)' }}>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span style={{ fontSize: '1.8rem' }}>⚡</span>
            <span style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-cyan)', textShadow: '0 0 10px var(--neon-cyan)' }}>CyberQuest</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--neon-pink)', marginLeft: '0.5rem' }}>GUIDE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost btn-small" onClick={() => setShowHeroUrl(true)}>📋 Hero Link</button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.9rem' }}>
                Hero: {rank.icon} {rank.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {stats?.questsCompleted || 0} wins • {stats?.totalXp || 0} XP • 🔥{stats?.currentStreak || 0}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Stats */}
        <div className="hud" style={{ marginBottom: '2rem' }}>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-orange)' }}>{submissions.length}</div>
            <div className="hud-stat-label">Inbox</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value">{stats?.totalXp || 0}</div>
            <div className="hud-stat-label">Hero XP</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-green)' }}>{quests.length}</div>
            <div className="hud-stat-label">Quests</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-pink)' }}>{stats?.currentStreak || 0}</div>
            <div className="hud-stat-label">Streak</div>
          </div>
        </div>

        {/* Quick Reactions */}
        {completedQuests.length > 0 && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontFamily: 'Orbitron, sans-serif' }}>
              QUICK REACTIONS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {completedQuests.slice(0, 5).map(q => (
                <div key={q.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--bg-dark)', padding: '0.5rem 0.75rem', borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '0.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.title}
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {REACTIONS.map(r => (
                      <button key={r} onClick={() => sendReaction(q.progress!.id, r)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.7
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
            📥 Inbox {submissions.length > 0 && `(${submissions.length})`}
          </button>
          <button className={`tab ${activeTab === 'quests' ? 'active' : ''}`} onClick={() => setActiveTab('quests')}>⚔️ Quests</button>
          <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>📜 History</button>
        </div>

        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <div>
            {submissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p style={{ fontFamily: 'Orbitron, sans-serif' }}>Inbox Empty</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Quest</th><th>Category</th><th>XP</th><th>Submitted</th><th>Action</th></tr></thead>
                  <tbody>
                    {submissions.map(sub => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: '500' }}>{sub.quest_title}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub.quest_category}</td>
                        <td style={{ color: 'var(--neon-orange)', fontFamily: 'Orbitron, sans-serif' }}>+{sub.quest_xp_reward}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(sub.submitted_at)}</td>
                        <td><button className="btn btn-primary btn-small" onClick={() => { setSelectedSubmission(sub); setFeedback(''); }}>Review</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Quests Tab */}
        {activeTab === 'quests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {luckyQuest && <span style={{ color: 'var(--neon-green)' }}>🍀 Lucky: {luckyQuest.title}</span>}
              </div>
              <button className="btn btn-primary" onClick={() => openQuestEditor()}>+ New Quest</button>
            </div>

            {/* Quests by Tier */}
            {TIERS.map(tier => {
              const tierQuests = questsByTier[tier.value] || [];
              if (tierQuests.length === 0) return null;
              return (
                <div key={tier.value} style={{ marginBottom: '2rem' }}>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
                    padding: '0.75rem 1rem', background: 'var(--bg-dark)', borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>{tier.label.split(' ')[0]}</span>
                    <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>{tier.label.split(' ')[1]}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({tier.xp} XP to unlock)</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{tierQuests.length} quests</span>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th style={{ width: '40px' }}>🍀</th><th>Quest</th><th>Category</th><th>Diff</th><th>XP</th><th>Status</th><th>Action</th></tr></thead>
                      <tbody>
                        {tierQuests.map(quest => (
                          <tr key={quest.id}>
                            <td>
                              <button onClick={() => setLuckyQuest(quest.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: quest.is_lucky_quest ? 1 : 0.3 }}>🍀</button>
                            </td>
                            <td>
                              <div style={{ fontWeight: '500' }}>{quest.title}</div>
                              {quest.is_lucky_quest && <span style={{ fontSize: '0.7rem', color: 'var(--neon-green)' }}>1.5x XP!</span>}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{quest.category}</td>
                            <td>{quest.difficulty === 'beginner' ? '⭐' : quest.difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐'}</td>
                            <td style={{ color: 'var(--neon-orange)', fontFamily: 'Orbitron, sans-serif', fontSize: '0.9rem' }}>+{quest.xp_reward}</td>
                            <td>
                              {quest.progress?.status === 'completed' && <span className="badge badge-completed">🏆</span>}
                              {quest.progress?.status === 'submitted' && <span className="badge badge-submitted">⏳</span>}
                              {quest.progress?.status === 'in_progress' && <span className="badge badge-in-progress">🎯</span>}
                            </td>
                            <td><button className="btn btn-ghost btn-small" onClick={() => openQuestEditor(quest)}>Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {activities.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📜</div><p>No activity yet</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activities.map(activity => (
                  <div key={activity.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>{getActivityIcon(activity.action)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{getActivityLabel(activity)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(activity.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedSubmission.quest_title}</h2>
              <button className="modal-close" onClick={() => setSelectedSubmission(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>📎 Hero's Proof</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedSubmission.evidenceLinks.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={{ padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '8px', wordBreak: 'break-all' }}>{link}</a>
                  ))}
                </div>
              </div>
              {selectedSubmission.reflection && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--neon-orange)' }}>💭 Hero's Notes</h3>
                  <p style={{ color: 'var(--text-secondary)', background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px' }}>{selectedSubmission.reflection}</p>
                </div>
              )}
              <div className="form-group">
                <label>Your Feedback (Optional)</label>
                <textarea placeholder="Nice work! / Here's what to improve..." value={feedback} onChange={e => setFeedback(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => handleReview('reject')} disabled={reviewing}>🔄 Send Back</button>
              <button className="btn btn-success" onClick={() => handleReview('approve')} disabled={reviewing}>✅ Approve (+{selectedSubmission.quest_xp_reward} XP)</button>
            </div>
          </div>
        </div>
      )}

      {/* FULL Quest Editor Modal */}
      {editingQuest && (
        <div className="modal-overlay" onClick={() => setEditingQuest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingQuest.id ? 'Edit Quest' : 'New Quest'}</h2>
              <button className="modal-close" onClick={() => setEditingQuest(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Basic Info */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', color: 'var(--neon-cyan)', marginBottom: '1rem' }}>BASIC INFO</div>
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" value={questForm.title} onChange={e => setQuestForm({ ...questForm, title: e.target.value })} placeholder="Quest title..." />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={questForm.description} onChange={e => setQuestForm({ ...questForm, description: e.target.value })} placeholder="What does Hero need to do?" rows={3} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Category</label>
                    <input type="text" list="cats" value={questForm.category} onChange={e => setQuestForm({ ...questForm, category: e.target.value })} placeholder="e.g., Security" />
                    <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select value={questForm.difficulty} onChange={e => setQuestForm({ ...questForm, difficulty: e.target.value })}>
                      <option value="beginner">⭐ Easy</option>
                      <option value="intermediate">⭐⭐ Medium</option>
                      <option value="advanced">⭐⭐⭐ Hard</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>XP Reward</label>
                    <input type="number" value={questForm.xpReward} onChange={e => setQuestForm({ ...questForm, xpReward: parseInt(e.target.value) || 100 })} />
                  </div>
                  <div className="form-group">
                    <label>Sort Order</label>
                    <input type="number" value={questForm.sortOrder} onChange={e => setQuestForm({ ...questForm, sortOrder: parseInt(e.target.value) || 999 })} />
                  </div>
                </div>
              </div>

              {/* Tier / Unlock */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', color: 'var(--neon-orange)', marginBottom: '1rem' }}>UNLOCK SETTINGS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Tier (Determines when Hero can see this)</label>
                    <select value={questForm.tier} onChange={e => handleTierChange(e.target.value)}>
                      {TIERS.map(t => (
                        <option key={t.value} value={t.value}>{t.label} ({t.xp} XP)</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Unlock at XP (Auto-set by tier)</label>
                    <input type="number" value={questForm.unlockAtXp} onChange={e => setQuestForm({ ...questForm, unlockAtXp: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', color: 'var(--neon-green)', marginBottom: '1rem' }}>🎯 MISSION STEPS</div>
                {questForm.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', width: '24px', flexShrink: 0 }}>{i + 1}.</span>
                    <input type="text" value={step} onChange={e => {
                      const newSteps = [...questForm.steps];
                      newSteps[i] = e.target.value;
                      setQuestForm({ ...questForm, steps: newSteps });
                    }} placeholder={`Step ${i + 1}...`} />
                    {questForm.steps.length > 1 && (
                      <button className="btn btn-ghost btn-small" onClick={() => setQuestForm({ ...questForm, steps: questForm.steps.filter((_, idx) => idx !== i) })}>×</button>
                    )}
                  </div>
                ))}
                <button className="btn btn-ghost btn-small" onClick={() => setQuestForm({ ...questForm, steps: [...questForm.steps, ''] })}>+ Add Step</button>
              </div>

              {/* Why It Matters */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', color: 'var(--neon-purple)', marginBottom: '1rem' }}>💡 WHY IT MATTERS</div>
                <textarea value={questForm.whyItMatters} onChange={e => setQuestForm({ ...questForm, whyItMatters: e.target.value })} placeholder="Explain why this skill is important..." rows={3} style={{ width: '100%' }} />
              </div>

              {/* Safety Notes */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', color: 'var(--neon-pink)', marginBottom: '1rem' }}>⚠️ SAFETY NOTES</div>
                <textarea value={questForm.safetyNotes} onChange={e => setQuestForm({ ...questForm, safetyNotes: e.target.value })} placeholder="Any warnings or safety tips..." rows={2} style={{ width: '100%' }} />
              </div>

              {/* Evidence Examples */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>📎 PROOF IDEAS (What Hero should submit)</div>
                {questForm.evidenceExamples.map((ex, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <input type="text" value={ex} onChange={e => {
                      const newExamples = [...questForm.evidenceExamples];
                      newExamples[i] = e.target.value;
                      setQuestForm({ ...questForm, evidenceExamples: newExamples });
                    }} placeholder="e.g., Screenshot of settings..." />
                    {questForm.evidenceExamples.length > 1 && (
                      <button className="btn btn-ghost btn-small" onClick={() => setQuestForm({ ...questForm, evidenceExamples: questForm.evidenceExamples.filter((_, idx) => idx !== i) })}>×</button>
                    )}
                  </div>
                ))}
                <button className="btn btn-ghost btn-small" onClick={() => setQuestForm({ ...questForm, evidenceExamples: [...questForm.evidenceExamples, ''] })}>+ Add Example</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingQuest(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveQuest} disabled={saving || !questForm.title || !questForm.description}>
                {saving ? 'Saving...' : 'Save Quest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero URL Modal */}
      {showHeroUrl && (
        <div className="modal-overlay" onClick={() => setShowHeroUrl(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Share with Hero</h2>
              <button className="modal-close" onClick={() => setShowHeroUrl(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Send this link to your Hero:</p>
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {typeof window !== 'undefined' && `${window.location.origin}/enter/mentee/[HERO_TOKEN]`}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowHeroUrl(false)}>Got It</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
