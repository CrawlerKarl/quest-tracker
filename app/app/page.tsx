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
  is_lucky_quest?: boolean;
  lucky_multiplier?: number;
  reactions?: string[];
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
  currentStreak: number;
  longestStreak: number;
  streakFreezeAvailable: boolean;
}

interface BonusInfo {
  luckyQuest: any;
  totalMultiplier: number;
  bonusXp: number;
  isWeekend: boolean;
  firstQuestBonusAvailable: boolean;
}

// Rank thresholds - must match backend
const RANK_THRESHOLDS = [
  { rank: 'ROOKIE', minXp: 0, icon: '🌱', color: '#9898a8' },
  { rank: 'APPRENTICE', minXp: 500, icon: '⚡', color: '#00d4ff' },
  { rank: 'PRO', minXp: 1500, icon: '🔥', color: '#ff9500' },
  { rank: 'ELITE', minXp: 3500, icon: '💎', color: '#ff0080' },
  { rank: 'LEGEND', minXp: 7000, icon: '👑', color: '#ffd700' },
];

function getRank(xp: number): { rank: string; icon: string; color: string; minXp: number; nextRank: typeof RANK_THRESHOLDS[0] | null; xpToNext: number } {
  let currentRank = RANK_THRESHOLDS[0];
  let nextRank: typeof RANK_THRESHOLDS[0] | null = RANK_THRESHOLDS[1];
  
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i].minXp) {
      currentRank = RANK_THRESHOLDS[i];
      nextRank = RANK_THRESHOLDS[i + 1] || null;
      break;
    }
  }
  
  return {
    ...currentRank,
    nextRank,
    xpToNext: nextRank ? nextRank.minXp - xp : 0
  };
}

function getStreakBonus(streakDays: number): number {
  if (streakDays >= 3) return 200;
  if (streakDays >= 2) return 100;
  return 0;
}

function calculateRewardValue(totalXp: number): { earned: number; progress: number; nextDollar: number } {
  const earned = Math.floor(totalXp / 100);
  const progress = totalXp % 100;
  return { earned, progress, nextDollar: 100 - progress };
}

function getDifficultyStars(d: string): string {
  return d === 'beginner' ? '⭐' : d === 'intermediate' ? '⭐⭐' : '⭐⭐⭐';
}

export default function HeroApp() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [xpProgress, setXpProgress] = useState<any>(null);
  const [questCounts, setQuestCounts] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [suggestedQuest, setSuggestedQuest] = useState<any>(null);
  const [bonusInfo, setBonusInfo] = useState<BonusInfo | null>(null);
  const [streakStatus, setStreakStatus] = useState<string>('active');
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  
  // Modals
  const [showAchievements, setShowAchievements] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [timelineData, setTimelineData] = useState<any>(null);
  
  // Toast
  const [toast, setToast] = useState<any>(null);

  // Form state
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>(['']);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [safetyReminder, setSafetyReminder] = useState('');

  // PWA install
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    fetchData();
    registerServiceWorker();
    
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('/sw.js'); } catch (e) {}
    }
  }

  async function handleInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setShowInstallBanner(false);
        setToast({ message: '📱 App installed!' });
      }
    }
  }

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
      setAchievements(statsData.allAchievements || []);
      setSuggestedQuest(statsData.suggestedQuest);
      setBonusInfo(statsData.bonusInfo);
      setStreakStatus(statsData.streakStatus || 'active');
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTimeline() {
    try {
      const res = await fetch('/api/timeline');
      const data = await res.json();
      setTimelineData(data);
      setShowTimeline(true);
    } catch (e) {}
  }

  async function handleStartQuest(questId: number) {
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      if (res.ok) {
        setToast({ message: '🚀 Quest accepted!' });
        fetchData();
        setSelectedQuest(null);
      }
    } catch (error) {}
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
        body: JSON.stringify({ action: 'submit', evidenceLinks: filteredLinks, reflection }),
      });
      if (res.ok) {
        setToast({ message: '📤 Proof sent!' });
        setEvidenceLinks(['']);
        setReflection('');
        fetchData();
        setSelectedQuest(null);
      }
    } catch (error) {}
    setSubmitting(false);
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
    } catch (error) {}
  }

  function getQuestStatus(quest: Quest): string {
    return quest.progress?.status || 'available';
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      available: 'Ready', in_progress: 'Active', submitted: 'Sent to Guide',
      approved: 'Victory!', rejected: 'Try Again', completed: 'Crushed It!'
    };
    return labels[status] || status;
  }

  function getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      available: '⚔️', in_progress: '🎯', submitted: '⏳',
      approved: '✅', rejected: '🔄', completed: '🏆'
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
  const streakBonus = getStreakBonus(stats?.currentStreak || 0);
  const reward = calculateRewardValue(stats?.totalXp || 0);
  const earnedAchievements = achievements.filter(a => a.earned_at);
  const lockedAchievements = achievements.filter(a => !a.earned_at && !a.is_secret);

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
          <span style={{ color: 'var(--neon-green)' }}>{toast.message}</span>
        </div>
      )}

      {/* Install Banner */}
      {showInstallBanner && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-pink))',
          padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex',
          alignItems: 'center', gap: '1rem', zIndex: 1000
        }}>
          <span style={{ color: '#0a0a0f', fontWeight: 600 }}>📱 Install CyberQuest?</span>
          <button onClick={handleInstall} style={{ background: '#0a0a0f', color: 'var(--neon-cyan)', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Install</button>
          <button onClick={() => setShowInstallBanner(false)} style={{ background: 'transparent', color: '#0a0a0f', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span style={{ fontSize: '1.8rem' }}>⚡</span>
            <span style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-cyan)', textShadow: '0 0 10px var(--neon-cyan)' }}>CyberQuest</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Streak with click for info */}
            <div 
              onClick={() => setShowStreakInfo(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.4rem 0.75rem', 
                background: (stats?.currentStreak || 0) >= 2 
                  ? 'linear-gradient(135deg, rgba(255, 149, 0, 0.3), rgba(255, 0, 128, 0.3))' 
                  : 'var(--bg-elevated)',
                border: `1px solid ${(stats?.currentStreak || 0) >= 2 ? 'var(--neon-orange)' : 'var(--border-color)'}`,
                borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700, 
                color: (stats?.currentStreak || 0) >= 2 ? 'var(--neon-orange)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}>
              <span>🔥</span>
              <span>{stats?.currentStreak || 0}</span>
              {streakBonus > 0 && <span style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }}>+{streakBonus}</span>}
            </div>
            
            {/* Rank Badge */}
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', background: 'var(--bg-elevated)',
              borderRadius: '8px', border: `2px solid ${rank.color}`,
              boxShadow: `0 0 10px ${rank.color}40`
            }}>
              <span>{rank.icon}</span>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, color: rank.color }}>{rank.rank}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Active Bonuses Banner */}
        {(bonusInfo?.isWeekend || streakBonus > 0) && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 0, 128, 0.15), rgba(255, 149, 0, 0.15))',
            border: '1px solid var(--neon-pink)', borderRadius: '12px',
            padding: '1rem 1.5rem', marginBottom: '1.5rem'
          }}>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', color: 'var(--neon-pink)', marginBottom: '0.5rem' }}>
              🎁 ACTIVE BONUSES
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {bonusInfo?.isWeekend && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎉</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Weekend Warrior</span>
                  <span style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-orange)' }}>2x XP</span>
                </div>
              )}
              {streakBonus > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔥</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{stats?.currentStreak}-Day Streak</span>
                  <span style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-orange)' }}>+{streakBonus} XP/quest</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streak Warning */}
        {streakStatus === 'at_risk' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.15), rgba(255, 0, 128, 0.15))',
            border: '1px solid var(--neon-orange)', borderRadius: '12px',
            padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem'
          }}>
            <span style={{ fontSize: '2rem' }}>🔥</span>
            <div>
              <div style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-orange)', fontWeight: 700 }}>Keep Your Streak!</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Complete a quest today to keep your {stats?.currentStreak}-day streak and +{streakBonus} bonus XP!
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(255, 0, 128, 0.1))',
          border: '1px solid var(--border-color)', borderRadius: '16px',
          padding: '2rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{
              width: '100px', height: '100px', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-pink))',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', boxShadow: '0 0 30px rgba(0, 212, 255, 0.4)', border: '3px solid var(--neon-cyan)', flexShrink: 0
            }}>🦸</div>

            {/* Level & Rank Progress */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.9rem', color: rank.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                {rank.icon} {rank.rank}
              </div>
              <div style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '2.5rem', fontWeight: 900,
                background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-pink))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1
              }}>LEVEL {stats?.level || 1}</div>

              {/* XP Progress to next level */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{
                  height: '16px', background: 'var(--bg-dark)', borderRadius: '8px',
                  overflow: 'hidden', border: `2px solid ${rank.color}50`, position: 'relative'
                }}>
                  <div style={{
                    height: '100%', width: `${xpProgress?.progress || 0}%`,
                    background: `linear-gradient(90deg, ${rank.color}, ${rank.nextRank?.color || rank.color})`,
                    transition: 'width 0.5s ease', boxShadow: `0 0 15px ${rank.color}`
                  }}></div>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    fontSize: '0.7rem', fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.8)', fontFamily: 'Orbitron, sans-serif'
                  }}>{xpProgress?.current || 0} / {xpProgress?.needed || 100} XP</div>
                </div>
                {rank.nextRank && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    {rank.xpToNext} XP to <span style={{ color: rank.nextRank.color, fontWeight: 600 }}>{rank.nextRank.icon} {rank.nextRank.rank}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--neon-green)' }}>{questCounts?.completed || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Victories</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--neon-orange)' }}>{stats?.totalXp || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total XP</div>
              </div>
              <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={fetchTimeline}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--neon-pink)' }}>{stats?.longestStreak || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Best Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Reward Progress - $1 per 100 XP */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.1), rgba(255, 215, 0, 0.1))',
          border: '1px solid var(--neon-orange)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎮</span>
              <div>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, color: 'var(--neon-orange)' }}>REWARD EARNED</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Steam or PlayStation Credit</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.5rem', color: 'var(--neon-green)' }}>${reward.earned}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>$1 per 100 XP</div>
            </div>
          </div>
          <div style={{ height: '10px', background: 'var(--bg-dark)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255, 149, 0, 0.3)' }}>
            <div style={{ height: '100%', width: `${reward.progress}%`, background: 'linear-gradient(90deg, var(--neon-orange), #ffd700)', transition: 'width 0.5s ease' }}></div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
            {reward.nextDollar} XP to next $1
          </div>
        </div>

        {/* Lucky Quest */}
        {bonusInfo?.luckyQuest && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(255, 215, 0, 0.1))',
            border: '2px solid var(--neon-green)', borderRadius: '12px',
            padding: '1rem 1.25rem', marginBottom: '1.5rem', cursor: 'pointer'
          }}
          onClick={() => {
            const quest = quests.find(q => q.id === bonusInfo.luckyQuest.id);
            if (quest) openQuestDetail(quest);
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🍀</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--neon-green)', fontFamily: 'Orbitron, sans-serif' }}>TODAY'S LUCKY QUEST</div>
                  <div style={{ fontWeight: 600 }}>{bonusInfo.luckyQuest.title}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-orange)' }}>+{Math.round(bonusInfo.luckyQuest.xp_reward * 1.5)} XP</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neon-green)' }}>1.5x BONUS!</div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Quest */}
        {suggestedQuest && !bonusInfo?.luckyQuest && filter === 'all' && (
          <div style={{
            background: 'var(--bg-card)', border: '2px solid var(--neon-cyan)',
            borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', cursor: 'pointer'
          }}
          onClick={() => {
            const quest = quests.find(q => q.id === suggestedQuest.id);
            if (quest) openQuestDetail(quest);
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif', marginBottom: '0.25rem' }}>🎯 RECOMMENDED NEXT</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{suggestedQuest.title}</div>
              </div>
              <div style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-orange)', fontWeight: 700 }}>+{suggestedQuest.xp_reward} XP</div>
            </div>
          </div>
        )}

        {/* Quick Stats HUD - NO PENDING */}
        <div className="hud">
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-cyan)' }}>{questCounts?.available || 0}</div>
            <div className="hud-stat-label">Ready</div>
          </div>
          <div className="hud-stat">
            <div className="hud-stat-value" style={{ color: 'var(--neon-orange)' }}>{questCounts?.inProgress || 0}</div>
            <div className="hud-stat-label">Active</div>
          </div>
          <div className="hud-stat" style={{ cursor: 'pointer' }} onClick={() => setShowAchievements(true)}>
            <div className="hud-stat-value" style={{ color: 'var(--neon-purple)' }}>{earnedAchievements.length}</div>
            <div className="hud-stat-label">Achievements</div>
          </div>
          <div className="hud-stat" style={{ cursor: 'pointer' }} onClick={fetchTimeline}>
            <div className="hud-stat-value" style={{ color: 'var(--neon-pink)' }}>📊</div>
            <div className="hud-stat-label">Journey</div>
          </div>
        </div>

        {/* Filters - NO PENDING */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div className="filters">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-btn ${filter === 'available' ? 'active' : ''}`} onClick={() => setFilter('available')}>⚔️ Ready</button>
            <button className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>🎯 Active</button>
            <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>🏆 Done</button>
          </div>
          <div className="filters">
            <button className={`filter-btn ${difficultyFilter === 'all' ? 'active' : ''}`} onClick={() => setDifficultyFilter('all')}>All</button>
            <button className={`filter-btn ${difficultyFilter === 'beginner' ? 'active' : ''}`} onClick={() => setDifficultyFilter('beginner')}>⭐</button>
            <button className={`filter-btn ${difficultyFilter === 'intermediate' ? 'active' : ''}`} onClick={() => setDifficultyFilter('intermediate')}>⭐⭐</button>
            <button className={`filter-btn ${difficultyFilter === 'advanced' ? 'active' : ''}`} onClick={() => setDifficultyFilter('advanced')}>⭐⭐⭐</button>
          </div>
        </div>

        {/* Quest Grid */}
        {filteredQuests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎮</div>
            <p style={{ fontFamily: 'Orbitron, sans-serif' }}>No quests here!</p>
          </div>
        ) : (
          <div className="quest-grid">
            {filteredQuests.map(quest => {
              const status = getQuestStatus(quest);
              const isLucky = bonusInfo?.luckyQuest?.id === quest.id;
              return (
                <div key={quest.id} className="card quest-card" onClick={() => openQuestDetail(quest)}
                  style={{ cursor: 'pointer', border: isLucky ? '2px solid var(--neon-green)' : undefined, position: 'relative' }}>
                  {isLucky && (
                    <div style={{ position: 'absolute', top: '-8px', right: '10px', background: 'var(--neon-green)', color: '#0a0a0f', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>🍀 1.5x</div>
                  )}
                  <div className="quest-card-header">
                    <div>
                      <div className="quest-title">{quest.title}</div>
                      <div className="quest-category">{quest.category}</div>
                    </div>
                    <div className="quest-xp">+{isLucky ? Math.round(quest.xp_reward * 1.5) : quest.xp_reward} XP</div>
                  </div>
                  <p className="quest-description">{quest.description.length > 100 ? quest.description.slice(0, 100) + '...' : quest.description}</p>
                  <div className="quest-footer">
                    <span style={{ color: 'var(--neon-orange)' }}>{getDifficultyStars(quest.difficulty)}</span>
                    <span className={`badge badge-${status.replace('_', '-')}`}>{getStatusIcon(status)} {getStatusLabel(status)}</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--neon-orange)' }}>{getDifficultyStars(selectedQuest.difficulty)}</span>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem' }}>{selectedQuest.category}</span>
                </div>
                <span className="quest-xp" style={{ fontSize: '1.1rem' }}>+{selectedQuest.xp_reward} XP</span>
              </div>

              {selectedQuest.progress && (
                <div style={{ marginBottom: '1rem' }}>
                  <span className={`badge badge-${selectedQuest.progress.status.replace('_', '-')}`}>
                    {getStatusIcon(selectedQuest.progress.status)} {getStatusLabel(selectedQuest.progress.status)}
                  </span>
                </div>
              )}

              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.7' }}>{selectedQuest.description}</p>

              {selectedQuest.steps?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif' }}>🎯 Mission Steps</h3>
                  <ol className="steps-list">{selectedQuest.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
                </div>
              )}

              {selectedQuest.why_it_matters && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--neon-orange)' }}>💡 Why This Matters</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>{selectedQuest.why_it_matters}</p>
                </div>
              )}

              {selectedQuest.safety_notes && (
                <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                  <span>⚠️</span>
                  <div><strong>Heads Up</strong><p style={{ marginTop: '0.25rem' }}>{selectedQuest.safety_notes}</p></div>
                </div>
              )}

              {selectedQuest.progress?.status === 'rejected' && selectedQuest.progress.mentor_feedback && (
                <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                  <span>💬</span>
                  <div><strong>Guide Feedback</strong><p style={{ marginTop: '0.25rem' }}>{selectedQuest.progress.mentor_feedback}</p></div>
                </div>
              )}

              {selectedQuest.progress?.status === 'completed' && selectedQuest.reactions && selectedQuest.reactions.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your Guide says:</div>
                  <div style={{ fontSize: '2rem' }}>{selectedQuest.reactions.join(' ')}</div>
                </div>
              )}

              {(selectedQuest.progress?.status === 'in_progress' || selectedQuest.progress?.status === 'rejected') && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--neon-green)', fontFamily: 'Orbitron, sans-serif' }}>📤 Drop Your Proof</h3>
                  {safetyReminder && (
                    <div className="alert alert-info" style={{ marginBottom: '1rem' }}><span>🔒</span><div style={{ fontSize: '0.85rem' }}>{safetyReminder}</div></div>
                  )}
                  {selectedQuest.evidenceExamples?.length > 0 && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PROOF IDEAS:</div>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {selectedQuest.evidenceExamples.map((ex, i) => <li key={i}>{ex}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Proof Links</label>
                    {evidenceLinks.map((link, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="url" placeholder="https://imgur.com/..." value={link} onChange={e => { const n = [...evidenceLinks]; n[i] = e.target.value; setEvidenceLinks(n); }} />
                        {evidenceLinks.length > 1 && <button className="btn btn-ghost btn-small" onClick={() => setEvidenceLinks(evidenceLinks.filter((_, idx) => idx !== i))}>×</button>}
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-small" onClick={() => setEvidenceLinks([...evidenceLinks, ''])}>+ Add Link</button>
                  </div>
                  <div className="form-group">
                    <label>Battle Notes (Optional)</label>
                    <textarea placeholder="What did you learn?" value={reflection} onChange={e => setReflection(e.target.value)} />
                  </div>
                </div>
              )}

              {selectedQuest.progress?.status === 'completed' && (
                <div className="alert alert-success"><span>🏆</span><div><strong>Victory!</strong><p style={{ marginTop: '0.25rem' }}>You earned +{selectedQuest.xp_reward} XP!</p></div></div>
              )}

              {selectedQuest.progress?.status === 'submitted' && (
                <div className="alert alert-info"><span>⏳</span><div><strong>Proof Sent!</strong><p style={{ marginTop: '0.25rem' }}>Waiting for your Guide...</p></div></div>
              )}
            </div>
            <div className="modal-footer">
              {!selectedQuest.progress && <button className="btn btn-primary" onClick={() => handleStartQuest(selectedQuest.id)}>⚔️ Accept Quest</button>}
              {(selectedQuest.progress?.status === 'in_progress' || selectedQuest.progress?.status === 'rejected') && (
                <button className="btn btn-success" onClick={() => handleSubmitQuest(selectedQuest.id)} disabled={submitting}>{submitting ? 'Sending...' : '🚀 Submit Proof'}</button>
              )}
              {(selectedQuest.progress?.status === 'submitted' || selectedQuest.progress?.status === 'completed') && (
                <button className="btn btn-ghost" onClick={() => setSelectedQuest(null)}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Streak Info Modal */}
      {showStreakInfo && (
        <div className="modal-overlay" onClick={() => setShowStreakInfo(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">🔥 Streak Bonuses</h2>
              <button className="modal-close" onClick={() => setShowStreakInfo(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Keep completing quests daily to earn bonus XP on every quest!
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px', opacity: (stats?.currentStreak || 0) >= 1 ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔥</span>
                    <span>1 Day</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>No bonus (yet!)</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: (stats?.currentStreak || 0) >= 2 ? 'linear-gradient(135deg, rgba(255, 149, 0, 0.2), rgba(255, 0, 128, 0.1))' : 'var(--bg-dark)', borderRadius: '8px', border: (stats?.currentStreak || 0) >= 2 ? '1px solid var(--neon-orange)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔥🔥</span>
                    <span>2 Days</span>
                  </div>
                  <span style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-orange)' }}>+100 XP/quest</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: (stats?.currentStreak || 0) >= 3 ? 'linear-gradient(135deg, rgba(255, 149, 0, 0.3), rgba(255, 0, 128, 0.2))' : 'var(--bg-dark)', borderRadius: '8px', border: (stats?.currentStreak || 0) >= 3 ? '2px solid var(--neon-orange)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔥🔥🔥</span>
                    <span>3+ Days</span>
                  </div>
                  <span style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--neon-orange)', fontWeight: 700 }}>+200 XP/quest</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your Current Streak</div>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '2rem', color: 'var(--neon-orange)' }}>{stats?.currentStreak || 0} Days</div>
                {streakBonus > 0 && <div style={{ color: 'var(--neon-green)', marginTop: '0.5rem' }}>+{streakBonus} XP bonus active!</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowStreakInfo(false)}>Got It!</button>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="modal-overlay" onClick={() => setShowAchievements(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">🏆 Achievements</h2>
              <button className="modal-close" onClick={() => setShowAchievements(false)}>×</button>
            </div>
            <div className="modal-body">
              {earnedAchievements.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--neon-green)', fontFamily: 'Orbitron, sans-serif', marginBottom: '1rem' }}>UNLOCKED ({earnedAchievements.length})</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                    {earnedAchievements.map(a => (
                      <div key={a.id} style={{ background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 212, 255, 0.1))', border: '1px solid var(--neon-green)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{a.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{a.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.description}</div>
                        {a.xp_bonus > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--neon-orange)', marginTop: '0.5rem' }}>+{a.xp_bonus} XP</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {lockedAchievements.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'Orbitron, sans-serif', marginBottom: '1rem' }}>LOCKED ({lockedAchievements.length})</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                    {lockedAchievements.map(a => (
                      <div key={a.id} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', textAlign: 'center', opacity: 0.6 }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', filter: 'grayscale(1)' }}>{a.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{a.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔮 There are also <span style={{ color: 'var(--neon-purple)' }}>secret achievements</span> to discover...</span>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setShowAchievements(false)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {showTimeline && timelineData && (
        <div className="modal-overlay" onClick={() => setShowTimeline(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 className="modal-title">📊 Your Journey</h2>
              <button className="modal-close" onClick={() => setShowTimeline(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(255, 0, 128, 0.1))', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '2.5rem', fontWeight: 900, color: 'var(--neon-cyan)' }}>{timelineData.totalStats.progressPercentage}%</div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>of CyberQuest Complete</div>
                <div style={{ height: '10px', background: 'var(--bg-dark)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${timelineData.totalStats.progressPercentage}%`, background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-pink))' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1.5rem' }}>
                  <div><div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.5rem', color: 'var(--neon-green)' }}>{timelineData.totalStats.questsCompleted}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Done</div></div>
                  <div><div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.5rem', color: 'var(--neon-orange)' }}>{timelineData.totalStats.totalXp}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XP</div></div>
                  <div><div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.5rem', color: 'var(--neon-pink)' }}>{timelineData.totalStats.journeyDays}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Days</div></div>
                </div>
              </div>
              {timelineData.weeklyStats.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--neon-cyan)', fontFamily: 'Orbitron, sans-serif', marginBottom: '1rem' }}>WEEKLY</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {timelineData.weeklyStats.slice(-6).map((week: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '70px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div style={{ flex: 1, height: '20px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (week.questsCompleted / 5) * 100)}%`, background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-green))', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{week.questsCompleted}</span>
                          </div>
                        </div>
                        <div style={{ width: '50px', fontSize: '0.8rem', color: 'var(--neon-orange)', textAlign: 'right' }}>+{week.xpEarned}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setShowTimeline(false)}>Close</button></div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
}
