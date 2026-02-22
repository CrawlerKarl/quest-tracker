'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================
// ANIMATED NUMBER COMPONENT
// ============================================
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeOut);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{displayValue.toLocaleString()}</>;
}

// ============================================
// GLOWING XP BAR
// ============================================
function GlowingXpBar({ progress, color }: { progress: number; color: string }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="xp-bar-container">
      <div className="xp-bar-track">
        <div 
          className="xp-bar-fill"
          style={{ 
            width: `${animatedProgress}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: `0 0 20px ${color}80`,
          }}
        />
      </div>
      <style jsx>{`
        .xp-bar-container { position: relative; width: 100%; }
        .xp-bar-track {
          height: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .xp-bar-fill {
          height: 100%;
          border-radius: 8px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}

// ============================================
// SHIMMER BADGE
// ============================================
function ShimmerBadge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="shimmer-badge" style={{ '--badge-color': color } as React.CSSProperties}>
      {children}
      <div className="shimmer"></div>
      <style jsx>{`
        .shimmer-badge {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          border: 2px solid var(--badge-color);
          box-shadow: 0 0 15px color-mix(in srgb, var(--badge-color) 30%, transparent);
        }
        .shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shimmer 3s infinite;
        }
        @keyframes shimmer {
          0% { left: -100%; }
          50%, 100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// INTERFACES
// ============================================
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
  is_lucky_quest?: boolean;
  tier?: string;
  progress: {
    id: number;
    status: string;
    evidence_links: string;
    reflection: string;
    mentor_feedback: string;
    is_selected?: boolean;
  } | null;
}

const TIERS: Record<string, { icon: string; name: string; color: string }> = {
  rookie: { icon: '🌱', name: 'ROOKIE', color: '#9898a8' },
  apprentice: { icon: '⚡', name: 'APPRENTICE', color: '#00d4ff' },
  pro: { icon: '🔥', name: 'PRO', color: '#ff9500' },
  elite: { icon: '💎', name: 'ELITE', color: '#ff0080' },
  legend: { icon: '👑', name: 'LEGEND', color: '#ffd700' },
};

function getCurrentTier(xp: number): string {
  if (xp >= 10000) return 'legend';
  if (xp >= 6000) return 'elite';
  if (xp >= 3000) return 'pro';
  if (xp >= 1000) return 'apprentice';
  return 'rookie';
}

// ============================================
// MAIN APP
// ============================================
export default function HeroApp() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [rewardInfo, setRewardInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [showQuestPicker, setShowQuestPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>(['']);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    fetchData();
    setTimeout(() => setPageLoaded(true), 100);
  }, []);

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
      setRewardInfo(statsData.rewardInfo);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Get quests by status
  const completedQuests = quests.filter(q => q.progress?.status === 'completed');
  const submittedQuests = quests.filter(q => q.progress?.status === 'submitted');
  const selectedQuests = quests.filter(q => q.progress?.is_selected && q.progress?.status !== 'completed' && q.progress?.status !== 'submitted');
  const availableToSelect = quests.filter(q => !q.progress);
  
  // Current active quests (selected + submitted, max 3 selected)
  const activeQuests = [...selectedQuests, ...submittedQuests];
  const canSelectMore = selectedQuests.length < 3;

  // Lucky quest (exclude completed)
  const luckyQuest = quests.find(q => q.is_lucky_quest && q.progress?.status !== 'completed');

  async function handleSelectQuest(questId: number) {
    if (!canSelectMore) {
      setToast('❌ You already have 3 quests! Complete one first.');
      return;
    }
    
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select' }),
      });
      if (res.ok) {
        setToast('🚀 Quest added to your active quests!');
        fetchData();
        setShowQuestPicker(false);
      }
    } catch (error) {
      console.error('Failed to select quest:', error);
    }
  }

  async function handleSubmitQuest(questId: number) {
    const filteredLinks = evidenceLinks.filter(link => link.trim());
    if (filteredLinks.length === 0) {
      alert('Add at least one proof item!');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', evidenceLinks: filteredLinks, reflection }),
      });
      if (res.ok) {
        setToast('📤 Proof submitted! Waiting for Guide review.');
        setEvidenceLinks(['']);
        setReflection('');
        fetchData();
        setSelectedQuest(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit');
      }
    } catch (error) {
      console.error('Failed to submit:', error);
    }
    setSubmitting(false);
  }

  async function openQuestDetail(quest: Quest) {
    try {
      const res = await fetch(`/api/quests/${quest.id}`);
      const data = await res.json();
      setSelectedQuest(data.quest);
      setEvidenceLinks(['']);
      setReflection('');
    } catch (error) {
      console.error('Failed to fetch quest details:', error);
    }
  }

  const currentTier = getCurrentTier(stats?.totalXp || 0);
  const currentTierData = TIERS[currentTier];

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <div className="loading-text">LOADING</div>
        <style jsx>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            gap: 1.5rem;
            background: #0a0a0f;
          }
          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(0, 212, 255, 0.1);
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .loading-text {
            font-family: 'Orbitron', monospace;
            color: #00d4ff;
            letter-spacing: 0.3em;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`app-container ${pageLoaded ? 'loaded' : ''}`}>
      {/* Ambient Background */}
      <div className="ambient-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">CyberQuest</span>
          </div>
          <div className="header-right">
            <div className="streak-badge">
              <span>🔥</span>
              <span className="streak-value">{stats?.currentStreak || 0}</span>
            </div>
            <ShimmerBadge color={currentTierData?.color || '#00d4ff'}>
              <span>{currentTierData?.icon}</span>
              <span style={{ fontFamily: 'Orbitron', fontWeight: 700, color: currentTierData?.color }}>
                {currentTierData?.name}
              </span>
            </ShimmerBadge>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Hero Stats Section */}
        <section className="hero-section fade-in-up">
          <div className="hero-content">
            <div className="avatar-container" style={{ '--glow-color': currentTierData?.color } as React.CSSProperties}>
              <div className="avatar">🦸</div>
            </div>

            <div className="level-section">
              <div className="tier-label" style={{ color: currentTierData?.color }}>
                {currentTierData?.icon} {currentTierData?.name}
              </div>
              <div className="level-display">
                LEVEL <AnimatedNumber value={stats?.level || 1} duration={800} />
              </div>
              <div className="xp-section">
                <GlowingXpBar progress={((stats?.totalXp || 0) % 1000) / 10} color={currentTierData?.color || '#00d4ff'} />
                <div className="xp-text">
                  <AnimatedNumber value={stats?.totalXp || 0} duration={1000} /> XP
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-value" style={{ color: '#00ff88' }}>{completedQuests.length}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-box">
                <div className="stat-value" style={{ color: '#ff9500' }}>{activeQuests.length}</div>
                <div className="stat-label">Active</div>
              </div>
            </div>
          </div>
        </section>

        {/* Reward Progress */}
        {rewardInfo && (
          <section className="reward-section fade-in-up">
            <div className="reward-header">
              <span>🎮 REWARD EARNED</span>
              <span className="reward-amount">${rewardInfo.earned}</span>
            </div>
            <GlowingXpBar progress={rewardInfo.progress || 0} color="#ff9500" />
          </section>
        )}

        {/* Lucky Quest Banner */}
        {luckyQuest && !luckyQuest.progress?.is_selected && (
          <div className="lucky-banner fade-in-up" onClick={() => handleSelectQuest(luckyQuest.id)}>
            <div className="lucky-content">
              <span className="lucky-icon">🍀</span>
              <div>
                <div className="lucky-label">TODAY'S LUCKY QUEST</div>
                <div className="lucky-title">{luckyQuest.title}</div>
              </div>
            </div>
            <div className="lucky-reward">
              <div className="lucky-xp">+{Math.round(luckyQuest.xp_reward * 1.5)}</div>
              <div className="lucky-bonus">1.5x BONUS</div>
            </div>
          </div>
        )}

        {/* Active Quests Section */}
        <section className="active-section fade-in-up">
          <div className="section-header">
            <h2>⚔️ Your Quests</h2>
            <div className="quest-slots">
              {[0, 1, 2].map(i => (
                <div key={i} className={`slot ${i < activeQuests.length ? 'filled' : 'empty'}`}>
                  {i < activeQuests.length ? '✓' : '+'}
                </div>
              ))}
            </div>
          </div>

          {activeQuests.length === 0 ? (
            <div className="empty-state">
              <p>No active quests yet!</p>
              <button className="btn btn-primary" onClick={() => setShowQuestPicker(true)}>
                🎯 Choose Your First Quest
              </button>
            </div>
          ) : (
            <div className="quest-list">
              {activeQuests.map(quest => (
                <div 
                  key={quest.id} 
                  className={`quest-card ${quest.progress?.status === 'submitted' ? 'submitted' : ''} ${quest.is_lucky_quest ? 'lucky' : ''}`}
                  onClick={() => openQuestDetail(quest)}
                >
                  {quest.is_lucky_quest && <div className="lucky-badge">🍀 1.5x</div>}
                  <div className="quest-header">
                    <h3>{quest.title}</h3>
                    <span className="quest-xp">+{quest.is_lucky_quest ? Math.round(quest.xp_reward * 1.5) : quest.xp_reward}</span>
                  </div>
                  <p className="quest-desc">{quest.description.slice(0, 80)}...</p>
                  <div className="quest-footer">
                    <span className="quest-difficulty">
                      {quest.difficulty === 'beginner' ? '⭐' : quest.difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐'}
                    </span>
                    {quest.progress?.status === 'submitted' ? (
                      <span className="status-badge submitted">⏳ Awaiting Review</span>
                    ) : (
                      <span className="status-badge ready">📤 Ready to Submit</span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Add Quest Button */}
              {canSelectMore && (
                <button className="add-quest-card" onClick={() => setShowQuestPicker(true)}>
                  <span className="add-icon">+</span>
                  <span>Add Quest ({3 - selectedQuests.length} slot{3 - selectedQuests.length !== 1 ? 's' : ''} left)</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* History Link */}
        <button className="history-link" onClick={() => setShowHistory(true)}>
          🏆 View Completed Quests ({completedQuests.length})
        </button>
      </main>

      {/* Quest Detail Modal */}
      {selectedQuest && (
        <div className="modal-overlay" onClick={() => setSelectedQuest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedQuest.title}</h2>
              <button className="modal-close" onClick={() => setSelectedQuest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-meta">
                <span>{selectedQuest.category}</span>
                <span className="meta-xp">+{selectedQuest.xp_reward} XP</span>
              </div>
              <p>{selectedQuest.description}</p>

              {selectedQuest.steps?.length > 0 && (
                <div className="modal-section">
                  <h3>🎯 Steps</h3>
                  <ol>{selectedQuest.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
                </div>
              )}

              {selectedQuest.why_it_matters && (
                <div className="modal-section">
                  <h3>💡 Why It Matters</h3>
                  <p>{selectedQuest.why_it_matters}</p>
                </div>
              )}

              {/* Submit Proof Section */}
              {selectedQuest.progress?.status !== 'completed' && selectedQuest.progress?.status !== 'submitted' && (
                <div className="modal-section">
                  <h3>📤 Submit Proof</h3>
                  {selectedQuest.evidenceExamples?.length > 0 && (
                    <p className="evidence-hint">
                      <strong>Ideas:</strong> {selectedQuest.evidenceExamples.join(' • ')}
                    </p>
                  )}
                  <div className="form-group">
                    <label>Proof (links or description)</label>
                    {evidenceLinks.map((link, i) => (
                      <div key={i} className="input-row">
                        <input 
                          type="text"
                          placeholder="Link, screenshot, or describe what you did..."
                          value={link}
                          onChange={e => {
                            const newLinks = [...evidenceLinks];
                            newLinks[i] = e.target.value;
                            setEvidenceLinks(newLinks);
                          }}
                        />
                        {evidenceLinks.length > 1 && (
                          <button className="btn-remove" onClick={() => setEvidenceLinks(evidenceLinks.filter((_, idx) => idx !== i))}>×</button>
                        )}
                      </div>
                    ))}
                    <button className="btn-add" onClick={() => setEvidenceLinks([...evidenceLinks, ''])}>+ Add Another</button>
                  </div>
                  <div className="form-group">
                    <label>Notes (Optional)</label>
                    <textarea 
                      placeholder="What did you learn?"
                      value={reflection}
                      onChange={e => setReflection(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {selectedQuest.progress?.status === 'submitted' && (
                <div className="modal-section pending">
                  <h3>⏳ Awaiting Review</h3>
                  <p>Your proof has been submitted. Your Guide will review it soon!</p>
                </div>
              )}

              {selectedQuest.progress?.status === 'completed' && (
                <div className="modal-section success">
                  <h3>🏆 Complete!</h3>
                  <p>You earned +{selectedQuest.xp_reward} XP for this quest!</p>
                  {selectedQuest.progress?.mentor_feedback && (
                    <p className="feedback"><strong>Guide's Feedback:</strong> {selectedQuest.progress.mentor_feedback}</p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selectedQuest.progress?.status !== 'completed' && selectedQuest.progress?.status !== 'submitted' && (
                <button className="btn btn-success" onClick={() => handleSubmitQuest(selectedQuest.id)} disabled={submitting}>
                  {submitting ? 'Submitting...' : '🚀 Submit Proof'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quest Picker Modal */}
      {showQuestPicker && (
        <div className="modal-overlay" onClick={() => setShowQuestPicker(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎯 Choose a Quest</h2>
              <button className="modal-close" onClick={() => setShowQuestPicker(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="picker-hint">Pick a quest to add to your active quests. You can have up to 3 at a time.</p>
              <div className="quest-picker-grid">
                {availableToSelect.map(quest => (
                  <div 
                    key={quest.id} 
                    className={`picker-card ${quest.is_lucky_quest ? 'lucky' : ''}`}
                    onClick={() => handleSelectQuest(quest.id)}
                  >
                    {quest.is_lucky_quest && <div className="lucky-badge">🍀 1.5x TODAY</div>}
                    <h3>{quest.title}</h3>
                    <p>{quest.description.slice(0, 60)}...</p>
                    <div className="picker-footer">
                      <span>{quest.difficulty === 'beginner' ? '⭐' : quest.difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐'}</span>
                      <span className="picker-xp">+{quest.is_lucky_quest ? Math.round(quest.xp_reward * 1.5) : quest.xp_reward} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏆 Completed Quests</h2>
              <button className="modal-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="modal-body">
              {completedQuests.length === 0 ? (
                <p className="empty-history">No completed quests yet. Get started!</p>
              ) : (
                <div className="history-list">
                  {completedQuests.map(quest => (
                    <div key={quest.id} className="history-card" onClick={() => { setShowHistory(false); openQuestDetail(quest); }}>
                      <div className="history-check">✓</div>
                      <div className="history-info">
                        <h3>{quest.title}</h3>
                        <span className="history-category">{quest.category}</span>
                      </div>
                      <div className="history-xp">+{quest.xp_reward} XP</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0f;
          color: #fff;
          min-height: 100vh;
        }
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>

      <style jsx>{`
        .app-container {
          position: relative;
          min-height: 100vh;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .app-container.loaded { opacity: 1; }

        .ambient-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 20s ease-in-out infinite;
        }
        .orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #00d4ff 0%, transparent 70%);
          top: -200px; right: -200px;
        }
        .orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #ff0080 0%, transparent 70%);
          bottom: -150px; left: -150px;
          animation-delay: -10s;
        }
        .grid-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 20px); }
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 15, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 1rem 0;
        }
        .header-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .logo-icon {
          font-size: 1.75rem;
          filter: drop-shadow(0 0 10px #00d4ff);
        }
        .logo-text {
          font-family: 'Orbitron', monospace;
          font-size: 1.25rem;
          font-weight: 700;
          color: #00d4ff;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .streak-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 149, 0, 0.1);
          border: 1px solid rgba(255, 149, 0, 0.3);
          border-radius: 20px;
        }
        .streak-value { font-weight: 700; color: #ff9500; }

        .main-content {
          position: relative;
          z-index: 1;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        .fade-in-up {
          animation: fadeInUp 0.6s ease forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero-section {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(255, 0, 128, 0.05));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 1.5rem;
        }
        .hero-content {
          display: flex;
          align-items: center;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .avatar-container { position: relative; }
        .avatar {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, var(--glow-color, #00d4ff), #ff0080);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          box-shadow: 0 0 30px var(--glow-color, #00d4ff);
        }
        .level-section { flex: 1; min-width: 200px; }
        .tier-label {
          font-family: 'Orbitron', monospace;
          font-size: 0.8rem;
          letter-spacing: 0.1em;
        }
        .level-display {
          font-family: 'Orbitron', monospace;
          font-size: 2rem;
          font-weight: 900;
          background: linear-gradient(90deg, #00d4ff, #ff0080);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .xp-section { margin-top: 0.75rem; }
        .xp-text {
          font-family: 'Orbitron', monospace;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
          margin-top: 0.5rem;
          text-align: center;
        }
        .stats-grid {
          display: flex;
          gap: 1.5rem;
        }
        .stat-box { text-align: center; }
        .stat-value {
          font-family: 'Orbitron', monospace;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .stat-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
        }

        .reward-section {
          background: linear-gradient(135deg, rgba(255, 149, 0, 0.08), rgba(255, 215, 0, 0.08));
          border: 1px solid rgba(255, 149, 0, 0.3);
          border-radius: 16px;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
        }
        .reward-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-family: 'Orbitron', monospace;
          font-size: 0.85rem;
        }
        .reward-amount {
          font-size: 1.25rem;
          color: #00ff88;
        }

        .lucky-banner {
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 200, 100, 0.05));
          border: 2px solid rgba(0, 255, 136, 0.4);
          border-radius: 16px;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .lucky-banner:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(0, 255, 136, 0.2);
        }
        .lucky-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .lucky-icon { font-size: 1.75rem; }
        .lucky-label {
          font-family: 'Orbitron', monospace;
          font-size: 0.7rem;
          color: #00ff88;
        }
        .lucky-title { font-weight: 600; }
        .lucky-reward { text-align: right; }
        .lucky-xp {
          font-family: 'Orbitron', monospace;
          font-size: 1.25rem;
          font-weight: 700;
          color: #ff9500;
        }
        .lucky-bonus {
          font-size: 0.7rem;
          color: #00ff88;
        }

        .active-section {
          margin-bottom: 1.5rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .quest-slots {
          display: flex;
          gap: 0.5rem;
        }
        .slot {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .slot.filled {
          background: rgba(0, 255, 136, 0.2);
          border: 1px solid rgba(0, 255, 136, 0.4);
          color: #00ff88;
        }
        .slot.empty {
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.3);
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }
        .empty-state p {
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 1rem;
        }

        .quest-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .quest-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.25rem;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }
        .quest-card:hover {
          transform: translateX(5px);
          border-color: rgba(0, 212, 255, 0.3);
          background: rgba(255, 255, 255, 0.05);
        }
        .quest-card.submitted {
          border-color: rgba(168, 85, 247, 0.4);
          background: rgba(168, 85, 247, 0.05);
        }
        .quest-card.lucky {
          border-color: rgba(0, 255, 136, 0.4);
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.05), transparent);
        }
        .lucky-badge {
          position: absolute;
          top: -1px;
          right: 12px;
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          color: #0a0a0f;
          padding: 0.2rem 0.5rem;
          border-radius: 0 0 6px 6px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .quest-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }
        .quest-header h3 {
          font-size: 1rem;
          margin: 0;
        }
        .quest-xp {
          font-family: 'Orbitron', monospace;
          color: #ff9500;
          font-weight: 700;
        }
        .quest-desc {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.75rem;
        }
        .quest-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .quest-difficulty {
          font-size: 0.9rem;
        }
        .status-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
        }
        .status-badge.ready {
          background: rgba(0, 212, 255, 0.15);
          color: #00d4ff;
        }
        .status-badge.submitted {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
        }

        .add-quest-card {
          background: rgba(255, 255, 255, 0.02);
          border: 2px dashed rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .add-quest-card:hover {
          border-color: rgba(0, 212, 255, 0.4);
          color: #00d4ff;
          background: rgba(0, 212, 255, 0.05);
        }
        .add-icon {
          font-size: 1.5rem;
          font-weight: 300;
        }

        .history-link {
          width: 100%;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .history-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .toast {
          position: fixed;
          top: 100px;
          right: 20px;
          background: rgba(10, 10, 15, 0.95);
          border: 1px solid #00ff88;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          color: #00ff88;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal {
          background: #12121a;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal.modal-large {
          max-width: 700px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .modal-header h2 { font-size: 1.25rem; margin: 0; }
        .modal-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-body { padding: 1.5rem; }
        .modal-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          color: rgba(255,255,255,0.5);
        }
        .meta-xp {
          font-family: 'Orbitron', monospace;
          color: #ff9500;
          font-weight: 700;
        }
        .modal-section {
          margin: 1.5rem 0;
          padding: 1rem;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
        }
        .modal-section h3 {
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          color: #00d4ff;
        }
        .modal-section ol {
          padding-left: 1.25rem;
          color: rgba(255,255,255,0.7);
        }
        .modal-section li { margin-bottom: 0.5rem; }
        .modal-section.success {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
        }
        .modal-section.success h3 { color: #00ff88; }
        .modal-section.pending {
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.3);
        }
        .modal-section.pending h3 { color: #a855f7; }
        .evidence-hint {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 1rem;
        }
        .feedback {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.1);
          font-style: italic;
        }
        .form-group { margin-bottom: 1rem; }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.6);
          margin-bottom: 0.5rem;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 0.75rem;
          color: #fff;
          font-size: 0.95rem;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none;
          border-color: #00d4ff;
        }
        .form-group textarea {
          min-height: 80px;
          resize: vertical;
        }
        .input-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .btn-remove {
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid rgba(255, 0, 0, 0.3);
          color: #ff6b6b;
          width: 36px;
          border-radius: 8px;
          cursor: pointer;
        }
        .btn-add {
          background: none;
          border: none;
          color: #00d4ff;
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0.25rem 0;
        }
        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: flex-end;
        }
        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: #fff;
        }
        .btn-success {
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          color: #0a0a0f;
        }
        .btn:hover {
          transform: translateY(-2px);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .picker-hint {
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 1.5rem;
        }
        .quest-picker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .picker-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .picker-card:hover {
          border-color: rgba(0, 212, 255, 0.4);
          background: rgba(0, 212, 255, 0.05);
          transform: translateY(-2px);
        }
        .picker-card.lucky {
          border-color: rgba(0, 255, 136, 0.4);
        }
        .picker-card h3 {
          font-size: 0.95rem;
          margin: 0 0 0.5rem 0;
        }
        .picker-card p {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 0.75rem;
        }
        .picker-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
        }
        .picker-xp {
          font-family: 'Orbitron', monospace;
          color: #ff9500;
        }

        .empty-history {
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
          padding: 2rem;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .history-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .history-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .history-check {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0a0a0f;
          font-weight: bold;
          flex-shrink: 0;
        }
        .history-info {
          flex: 1;
        }
        .history-info h3 {
          font-size: 0.95rem;
          margin: 0 0 0.25rem 0;
        }
        .history-category {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }
        .history-xp {
          font-family: 'Orbitron', monospace;
          color: #00ff88;
          font-weight: 700;
        }

        @media (max-width: 600px) {
          .hero-content { flex-direction: column; text-align: center; }
          .stats-grid { justify-content: center; }
          .quest-picker-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
