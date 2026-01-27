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

export default function MentorDashboard() {
  const [activeTab, setActiveTab] = useState<'review' | 'quests' | 'activity'>('review');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Review state
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Quest editor state
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
  });
  const [saving, setSaving] = useState(false);

  // Mentee URL display
  const [showMenteeUrl, setShowMenteeUrl] = useState(false);

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

  async function handleSaveQuest() {
    setSaving(true);
    try {
      const url = editingQuest ? `/api/quests/${editingQuest.id}` : '/api/quests';
      const method = editingQuest ? 'PUT' : 'POST';

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
        evidenceExamples: quest.evidenceExamples.length > 0 ? quest.evidenceExamples : [''],
      });
    } else {
      setEditingQuest({} as Quest); // New quest marker
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
      quest_rejected: '↩️',
      badge_earned: '🏅',
      quest_created: '📝',
    };
    return icons[action] || '📋';
  }

  function getActivityLabel(activity: Activity): string {
    const labels: Record<string, string> = {
      quest_started: `Started: ${activity.quest_title}`,
      quest_submitted: `Submitted: ${activity.quest_title}`,
      quest_approved: `Approved: ${activity.quest_title} (+${activity.details?.xpAwarded || 0} XP)`,
      quest_rejected: `Returned: ${activity.quest_title}`,
      badge_earned: `Earned badge: ${activity.details?.badgeIcon} ${activity.details?.badgeName}`,
      quest_created: `Created: ${activity.details?.title}`,
    };
    return labels[activity.action] || activity.action;
  }

  // Get categories from existing quests
  const categories = Array.from(new Set(quests.map(q => q.category)));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            🎮 Quest Tracker <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Mentor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="btn btn-ghost btn-small"
              onClick={() => setShowMenteeUrl(true)}
            >
              📋 Get Mentee Link
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600' }}>Level {stats?.level || 1}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {stats?.questsCompleted || 0} quests completed
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Stats Overview */}
        <div className="hud" style={{ marginBottom: '2rem' }}>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--accent-gold)' }}>{submissions.length}</div>
            <div className="hud-stat-label">Pending Reviews</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value">{stats?.totalXp || 0}</div>
            <div className="hud-stat-label">Total XP Earned</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value">{stats?.questsCompleted || 0}</div>
            <div className="hud-stat-label">Quests Completed</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value">{quests.length}</div>
            <div className="hud-stat-label">Total Quests</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            Review Queue {submissions.length > 0 && `(${submissions.length})`}
          </button>
          <button 
            className={`tab ${activeTab === 'quests' ? 'active' : ''}`}
            onClick={() => setActiveTab('quests')}
          >
            Manage Quests
          </button>
          <button 
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        {/* Review Tab */}
        {activeTab === 'review' && (
          <div>
            {submissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <p>No submissions to review</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Check back when your mentee submits evidence</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Quest</th>
                      <th>Category</th>
                      <th>Difficulty</th>
                      <th>XP</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(sub => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: '500' }}>{sub.quest_title}</td>
                        <td>{sub.quest_category}</td>
                        <td>
                          <span className={`badge badge-${sub.quest_difficulty}`}>
                            {sub.quest_difficulty}
                          </span>
                        </td>
                        <td style={{ color: 'var(--accent-gold)' }}>+{sub.quest_xp_reward}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(sub.submitted_at)}</td>
                        <td>
                          <button 
                            className="btn btn-primary btn-small"
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setFeedback('');
                            }}
                          >
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

        {/* Quests Tab */}
        {activeTab === 'quests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={() => openQuestEditor()}>
                + New Quest
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Quest</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                    <th>XP</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quests.map(quest => (
                    <tr key={quest.id}>
                      <td style={{ fontWeight: '500' }}>{quest.title}</td>
                      <td>{quest.category}</td>
                      <td>
                        <span className={`badge badge-${quest.difficulty}`}>
                          {quest.difficulty}
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent-gold)' }}>+{quest.xp_reward}</td>
                      <td>
                        <button 
                          className="btn btn-ghost btn-small"
                          onClick={() => openQuestEditor(quest)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div>
            {activities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p>No activity yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activities.map(activity => (
                  <div key={activity.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>{getActivityIcon(activity.action)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{getActivityLabel(activity)}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {formatDate(activity.created_at)}
                      </div>
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
              <h2 className="modal-title">Review: {selectedSubmission.quest_title}</h2>
              <button className="modal-close" onClick={() => setSelectedSubmission(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className={`badge badge-${selectedSubmission.quest_difficulty}`}>
                  {selectedSubmission.quest_difficulty}
                </span>
                <span className="quest-xp">+{selectedSubmission.quest_xp_reward} XP</span>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📎 Evidence Links</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedSubmission.evidenceLinks.map((link, i) => (
                    <a 
                      key={i} 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        padding: '0.75rem', 
                        background: 'var(--bg-dark)', 
                        borderRadius: '8px',
                        wordBreak: 'break-all'
                      }}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>

              {selectedSubmission.reflection && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>💭 Reflection</h3>
                  <p style={{ color: 'var(--text-secondary)', background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px' }}>
                    {selectedSubmission.reflection}
                  </p>
                </div>
              )}

              <div className="form-group">
                <label>Feedback (optional)</label>
                <textarea
                  placeholder="Great work! / Here's what to improve..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-ghost"
                onClick={() => handleReview('reject')}
                disabled={reviewing}
              >
                ↩️ Return for Revision
              </button>
              <button 
                className="btn btn-success"
                onClick={() => handleReview('approve')}
                disabled={reviewing}
              >
                ✅ Approve (+{selectedSubmission.quest_xp_reward} XP)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quest Editor Modal */}
      {editingQuest && (
        <div className="modal-overlay" onClick={() => setEditingQuest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingQuest.id ? 'Edit Quest' : 'New Quest'}</h2>
              <button className="modal-close" onClick={() => setEditingQuest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={questForm.title}
                  onChange={e => setQuestForm({ ...questForm, title: e.target.value })}
                  placeholder="Quest title"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={questForm.description}
                  onChange={e => setQuestForm({ ...questForm, description: e.target.value })}
                  placeholder="What is this quest about?"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    list="categories"
                    value={questForm.category}
                    onChange={e => setQuestForm({ ...questForm, category: e.target.value })}
                    placeholder="Security, Digital Skills..."
                  />
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label>Difficulty *</label>
                  <select
                    value={questForm.difficulty}
                    onChange={e => setQuestForm({ ...questForm, difficulty: e.target.value })}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>XP Reward *</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={questForm.xpReward}
                    onChange={e => setQuestForm({ ...questForm, xpReward: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Steps *</label>
                {questForm.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', padding: '0.75rem 0', minWidth: '1.5rem' }}>{i + 1}.</span>
                    <input
                      type="text"
                      value={step}
                      onChange={e => {
                        const newSteps = [...questForm.steps];
                        newSteps[i] = e.target.value;
                        setQuestForm({ ...questForm, steps: newSteps });
                      }}
                      placeholder={`Step ${i + 1}`}
                    />
                    {questForm.steps.length > 1 && (
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => setQuestForm({ 
                          ...questForm, 
                          steps: questForm.steps.filter((_, idx) => idx !== i) 
                        })}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() => setQuestForm({ ...questForm, steps: [...questForm.steps, ''] })}
                >
                  + Add Step
                </button>
              </div>

              <div className="form-group">
                <label>Why It Matters</label>
                <textarea
                  value={questForm.whyItMatters}
                  onChange={e => setQuestForm({ ...questForm, whyItMatters: e.target.value })}
                  placeholder="Explain the importance of this skill..."
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div className="form-group">
                <label>Safety Notes</label>
                <textarea
                  value={questForm.safetyNotes}
                  onChange={e => setQuestForm({ ...questForm, safetyNotes: e.target.value })}
                  placeholder="Any safety considerations?"
                  style={{ minHeight: '60px' }}
                />
              </div>

              <div className="form-group">
                <label>Evidence Examples</label>
                {questForm.evidenceExamples.map((example, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={example}
                      onChange={e => {
                        const newExamples = [...questForm.evidenceExamples];
                        newExamples[i] = e.target.value;
                        setQuestForm({ ...questForm, evidenceExamples: newExamples });
                      }}
                      placeholder="Screenshot of..."
                    />
                    {questForm.evidenceExamples.length > 1 && (
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => setQuestForm({ 
                          ...questForm, 
                          evidenceExamples: questForm.evidenceExamples.filter((_, idx) => idx !== i) 
                        })}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() => setQuestForm({ 
                    ...questForm, 
                    evidenceExamples: [...questForm.evidenceExamples, ''] 
                  })}
                >
                  + Add Example
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingQuest(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveQuest}
                disabled={saving || !questForm.title || !questForm.description || !questForm.category}
              >
                {saving ? 'Saving...' : 'Save Quest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mentee URL Modal */}
      {showMenteeUrl && (
        <div className="modal-overlay" onClick={() => setShowMenteeUrl(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Share with Your Mentee</h2>
              <button className="modal-close" onClick={() => setShowMenteeUrl(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Share this link with your mentee. They'll use it to access their quest board.
              </p>
              
              <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                <span>⚠️</span>
                <div>
                  <strong>Security Note</strong>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Share this link securely via Signal, iMessage, or in person. Don't send it via regular email or unencrypted messages.
                  </p>
                </div>
              </div>

              <div style={{ 
                background: 'var(--bg-dark)', 
                padding: '1rem', 
                borderRadius: '8px',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>
                {typeof window !== 'undefined' && (
                  `${window.location.origin}/enter/mentee/[MENTEE_TOKEN]`
                )}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                Replace [MENTEE_TOKEN] with your actual mentee token from your environment variables.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowMenteeUrl(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
