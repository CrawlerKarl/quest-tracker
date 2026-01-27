'use client';

import { useState, useEffect } from 'react';

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
  progress: {
    id: number;
    status: string;
    evidence_links: string;
    reflection: string;
    mentor_feedback: string;
  } | null;
}

interface Stats {
  totalXp: number;
  level: number;
  questsCompleted: number;
}

interface XpProgress {
  current: number;
  needed: number;
  progress: number;
}

interface QuestCounts {
  inProgress: number;
  pendingReview: number;
  completed: number;
  total: number;
  available: number;
}

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export default function MenteeApp() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [xpProgress, setXpProgress] = useState<XpProgress | null>(null);
  const [questCounts, setQuestCounts] = useState<QuestCounts | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  // Submission form state
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>(['']);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [safetyReminder, setSafetyReminder] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [questsRes, statsRes] = await Promise.all([
        fetch('/api/quests'),
        fetch('/api/stats'),
      ]);

      const questsData = await questsRes.json();
      const statsData = await statsRes.json();

      setQuests(questsData.quests || []);
      setStats(statsData.stats);
      setXpProgress(statsData.xpProgress);
      setQuestCounts(statsData.questCounts);
      setEarnedBadges(statsData.earnedBadges || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartQuest(questId: number) {
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      if (res.ok) {
        fetchData();
        setSelectedQuest(null);
      }
    } catch (error) {
      console.error('Failed to start quest:', error);
    }
  }

  async function handleSubmitQuest(questId: number) {
    const filteredLinks = evidenceLinks.filter(link => link.trim());
    if (filteredLinks.length === 0) {
      alert('Please add at least one evidence link');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          evidenceLinks: filteredLinks,
          reflection,
        }),
      });

      if (res.ok) {
        setEvidenceLinks(['']);
        setReflection('');
        fetchData();
        setSelectedQuest(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit');
      }
    } catch (error) {
      console.error('Failed to submit quest:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function openQuestDetail(quest: Quest) {
    // Fetch fresh quest data with safety reminder
    try {
      const res = await fetch(`/api/quests/${quest.id}`);
      const data = await res.json();
      setSelectedQuest(data.quest);
      setSafetyReminder(data.safetyReminder || '');
      
      // Pre-populate evidence links if resuming
      if (data.quest.progress?.evidence_links) {
        const links = JSON.parse(data.quest.progress.evidence_links);
        setEvidenceLinks(links.length > 0 ? links : ['']);
      } else {
        setEvidenceLinks(['']);
      }
      setReflection(data.quest.progress?.reflection || '');
    } catch (error) {
      console.error('Failed to fetch quest details:', error);
    }
  }

  function getQuestStatus(quest: Quest): string {
    return quest.progress?.status || 'available';
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      available: 'Available',
      in_progress: 'In Progress',
      submitted: 'Under Review',
      approved: 'Approved',
      rejected: 'Needs Revision',
      completed: 'Completed',
    };
    return labels[status] || status;
  }

  const filteredQuests = quests.filter(quest => {
    const status = getQuestStatus(quest);
    if (filter !== 'all' && status !== filter) return false;
    if (difficultyFilter !== 'all' && quest.difficulty !== difficultyFilter) return false;
    return true;
  });

  const categories = [...new Set(quests.map(q => q.category))];

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
            🎮 Quest Tracker
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="xp-display">
              ⭐ {stats?.totalXp || 0} XP
            </div>
            <div className="level-badge">{stats?.level || 1}</div>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* HUD */}
        <div className="hud">
          <div className="hud-stat">
            <div className="hud-stat-value">{stats?.level || 1}</div>
            <div className="hud-stat-label">Level</div>
            {xpProgress && (
              <div style={{ marginTop: '0.5rem' }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${xpProgress.progress}%` }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {xpProgress.current} / {xpProgress.needed} XP
                </div>
              </div>
            )}
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value">{questCounts?.completed || 0}</div>
            <div className="hud-stat-label">Quests Completed</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value">{questCounts?.inProgress || 0}</div>
            <div className="hud-stat-label">In Progress</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value">{questCounts?.pendingReview || 0}</div>
            <div className="hud-stat-label">Pending Review</div>
          </div>
        </div>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>🏅 Earned Badges</h2>
            <div className="badges-grid">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="earned-badge" title={badge.description}>
                  <div className="earned-badge-icon">{badge.icon}</div>
                  <div className="earned-badge-name">{badge.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="section-header">
          <h2 className="section-title">Quest Board</h2>
        </div>
        <div className="filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'available' ? 'active' : ''}`}
            onClick={() => setFilter('available')}
          >
            Available
          </button>
          <button 
            className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilter('in_progress')}
          >
            In Progress
          </button>
          <button 
            className={`filter-btn ${filter === 'submitted' ? 'active' : ''}`}
            onClick={() => setFilter('submitted')}
          >
            Under Review
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
        <div className="filters">
          <button 
            className={`filter-btn ${difficultyFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDifficultyFilter('all')}
          >
            All Levels
          </button>
          <button 
            className={`filter-btn ${difficultyFilter === 'beginner' ? 'active' : ''}`}
            onClick={() => setDifficultyFilter('beginner')}
          >
            🌱 Beginner
          </button>
          <button 
            className={`filter-btn ${difficultyFilter === 'intermediate' ? 'active' : ''}`}
            onClick={() => setDifficultyFilter('intermediate')}
          >
            🌿 Intermediate
          </button>
          <button 
            className={`filter-btn ${difficultyFilter === 'advanced' ? 'active' : ''}`}
            onClick={() => setDifficultyFilter('advanced')}
          >
            🌳 Advanced
          </button>
        </div>

        {/* Quest Grid */}
        {filteredQuests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No quests match your filters</p>
          </div>
        ) : (
          <div className="quest-grid">
            {filteredQuests.map(quest => {
              const status = getQuestStatus(quest);
              return (
                <div key={quest.id} className="card quest-card" onClick={() => openQuestDetail(quest)}>
                  <div className="quest-card-header">
                    <div>
                      <div className="quest-title">{quest.title}</div>
                      <div className="quest-category">{quest.category}</div>
                    </div>
                    <div className="quest-xp">+{quest.xp_reward} XP</div>
                  </div>
                  <p className="quest-description">{quest.description}</p>
                  <div className="quest-footer">
                    <span className={`badge badge-${quest.difficulty}`}>
                      {quest.difficulty}
                    </span>
                    <span className={`badge badge-${status.replace('_', '-')}`}>
                      {getStatusLabel(status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Quest Detail Modal */}
      {selectedQuest && (
        <div className="modal-overlay" onClick={() => setSelectedQuest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedQuest.title}</h2>
              <button className="modal-close" onClick={() => setSelectedQuest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className={`badge badge-${selectedQuest.difficulty}`}>
                  {selectedQuest.difficulty}
                </span>
                <span className={`badge badge-${getQuestStatus(selectedQuest).replace('_', '-')}`}>
                  {getStatusLabel(getQuestStatus(selectedQuest))}
                </span>
                <span className="quest-xp">+{selectedQuest.xp_reward} XP</span>
              </div>

              <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                {selectedQuest.description}
              </p>

              {selectedQuest.why_it_matters && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>💡 Why It Matters</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {selectedQuest.why_it_matters}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📝 Steps</h3>
                <ol className="steps-list">
                  {selectedQuest.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              {selectedQuest.safety_notes && (
                <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                  <span>⚠️</span>
                  <div>
                    <strong>Safety Note</strong>
                    <p style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>{selectedQuest.safety_notes}</p>
                  </div>
                </div>
              )}

              {selectedQuest.evidenceExamples && selectedQuest.evidenceExamples.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>📸 Evidence Examples</h3>
                  <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '1.25rem' }}>
                    {selectedQuest.evidenceExamples.map((example, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mentor Feedback */}
              {selectedQuest.progress?.mentor_feedback && (
                <div className={`alert ${getQuestStatus(selectedQuest) === 'completed' ? 'alert-success' : 'alert-info'}`}>
                  <span>💬</span>
                  <div>
                    <strong>Mentor Feedback</strong>
                    <p style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>{selectedQuest.progress.mentor_feedback}</p>
                  </div>
                </div>
              )}

              {/* Submission Form */}
              {(getQuestStatus(selectedQuest) === 'in_progress' || getQuestStatus(selectedQuest) === 'rejected') && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📤 Submit Evidence</h3>
                  
                  {safetyReminder && (
                    <div className="alert alert-warning" style={{ marginBottom: '1rem', whiteSpace: 'pre-line', fontSize: '0.85rem' }}>
                      {safetyReminder}
                    </div>
                  )}

                  <div className="form-group">
                    <label>Evidence Links</label>
                    {evidenceLinks.map((link, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={link}
                          onChange={e => {
                            const newLinks = [...evidenceLinks];
                            newLinks[i] = e.target.value;
                            setEvidenceLinks(newLinks);
                          }}
                        />
                        {evidenceLinks.length > 1 && (
                          <button
                            className="btn btn-ghost btn-small"
                            onClick={() => setEvidenceLinks(evidenceLinks.filter((_, idx) => idx !== i))}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => setEvidenceLinks([...evidenceLinks, ''])}
                      style={{ marginTop: '0.5rem' }}
                    >
                      + Add Another Link
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Reflection (optional)</label>
                    <textarea
                      placeholder="What did you learn? Any challenges?"
                      value={reflection}
                      onChange={e => setReflection(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleSubmitQuest(selectedQuest.id)}
                    disabled={submitting}
                    style={{ width: '100%' }}
                  >
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {getQuestStatus(selectedQuest) === 'available' && (
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setSelectedQuest(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={() => handleStartQuest(selectedQuest.id)}>
                  Start Quest
                </button>
              </div>
            )}

            {getQuestStatus(selectedQuest) === 'submitted' && (
              <div className="modal-footer">
                <div className="alert alert-info" style={{ margin: 0, flex: 1 }}>
                  <span>⏳</span>
                  <span>Waiting for mentor review...</span>
                </div>
              </div>
            )}

            {getQuestStatus(selectedQuest) === 'completed' && (
              <div className="modal-footer">
                <div className="alert alert-success" style={{ margin: 0, flex: 1 }}>
                  <span>🎉</span>
                  <span>Quest completed! +{selectedQuest.xp_reward} XP earned</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
