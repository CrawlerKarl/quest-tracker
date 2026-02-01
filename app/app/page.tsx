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

// Rank system
function getRank(xp: number): { name: string; icon: string; class: string } {
  if (xp >= 5000) return { name: 'LEGEND', icon: '👑', class: 'rank-legend' };
  if (xp >= 3000) return { name: 'ELITE', icon: '💎', class: 'rank-elite' };
  if (xp >= 1500) return { name: 'PRO', icon: '🔥', class: 'rank-pro' };
  if (xp >= 500) return { name: 'APPRENTICE', icon: '⚡', class: 'rank-apprentice' };
  return { name: 'ROOKIE', icon: '🌱', class: 'rank-rookie' };
}

// Difficulty to stars
function DifficultyStars({ difficulty }: { difficulty: string }) {
  const stars = difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3;
  return (
    <div className="difficulty-stars" title={difficulty}>
      {[1, 2, 3].map(i => (
        <span key={i} className={`star ${i <= stars ? 'filled' : ''}`}>★</span>
      ))}
    </div>
  );
}

export default function HeroApp() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [xpProgress, setXpProgress] = useState<XpProgress | null>(null);
  const [questCounts, setQuestCounts] = useState<QuestCounts | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; xp?: number } | null>(null);

  // Submission form state
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>(['']);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [safetyReminder, setSafetyReminder] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
        setToast({ message: '🚀 Quest started! Let\'s go!' });
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
      alert('Drop at least one proof link!');
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
        setToast({ message: '📤 Proof sent! Waiting for your Guide...' });
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
    try {
      const res = await fetch(`/api/quests/${quest.id}`);
      const data = await res.json();
      setSelectedQuest(data.quest);
      setSafetyReminder(data.safetyReminder || '');
      
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
      available: 'Ready',
      in_progress: 'Active',
      submitted: 'Sent to Guide',
      approved: 'Victory!',
      rejected: 'Try Again',
      completed: 'Crushed It!',
    };
    return labels[status] || status;
  }

  function getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      available: '⚔️',
      in_progress: '🎯',
      submitted: '⏳',
      approved: '✅',
      rejected: '🔄',
      completed: '🏆',
    };
    return icons[status] || '📋';
  }

  const filteredQuests = quests.filter(quest => {
    const status = getQuestStatus(quest);
    if (filter !== 'all' && status !== filter) return false;
    if (difficultyFilter !== 'all' && quest.difficulty !== difficultyFilter) return false;
    return true;
  });

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
      {/* Toast Notification */}
      {toast && (
        <div className="toast toast-success">
          <span>{toast.message}</span>
          {toast.xp && <span className="toast-xp">+{toast.xp} XP</span>}
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span>CyberQuest</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className={`rank-badge ${rank.class}`}>
              {rank.icon} {rank.name}
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-avatar">🦸</div>
            <div className="hero-info">
              <div className="hero-rank">{rank.icon} {rank.name}</div>
              <div className="hero-level">LEVEL {stats?.level || 1}</div>
              
              {/* XP Progress Bar */}
              <div className="xp-bar-container">
                <div className="xp-bar">
                  <div 
                    className="xp-bar-fill" 
                    style={{ width: `${xpProgress?.progress || 0}%` }}
                  ></div>
                  <div className="xp-bar-text">
                    {xpProgress?.current || 0} / {xpProgress?.needed || 500} XP
                  </div>
                </div>
              </div>
              
              <div className="hero-xp-text">
                {xpProgress && xpProgress.needed - xpProgress.current > 0 && (
                  <span>{xpProgress.needed - xpProgress.current} XP until next level!</span>
                )}
              </div>
            </div>
            
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-value">{questCounts?.completed || 0}</div>
                <div className="hero-stat-label">Wins</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">{stats?.totalXp || 0}</div>
                <div className="hero-stat-label">Total XP</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">{questCounts?.inProgress || 0}</div>
                <div className="hero-stat-label">Active</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats HUD */}
        <div className="hud">
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-cyan)' }}>{questCounts?.available || 0}</div>
            <div className="hud-stat-label">Ready to Start</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-orange)' }}>{questCounts?.inProgress || 0}</div>
            <div className="hud-stat-label">In Progress</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-pink)' }}>{questCounts?.pendingReview || 0}</div>
            <div className="hud-stat-label">Awaiting Guide</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-green)' }}>{questCounts?.completed || 0}</div>
            <div className="hud-stat-label">Victories</div>
          </div>
        </div>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', marginBottom: '1rem', color: 'var(--neon-purple)' }}>
              🏅 Achievements Unlocked
            </h2>
            <div className="badges-grid">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="earned-badge">
                  <div className="earned-badge-icon">{badge.icon}</div>
                  <div className="earned-badge-name">{badge.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
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
              ⚔️ Ready
            </button>
            <button 
              className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
              onClick={() => setFilter('in_progress')}
            >
              🎯 Active
            </button>
            <button 
              className={`filter-btn ${filter === 'submitted' ? 'active' : ''}`}
              onClick={() => setFilter('submitted')}
            >
              ⏳ Pending
            </button>
            <button 
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              🏆 Done
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
              ⭐ Easy
            </button>
            <button 
              className={`filter-btn ${difficultyFilter === 'intermediate' ? 'active' : ''}`}
              onClick={() => setDifficultyFilter('intermediate')}
            >
              ⭐⭐ Medium
            </button>
            <button 
              className={`filter-btn ${difficultyFilter === 'advanced' ? 'active' : ''}`}
              onClick={() => setDifficultyFilter('advanced')}
            >
              ⭐⭐⭐ Hard
            </button>
          </div>
        </div>

        {/* Quest Grid */}
        {filteredQuests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎮</div>
            <p style={{ fontFamily: 'Orbitron, sans-serif' }}>No quests here!</p>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Try changing your filters</p>
          </div>
        ) : (
          <div className="quest-grid">
            {filteredQuests.map(quest => {
              const status = getQuestStatus(quest);
              return (
                <div 
                  key={quest.id} 
                  className={`card quest-card ${quest.difficulty}`}
                  onClick={() => openQuestDetail(quest)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="quest-card-header">
                    <div>
                      <div className="quest-title">{quest.title}</div>
                      <div className="quest-category">{quest.category}</div>
                    </div>
                    <div className="quest-xp">+{quest.xp_reward} XP</div>
                  </div>
                  <p className="quest-description">
                    {quest.description.length > 100 
                      ? quest.description.slice(0, 100) + '...' 
                      : quest.description}
                  </p>
                  <div className="quest-footer">
                    <DifficultyStars difficulty={quest.difficulty} />
                    <span className={`badge badge-${status.replace('_', '-')}`}>
                      {getStatusIcon(status)} {getStatusLabel(status)}
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedQuest.title}</h2>
              <button className="modal-close" onClick={() => setSelectedQuest(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Quest info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <DifficultyStars difficulty={selectedQuest.difficulty} />
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                    {selectedQuest.category}
                  </span>
                </div>
                <span className="quest-xp" style={{ fontSize: '1.1rem' }}>+{selectedQuest.xp_reward} XP</span>
              </div>

              {/* Status badge */}
              {selectedQuest.progress && (
                <div style={{ marginBottom: '1rem' }}>
                  <span className={`badge badge-${selectedQuest.progress.status.replace('_', '-')}`}>
                    {getStatusIcon(selectedQuest.progress.status)} {getStatusLabel(selectedQuest.progress.status)}
                  </span>
                </div>
              )}

              {/* Description */}
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.7' }}>
                {selectedQuest.description}
              </p>

              {/* Mission Steps */}
              {selectedQuest.steps.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>
                    🎯 Mission Steps
                  </h3>
                  <ol className="steps-list">
                    {selectedQuest.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Why it matters */}
              {selectedQuest.why_it_matters && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--neon-orange)' }}>💡 Why This Matters</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>{selectedQuest.why_it_matters}</p>
                </div>
              )}

              {/* Safety notes */}
              {selectedQuest.safety_notes && (
                <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                  <span>⚠️</span>
                  <div>
                    <strong>Heads Up</strong>
                    <p style={{ marginTop: '0.25rem' }}>{selectedQuest.safety_notes}</p>
                  </div>
                </div>
              )}

              {/* Guide feedback (if rejected) */}
              {selectedQuest.progress?.status === 'rejected' && selectedQuest.progress.mentor_feedback && (
                <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                  <span>💬</span>
                  <div>
                    <strong>Guide Feedback</strong>
                    <p style={{ marginTop: '0.25rem' }}>{selectedQuest.progress.mentor_feedback}</p>
                  </div>
                </div>
              )}

              {/* Submission form (if in progress or rejected) */}
              {(selectedQuest.progress?.status === 'in_progress' || selectedQuest.progress?.status === 'rejected') && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--neon-green)', fontFamily: 'Orbitron, sans-serif' }}>
                    📤 Drop Your Proof
                  </h3>

                  {safetyReminder && (
                    <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                      <span>🔒</span>
                      <div style={{ fontSize: '0.85rem' }}>{safetyReminder}</div>
                    </div>
                  )}

                  {/* Evidence examples */}
                  {selectedQuest.evidenceExamples?.length > 0 && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PROOF IDEAS:</div>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {selectedQuest.evidenceExamples.map((example, i) => (
                          <li key={i}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Proof Links (Screenshots, etc.)</label>
                    {evidenceLinks.map((link, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="url"
                          placeholder="https://imgur.com/your-screenshot"
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
                    >
                      + Add Another Link
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Battle Notes (Optional)</label>
                    <textarea
                      placeholder="What did you learn? Any challenges?"
                      value={reflection}
                      onChange={e => setReflection(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Completed state */}
              {selectedQuest.progress?.status === 'completed' && (
                <div className="alert alert-success">
                  <span>🏆</span>
                  <div>
                    <strong>Victory! Quest Complete!</strong>
                    <p style={{ marginTop: '0.25rem' }}>You earned +{selectedQuest.xp_reward} XP for this quest.</p>
                  </div>
                </div>
              )}

              {/* Submitted state */}
              {selectedQuest.progress?.status === 'submitted' && (
                <div className="alert alert-info">
                  <span>⏳</span>
                  <div>
                    <strong>Proof Sent!</strong>
                    <p style={{ marginTop: '0.25rem' }}>Waiting for your Guide to review...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!selectedQuest.progress && (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleStartQuest(selectedQuest.id)}
                >
                  ⚔️ Accept Quest
                </button>
              )}
              {(selectedQuest.progress?.status === 'in_progress' || selectedQuest.progress?.status === 'rejected') && (
                <button 
                  className="btn btn-success"
                  onClick={() => handleSubmitQuest(selectedQuest.id)}
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : '🚀 Submit Proof'}
                </button>
              )}
              {(selectedQuest.progress?.status === 'submitted' || selectedQuest.progress?.status === 'completed') && (
                <button 
                  className="btn btn-ghost"
                  onClick={() => setSelectedQuest(null)}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
