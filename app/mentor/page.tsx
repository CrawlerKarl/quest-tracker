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
  unlocksAfter: number[];
  sort_order: number;
  progress: {
    status: string;
  } | null;
}

interface Stats {
  totalXp: number;
  level: number;
  questsCompleted: number;
}

interface Activity {
  id: number;
  action: string;
  quest_title: string;
  details: any;
  created_at: string;
}

// Rank system
function getRank(xp: number): { name: string; icon: string; class: string } {
  if (xp >= 5000) return { name: 'LEGEND', icon: '👑', class: 'rank-legend' };
  if (xp >= 3000) return { name: 'ELITE', icon: '💎', class: 'rank-elite' };
  if (xp >= 1500) return { name: 'PRO', icon: '🔥', class: 'rank-pro' };
  if (xp >= 500) return { name: 'APPRENTICE', icon: '⚡', class: 'rank-apprentice' };
  return { name: 'ROOKIE', icon: '🌱', class: 'rank-rookie' };
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
    unlocksAfter: [] as number[],
  });
  const [saving, setSaving] = useState(false);
  const [showHeroUrl, setShowHeroUrl] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

      if (res.ok) {
        setSelectedSubmission(null);
        setFeedback('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to process review');
      }
    } catch (error) {
      console.error('Failed to review:', error);
    } finally {
      setReviewing(false);
    }
  }

  async function handleToggleLock(questId: number) {
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleLock: true }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to toggle lock:', error);
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
      unlocksAfter: [],
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
        steps: quest.steps.length > 0 ? quest.steps : [''],
        whyItMatters: quest.why_it_matters || '',
        safetyNotes: quest.safety_notes || '',
        evidenceExamples: quest.evidenceExamples?.length > 0 ? quest.evidenceExamples : [''],
        isLocked: quest.is_locked || false,
        unlocksAfter: quest.unlocksAfter || [],
      });
    } else {
      setEditingQuest({} as Quest);
      resetQuestForm();
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getActivityIcon(action: string): string {
    const icons: Record<string, string> = {
      quest_started: '🚀',
      quest_submitted: '📤',
      quest_approved: '✅',
      quest_rejected: '🔄',
      badge_earned: '🏅',
      quest_created: '📝',
    };
    return icons[action] || '📋';
  }

  function getActivityLabel(activity: Activity): string {
    const labels: Record<string, string> = {
      quest_started: `Started: ${activity.quest_title}`,
      quest_submitted: `Submitted: ${activity.quest_title}`,
      quest_approved: `Victory! ${activity.quest_title} (+${activity.details?.xpAwarded || 0} XP)`,
      quest_rejected: `Returned: ${activity.quest_title}`,
      badge_earned: `Achievement: ${activity.details?.badgeIcon} ${activity.details?.badgeName}`,
      quest_created: `New Quest: ${activity.details?.title}`,
    };
    return labels[activity.action] || activity.action;
  }

  function getQuestStatusBadge(quest: Quest) {
    if (quest.progress?.status === 'completed') {
      return <span className="badge badge-completed">🏆 Done</span>;
    }
    if (quest.progress?.status === 'submitted') {
      return <span className="badge badge-submitted">⏳ Pending</span>;
    }
    if (quest.progress?.status === 'in_progress') {
      return <span className="badge badge-in-progress">🎯 Active</span>;
    }
    return null;
  }

  const categories = Array.from(new Set(quests.map(q => q.category)));
  const lockedCount = quests.filter(q => q.is_locked).length;
  const unlockedCount = quests.filter(q => !q.is_locked).length;
  const rank = getRank(stats?.totalXp || 0);

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
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span>CyberQuest</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--neon-pink)', marginLeft: '0.5rem', fontFamily: 'Inter, sans-serif' }}>GUIDE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost btn-small" onClick={() => setShowHeroUrl(true)}>
              📋 Get Hero Link
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.9rem' }}>
                Hero: {rank.icon} {rank.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {stats?.questsCompleted || 0} wins • {stats?.totalXp || 0} XP
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
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
            <div className="hud-stat-value" style={{ color: 'var(--neon-green)' }}>{unlockedCount}</div>
            <div className="hud-stat-label">Unlocked</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--text-muted)' }}>{lockedCount}</div>
            <div className="hud-stat-label">Locked</div>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
            📥 Inbox {submissions.length > 0 && `(${submissions.length})`}
          </button>
          <button className={`tab ${activeTab === 'quests' ? 'active' : ''}`} onClick={() => setActiveTab('quests')}>
            ⚔️ Quests
          </button>
          <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            📜 History
          </button>
        </div>

        {activeTab === 'inbox' && (
          <div>
            {submissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p style={{ fontFamily: 'Orbitron, sans-serif' }}>Inbox Empty</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>Waiting for your Hero to submit proof...</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Quest</th>
                      <th>Category</th>
                      <th>Level</th>
                      <th>XP</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(sub => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: '500' }}>{sub.quest_title}</td>
                        <td style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub.quest_category}</td>
                        <td>
                          <span className={`badge badge-${sub.quest_difficulty}`}>
                            {sub.quest_difficulty === 'beginner' ? '⭐' : sub.quest_difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--neon-orange)', fontFamily: 'Orbitron, sans-serif' }}>+{sub.quest_xp_reward}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(sub.submitted_at)}</td>
                        <td>
                          <button className="btn btn-primary btn-small" onClick={() => { setSelectedSubmission(sub); setFeedback(''); }}>
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                🔓 {unlockedCount} visible • 🔒 {lockedCount} hidden
              </div>
              <button className="btn btn-primary" onClick={() => openQuestEditor()}>+ New Quest</button>
            </div>
            
            <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
              <span>💡</span>
              <div>
                <strong>Quest Control</strong>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>🔒 = Hidden from Hero • 🔓 = Visible. Click to toggle.</p>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Visible</th>
                    <th>Quest</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>XP</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quests.map(quest => (
                    <tr key={quest.id} style={{ opacity: quest.is_locked ? 0.6 : 1 }}>
                      <td>
                        <button 
                          onClick={() => handleToggleLock(quest.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem' }}
                          title={quest.is_locked ? 'Hidden - Click to show' : 'Visible - Click to hide'}
                        >
                          {quest.is_locked ? '🔒' : '🔓'}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{quest.title}</div>
                        {quest.unlocksAfter && quest.unlocksAfter.length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Auto-unlocks after #{quest.unlocksAfter.join(', #')}</div>
                        )}
                      </td>
                      <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{quest.category}</td>
                      <td>
                        <span className={`badge badge-${quest.difficulty}`}>
                          {quest.difficulty === 'beginner' ? '⭐' : quest.difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--neon-orange)', fontFamily: 'Orbitron, sans-serif', fontSize: '0.9rem' }}>+{quest.xp_reward}</td>
                      <td>{getQuestStatusBadge(quest)}</td>
                      <td>
                        <button className="btn btn-ghost btn-small" onClick={() => openQuestEditor(quest)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {activities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📜</div>
                <p style={{ fontFamily: 'Orbitron, sans-serif' }}>No Activity Yet</p>
              </div>
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

      {selectedSubmission && (
        <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedSubmission.quest_title}</h2>
              <button className="modal-close" onClick={() => setSelectedSubmission(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className={`badge badge-${selectedSubmission.quest_difficulty}`}>{selectedSubmission.quest_difficulty}</span>
                <span className="quest-xp">+{selectedSubmission.quest_xp_reward} XP</span>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>📎 Hero's Proof</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedSubmission.evidenceLinks.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={{ padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '8px', wordBreak: 'break-all', border: '1px solid var(--border-color)' }}>
                      {link}
                    </a>
                  ))}
                </div>
              </div>

              {selectedSubmission.reflection && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--neon-orange)' }}>💭 Hero's Notes</h3>
                  <p style={{ color: 'var(--text-secondary)', background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {selectedSubmission.reflection}
                  </p>
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

      {editingQuest && (
        <div className="modal-overlay" onClick={() => setEditingQuest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingQuest.id ? 'Edit Quest' : 'New Quest'}</h2>
              <button className="modal-close" onClick={() => setEditingQuest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Quest Title</label>
                <input type="text" value={questForm.title} onChange={e => setQuestForm({ ...questForm, title: e.target.value })} placeholder="Epic quest name..." />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={questForm.description} onChange={e => setQuestForm({ ...questForm, description: e.target.value })} placeholder="What does the Hero need to do?" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Category</label>
                  <input type="text" list="categories" value={questForm.category} onChange={e => setQuestForm({ ...questForm, category: e.target.value })} placeholder="Security, Skills..." />
                  <datalist id="categories">
                    {categories.map(cat => (<option key={cat} value={cat} />))}
                  </datalist>
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
                  <input type="number" min="10" max="1000" value={questForm.xpReward} onChange={e => setQuestForm({ ...questForm, xpReward: parseInt(e.target.value) || 100 })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={questForm.isLocked} onChange={e => setQuestForm({ ...questForm, isLocked: e.target.checked })} style={{ width: 'auto' }} />
                    🔒 Hidden from Hero
                  </label>
                </div>
                <div className="form-group">
                  <label>Auto-unlock after:</label>
                  <select multiple value={questForm.unlocksAfter.map(String)} onChange={e => { const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value)); setQuestForm({ ...questForm, unlocksAfter: selected }); }} style={{ minHeight: '80px' }}>
                    {quests.filter(q => q.id !== editingQuest.id).map(q => (<option key={q.id} value={q.id}>#{q.id}: {q.title}</option>))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Mission Steps</label>
                {questForm.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--neon-cyan)', padding: '0.75rem 0', minWidth: '1.5rem' }}>{i + 1}.</span>
                    <input type="text" value={step} onChange={e => { const newSteps = [...questForm.steps]; newSteps[i] = e.target.value; setQuestForm({ ...questForm, steps: newSteps }); }} placeholder={`Step ${i + 1}`} />
                    {questForm.steps.length > 1 && (<button className="btn btn-ghost btn-small" onClick={() => setQuestForm({ ...questForm, steps: questForm.steps.filter((_, idx) => idx !== i) })}>×</button>)}
                  </div>
                ))}
                <button className="btn btn-ghost btn-small" onClick={() => setQuestForm({ ...questForm, steps: [...questForm.steps, ''] })}>+ Add Step</button>
              </div>

              <div className="form-group">
                <label>Why It Matters</label>
                <textarea value={questForm.whyItMatters} onChange={e => setQuestForm({ ...questForm, whyItMatters: e.target.value })} placeholder="Why is this skill important?" style={{ minHeight: '80px' }} />
              </div>

              <div className="form-group">
                <label>Safety Notes</label>
                <textarea value={questForm.safetyNotes} onChange={e => setQuestForm({ ...questForm, safetyNotes: e.target.value })} placeholder="Any warnings?" style={{ minHeight: '60px' }} />
              </div>

              <div className="form-group">
                <label>Proof Examples</label>
                {questForm.evidenceExamples.map((example, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" value={example} onChange={e => { const newExamples = [...questForm.evidenceExamples]; newExamples[i] = e.target.value; setQuestForm({ ...questForm, evidenceExamples: newExamples }); }} placeholder="Screenshot of..." />
                    {questForm.evidenceExamples.length > 1 && (<button className="btn btn-ghost btn-small" onClick={() => setQuestForm({ ...questForm, evidenceExamples: questForm.evidenceExamples.filter((_, idx) => idx !== i) })}>×</button>)}
                  </div>
                ))}
                <button className="btn btn-ghost btn-small" onClick={() => setQuestForm({ ...questForm, evidenceExamples: [...questForm.evidenceExamples, ''] })}>+ Add Example</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingQuest(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveQuest} disabled={saving || !questForm.title || !questForm.description || !questForm.category}>{saving ? 'Saving...' : 'Save Quest'}</button>
            </div>
          </div>
        </div>
      )}

      {showHeroUrl && (
        <div className="modal-overlay" onClick={() => setShowHeroUrl(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Share with Your Hero</h2>
              <button className="modal-close" onClick={() => setShowHeroUrl(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Send this link to your Hero so they can access their quest board.</p>
              <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                <span>🔒</span>
                <div><strong>Security Tip</strong><p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Share via Signal, iMessage, or in person.</p></div>
              </div>
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
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
