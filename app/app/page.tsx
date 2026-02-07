'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================
// ANIMATED NUMBER COMPONENT
// Numbers tick up smoothly instead of jumping
// ============================================
function AnimatedNumber({ value, duration = 1000, prefix = '', suffix = '' }: { 
  value: number; 
  duration?: number; 
  prefix?: string; 
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth deceleration
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

  return <>{prefix}{displayValue.toLocaleString()}{suffix}</>;
}

// ============================================
// GLOWING XP BAR COMPONENT
// Smooth fill with pulsing glow effect
// ============================================
function GlowingXpBar({ progress, color, nextColor }: { 
  progress: number; 
  color: string; 
  nextColor?: string;
}) {
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
            background: `linear-gradient(90deg, ${color}, ${nextColor || color})`,
            boxShadow: `0 0 20px ${color}80, 0 0 40px ${color}40`,
          }}
        >
          <div className="xp-bar-shine"></div>
        </div>
        <div className="xp-bar-glow" style={{ 
          left: `${animatedProgress}%`,
          background: color,
          opacity: animatedProgress > 0 ? 1 : 0,
        }}></div>
      </div>
      <style jsx>{`
        .xp-bar-container {
          position: relative;
          width: 100%;
        }
        .xp-bar-track {
          height: 18px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 9px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .xp-bar-fill {
          height: 100%;
          border-radius: 9px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .xp-bar-shine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.3), transparent);
          border-radius: 9px 9px 0 0;
        }
        .xp-bar-glow {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          filter: blur(10px);
          transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

// ============================================
// PARTICLE BURST COMPONENT
// Celebration particles on achievements
// ============================================
function ParticleBurst({ active, color = '#00ff88' }: { active: boolean; color?: string }) {
  if (!active) return null;

  return (
    <div className="particle-container">
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="particle"
          style={{
            '--angle': `${i * 30}deg`,
            '--delay': `${i * 0.02}s`,
            '--color': color,
          } as React.CSSProperties}
        />
      ))}
      <style jsx>{`
        .particle-container {
          position: absolute;
          top: 50%;
          left: 50%;
          pointer-events: none;
        }
        .particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: var(--color);
          border-radius: 50%;
          animation: burst 0.6s ease-out forwards;
          animation-delay: var(--delay);
          opacity: 0;
          box-shadow: 0 0 10px var(--color);
        }
        @keyframes burst {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(60px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// SHIMMER EFFECT FOR RANK BADGE
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
          background: var(--bg-elevated);
          border-radius: 8px;
          border: 2px solid var(--badge-color);
          box-shadow: 0 0 15px color-mix(in srgb, var(--badge-color) 30%, transparent);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .shimmer-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px color-mix(in srgb, var(--badge-color) 50%, transparent);
        }
        .shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
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
// QUEST CARD WITH HOVER EFFECTS
// ============================================
function QuestCard({ quest, isLucky, onClick }: { 
  quest: any; 
  isLucky: boolean; 
  onClick: () => void;
}) {
  const status = quest.progress?.status || 'available';
  
  const getStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      available: 'Ready', in_progress: 'Active', submitted: 'Awaiting Review',
      approved: 'Victory!', rejected: 'Try Again', completed: 'Completed'
    };
    return labels[s] || s;
  };

  const getStatusIcon = (s: string) => {
    const icons: Record<string, string> = {
      available: '⚔️', in_progress: '🎯', submitted: '⏳',
      approved: '✅', rejected: '🔄', completed: '🏆'
    };
    return icons[s] || '📋';
  };

  const getDifficultyStars = (d: string) => {
    return d === 'beginner' ? '⭐' : d === 'intermediate' ? '⭐⭐' : '⭐⭐⭐';
  };

  return (
    <div 
      className={`quest-card ${status} ${isLucky ? 'lucky' : ''}`}
      onClick={onClick}
    >
      {isLucky && <div className="lucky-badge">🍀 1.5x</div>}
      {status === 'completed' && <div className="completed-check">✓</div>}
      
      <div className="quest-card-header">
        <div className="quest-info">
          <h3 className="quest-title">{quest.title}</h3>
          <span className="quest-category">{quest.category}</span>
        </div>
        <div className="quest-xp">+{isLucky ? Math.round(quest.xp_reward * 1.5) : quest.xp_reward}</div>
      </div>
      
      <p className="quest-description">
        {quest.description.length > 100 ? quest.description.slice(0, 100) + '...' : quest.description}
      </p>
      
      <div className="quest-footer">
        <span className="quest-difficulty">{getDifficultyStars(quest.difficulty)}</span>
        <span className={`quest-status ${status}`}>
          {getStatusIcon(status)} {getStatusLabel(status)}
        </span>
      </div>

      <style jsx>{`
        .quest-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .quest-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.02) 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .quest-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 212, 255, 0.3);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 212, 255, 0.1);
        }
        .quest-card:hover::before {
          opacity: 1;
        }
        .quest-card.lucky {
          border-color: rgba(0, 255, 136, 0.4);
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.05) 0%, transparent 100%);
        }
        .quest-card.lucky:hover {
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 136, 0.2);
        }
        .quest-card.completed {
          opacity: 0.7;
        }
        .quest-card.completed:hover {
          opacity: 1;
        }
        .lucky-badge {
          position: absolute;
          top: -1px;
          right: 12px;
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          color: #0a0a0f;
          padding: 0.25rem 0.6rem;
          border-radius: 0 0 8px 8px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
        }
        .completed-check {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0a0a0f;
          font-weight: bold;
          font-size: 0.9rem;
          box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4);
        }
        .quest-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }
        .quest-info {
          flex: 1;
          min-width: 0;
        }
        .quest-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
          color: #fff;
        }
        .quest-category {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .quest-xp {
          font-family: 'Orbitron', monospace;
          font-size: 1.1rem;
          font-weight: 700;
          color: #ff9500;
          text-shadow: 0 0 20px rgba(255, 149, 0, 0.5);
          white-space: nowrap;
          margin-left: 1rem;
        }
        .quest-description {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.5;
          margin: 0 0 1rem 0;
        }
        .quest-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .quest-difficulty {
          font-size: 0.9rem;
        }
        .quest-status {
          font-size: 0.8rem;
          padding: 0.3rem 0.75rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .quest-status.available {
          color: #00d4ff;
          border-color: rgba(0, 212, 255, 0.3);
        }
        .quest-status.in_progress {
          color: #ff9500;
          border-color: rgba(255, 149, 0, 0.3);
        }
        .quest-status.completed {
          color: #00ff88;
          border-color: rgba(0, 255, 136, 0.3);
        }
        .quest-status.submitted {
          color: #a855f7;
          border-color: rgba(168, 85, 247, 0.3);
        }
      `}</style>
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================
function StatCard({ icon, value, label, color, delay = 0 }: {
  icon: string;
  value: number;
  label: string;
  color: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`stat-card ${visible ? 'visible' : ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ color }}>
        <AnimatedNumber value={value} duration={1200} />
      </div>
      <div className="stat-label">{label}</div>
      <style jsx>{`
        .stat-card {
          text-align: center;
          padding: 1rem;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stat-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .stat-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .stat-value {
          font-family: 'Orbitron', monospace;
          font-size: 1.75rem;
          font-weight: 700;
        }
        .stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}

// ============================================
// MAIN INTERFACES
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
  is_locked?: boolean;
  is_lucky_quest?: boolean;
  lucky_multiplier?: number;
  tier?: string;
  unlock_at_xp?: number;
  reactions?: string[];
  progress: {
    id: number;
    status: string;
    evidence_links: string;
    reflection: string;
    mentor_feedback: string;
  } | null;
}

// Tier display info
const TIERS: Record<string, { icon: string; name: string; color: string; minXp: number }> = {
  rookie: { icon: '🌱', name: 'ROOKIE', color: '#9898a8', minXp: 0 },
  apprentice: { icon: '⚡', name: 'APPRENTICE', color: '#00d4ff', minXp: 1000 },
  pro: { icon: '🔥', name: 'PRO', color: '#ff9500', minXp: 3000 },
  elite: { icon: '💎', name: 'ELITE', color: '#ff0080', minXp: 6000 },
  legend: { icon: '👑', name: 'LEGEND', color: '#ffd700', minXp: 10000 },
};

function getStreakBonus(streakDays: number): number {
  if (streakDays >= 3) return 200;
  if (streakDays >= 2) return 100;
  return 0;
}

// ============================================
// MAIN HERO APP
// ============================================
export default function HeroApp() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [xpProgress, setXpProgress] = useState<any>(null);
  const [questCounts, setQuestCounts] = useState<any>(null);
  const [tierInfo, setTierInfo] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [suggestedQuest, setSuggestedQuest] = useState<any>(null);
  const [bonusInfo, setBonusInfo] = useState<any>(null);
  const [streakStatus, setStreakStatus] = useState<string>('active');
  const [streakBonus, setStreakBonus] = useState<number>(0);
  const [rewardInfo, setRewardInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Modals
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showTierProgress, setShowTierProgress] = useState(false);

  // Toast
  const [toast, setToast] = useState<any>(null);

  // Form state
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>(['']);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Page loaded animation
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
      setXpProgress(statsData.xpProgress);
      setQuestCounts(statsData.questCounts);
      setTierInfo(statsData.tierInfo);
      setAchievements(statsData.allAchievements || []);
      setSuggestedQuest(statsData.suggestedQuest);
      setBonusInfo(statsData.bonusInfo);
      setStreakStatus(statsData.streakStatus || 'active');
      setStreakBonus(statsData.streakBonus || 0);
      setRewardInfo(statsData.rewardInfo);
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
        setToast({ message: '🚀 Quest accepted!' });
        fetchData();
        setSelectedQuest(null);
      }
    } catch (error) {}
  }

  async function handleSubmitQuest(questId: number) {
    const filteredLinks = evidenceLinks.filter(link => link.trim());
    if (filteredLinks.length === 0) {
      alert('Add at least one proof link!');
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
        setToast({ message: '📤 Proof submitted!' });
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
      if (data.quest.progress?.evidence_links) {
        try {
          const links = JSON.parse(data.quest.progress.evidence_links);
          setEvidenceLinks(links.length > 0 ? links : ['']);
        } catch { setEvidenceLinks(['']); }
      } else {
        setEvidenceLinks(['']);
      }
      setReflection(data.quest.progress?.reflection || '');
    } catch (error) {}
  }

  const filteredQuests = quests.filter(quest => {
    const status = quest.progress?.status || 'available';
    if (filter === 'all') return true;
    if (filter === 'available') return status === 'available';
    if (filter === 'active') return status === 'in_progress';
    if (filter === 'completed') return status === 'completed';
    return true;
  });

  const currentTier = tierInfo?.currentTier || 'rookie';
  const currentTierData = TIERS[currentTier];
  const nextTierData = tierInfo?.nextTier ? TIERS[tierInfo.nextTier] : null;
  const earnedAchievements = achievements.filter(a => a.earned_at);

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
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
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
      {toast && (
        <div className="toast">
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">CyberQuest</span>
          </div>
          <div className="header-right">
            {/* Streak */}
            <div className="streak-badge" onClick={() => setShowStreakInfo(true)}>
              <span className="streak-icon">🔥</span>
              <span className="streak-value">{stats?.currentStreak || 0}</span>
              {streakBonus > 0 && <span className="streak-bonus">+{streakBonus}</span>}
            </div>
            
            {/* Rank Badge */}
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
        {/* Active Bonuses */}
        {(bonusInfo?.isWeekend || streakBonus > 0) && (
          <div className="bonus-banner fade-in">
            <span className="bonus-label">🎁 ACTIVE BONUSES</span>
            <div className="bonus-items">
              {bonusInfo?.isWeekend && (
                <span className="bonus-item">🎉 Weekend 2x XP</span>
              )}
              {streakBonus > 0 && (
                <span className="bonus-item">🔥 Streak +{streakBonus}/quest</span>
              )}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="hero-section fade-in-up">
          <div className="hero-content">
            {/* Avatar */}
            <div className="avatar-container" style={{ '--glow-color': currentTierData?.color } as React.CSSProperties}>
              <div className="avatar">🦸</div>
              <div className="avatar-ring"></div>
            </div>

            {/* Level & XP */}
            <div className="level-section">
              <div className="tier-label" style={{ color: currentTierData?.color }}>
                {currentTierData?.icon} {currentTierData?.name}
              </div>
              <div className="level-display">
                LEVEL <AnimatedNumber value={stats?.level || 1} duration={800} />
              </div>
              
              <div className="xp-section">
                <GlowingXpBar 
                  progress={xpProgress?.progress || 0} 
                  color={currentTierData?.color || '#00d4ff'}
                  nextColor={nextTierData?.color}
                />
                <div className="xp-text">
                  <AnimatedNumber value={stats?.totalXp || 0} duration={1000} /> XP
                </div>
                {nextTierData && tierInfo && (
                  <div className="next-tier-hint">
                    <AnimatedNumber value={tierInfo.xpToNextTier} duration={1000} /> XP to{' '}
                    <span style={{ color: nextTierData.color }}>{nextTierData.icon} {nextTierData.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="stats-row">
              <StatCard icon="🏆" value={questCounts?.completed || 0} label="Victories" color="#00ff88" delay={200} />
              <StatCard icon="⚡" value={stats?.totalXp || 0} label="Total XP" color="#ff9500" delay={400} />
              <StatCard icon="🔥" value={stats?.longestStreak || 0} label="Best Streak" color="#ff0080" delay={600} />
            </div>
          </div>
        </section>

        {/* Reward Progress */}
        {rewardInfo && (
          <section className="reward-section fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="reward-content">
              <div className="reward-info">
                <span className="reward-icon">🎮</span>
                <div>
                  <div className="reward-title">REWARD EARNED</div>
                  <div className="reward-subtitle">Steam or PlayStation</div>
                </div>
              </div>
              <div className="reward-amount">
                $<AnimatedNumber value={rewardInfo.earned} duration={1200} />
              </div>
            </div>
            <div className="reward-progress">
              <GlowingXpBar progress={rewardInfo.progress} color="#ff9500" />
              <div className="reward-hint">{rewardInfo.nextDollar} XP to next $1</div>
            </div>
          </section>
        )}

        {/* Lucky Quest */}
        {bonusInfo?.luckyQuest && (
          <div 
            className="lucky-quest-card fade-in-up" 
            style={{ animationDelay: '0.3s' }}
            onClick={() => {
              const quest = quests.find(q => q.id === bonusInfo.luckyQuest.id);
              if (quest) openQuestDetail(quest);
            }}
          >
            <div className="lucky-quest-content">
              <span className="lucky-icon">🍀</span>
              <div className="lucky-info">
                <div className="lucky-label">TODAY'S LUCKY QUEST</div>
                <div className="lucky-title">{bonusInfo.luckyQuest.title}</div>
              </div>
            </div>
            <div className="lucky-reward">
              <div className="lucky-xp">+{Math.round(bonusInfo.luckyQuest.xp_reward * 1.5)}</div>
              <div className="lucky-bonus">1.5x BONUS</div>
            </div>
          </div>
        )}

        {/* Quick Stats HUD */}
        <div className="hud fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="hud-stat" onClick={() => setFilter('available')}>
            <div className="hud-value" style={{ color: '#00d4ff' }}>{questCounts?.available || 0}</div>
            <div className="hud-label">Ready</div>
          </div>
          <div className="hud-stat" onClick={() => setFilter('active')}>
            <div className="hud-value" style={{ color: '#ff9500' }}>{questCounts?.inProgress || 0}</div>
            <div className="hud-label">Active</div>
          </div>
          <div className="hud-stat" onClick={() => setShowAchievements(true)}>
            <div className="hud-value" style={{ color: '#a855f7' }}>{earnedAchievements.length}</div>
            <div className="hud-label">Achievements</div>
          </div>
          <div className="hud-stat" onClick={() => setShowTierProgress(true)}>
            <div className="hud-value">{currentTierData?.icon}</div>
            <div className="hud-label">Tier</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters fade-in-up" style={{ animationDelay: '0.5s' }}>
          {['all', 'available', 'active', 'completed'].map(f => (
            <button 
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '📋 All' : f === 'available' ? '⚔️ Ready' : f === 'active' ? '🎯 Active' : '🏆 Done'}
            </button>
          ))}
        </div>

        {/* Quest Grid */}
        <div className="quest-grid">
          {filteredQuests.map((quest, index) => (
            <div 
              key={quest.id} 
              className="quest-card-wrapper fade-in-up"
              style={{ animationDelay: `${0.1 * (index % 6)}s` }}
            >
              <QuestCard 
                quest={quest}
                isLucky={bonusInfo?.luckyQuest?.id === quest.id}
                onClick={() => openQuestDetail(quest)}
              />
            </div>
          ))}
        </div>

        {filteredQuests.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎮</div>
            <p>No quests here!</p>
          </div>
        )}
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
                <span className="meta-category">{selectedQuest.category}</span>
                <span className="meta-xp">+{selectedQuest.xp_reward} XP</span>
              </div>

              <p className="modal-description">{selectedQuest.description}</p>

              {selectedQuest.steps?.length > 0 && (
                <div className="modal-section">
                  <h3>🎯 Mission Steps</h3>
                  <ol className="steps-list">
                    {selectedQuest.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                </div>
              )}

              {selectedQuest.why_it_matters && (
                <div className="modal-section">
                  <h3>💡 Why It Matters</h3>
                  <p>{selectedQuest.why_it_matters}</p>
                </div>
              )}

              {selectedQuest.safety_notes && (
                <div className="modal-section warning">
                  <h3>⚠️ Safety Notes</h3>
                  <p>{selectedQuest.safety_notes}</p>
                </div>
              )}

              {(selectedQuest.progress?.status === 'in_progress' || selectedQuest.progress?.status === 'rejected') && (
                <div className="modal-section">
                  <h3>📤 Submit Proof</h3>
                  {selectedQuest.evidenceExamples?.length > 0 && (
                    <div className="evidence-hints">
                      <strong>Ideas:</strong> {selectedQuest.evidenceExamples.join(' • ')}
                    </div>
                  )}
                  <div className="form-group">
                    <label>Proof (links or description)</label>
                    {evidenceLinks.map((link, i) => (
                      <div key={i} className="link-input-row">
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
                          <button 
                            className="btn-remove"
                            onClick={() => setEvidenceLinks(evidenceLinks.filter((_, idx) => idx !== i))}
                          >×</button>
                        )}
                      </div>
                    ))}
                    <button className="btn-add-link" onClick={() => setEvidenceLinks([...evidenceLinks, ''])}>
                      + Add Another
                    </button>
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

              {selectedQuest.progress?.status === 'completed' && (
                <div className="modal-section success">
                  <h3>🏆 Victory!</h3>
                  <p>You earned +{selectedQuest.xp_reward} XP for completing this quest!</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!selectedQuest.progress && (
                <button className="btn btn-primary" onClick={() => handleStartQuest(selectedQuest.id)}>
                  ⚔️ Accept Quest
                </button>
              )}
              {(selectedQuest.progress?.status === 'in_progress' || selectedQuest.progress?.status === 'rejected') && (
                <button 
                  className="btn btn-success" 
                  onClick={() => handleSubmitQuest(selectedQuest.id)}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : '🚀 Submit Proof'}
                </button>
              )}
              {selectedQuest.progress?.status === 'submitted' && (
                <div className="pending-notice">⏳ Awaiting Guide Review</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Streak Info Modal */}
      {showStreakInfo && (
        <div className="modal-overlay" onClick={() => setShowStreakInfo(false)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔥 Streak Bonuses</h2>
              <button className="modal-close" onClick={() => setShowStreakInfo(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
                Complete quests daily for bonus XP!
              </p>
              <div className="streak-tiers">
                {[
                  { days: 1, bonus: 0, label: '1 Day', fires: '🔥' },
                  { days: 2, bonus: 100, label: '2 Days', fires: '🔥🔥' },
                  { days: 3, bonus: 200, label: '3+ Days', fires: '🔥🔥🔥' },
                ].map(tier => (
                  <div 
                    key={tier.days}
                    className={`streak-tier ${(stats?.currentStreak || 0) >= tier.days ? 'active' : ''}`}
                  >
                    <span className="streak-tier-fires">{tier.fires}</span>
                    <span className="streak-tier-label">{tier.label}</span>
                    <span className="streak-tier-bonus">
                      {tier.bonus > 0 ? `+${tier.bonus} XP` : '—'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="current-streak-display">
                <div className="current-streak-label">Your Streak</div>
                <div className="current-streak-value">{stats?.currentStreak || 0}</div>
                {streakBonus > 0 && (
                  <div className="current-streak-bonus">+{streakBonus} XP active!</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0f;
          color: #fff;
          min-height: 100vh;
          overflow-x: hidden;
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
        .app-container.loaded {
          opacity: 1;
        }

        /* Ambient Background */
        .ambient-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
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
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #00d4ff 0%, transparent 70%);
          top: -200px;
          right: -200px;
        }
        .orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #ff0080 0%, transparent 70%);
          bottom: -150px;
          left: -150px;
          animation-delay: -10s;
        }
        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 20px); }
        }

        /* Header */
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
          max-width: 1200px;
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
          text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
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
          cursor: pointer;
          transition: all 0.2s;
        }
        .streak-badge:hover {
          background: rgba(255, 149, 0, 0.2);
          transform: scale(1.05);
        }
        .streak-icon { font-size: 1rem; }
        .streak-value { font-weight: 700; color: #ff9500; }
        .streak-bonus { font-size: 0.7rem; color: #00ff88; margin-left: 0.25rem; }

        /* Main Content */
        .main-content {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        /* Animations */
        .fade-in {
          animation: fadeIn 0.5s ease forwards;
        }
        .fade-in-up {
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Bonus Banner */
        .bonus-banner {
          background: linear-gradient(135deg, rgba(255, 0, 128, 0.1), rgba(255, 149, 0, 0.1));
          border: 1px solid rgba(255, 0, 128, 0.3);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .bonus-label {
          font-family: 'Orbitron', monospace;
          font-size: 0.75rem;
          color: #ff0080;
          letter-spacing: 0.05em;
        }
        .bonus-items {
          display: flex;
          gap: 1rem;
        }
        .bonus-item {
          color: rgba(255,255,255,0.8);
          font-size: 0.9rem;
        }

        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(255, 0, 128, 0.05));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 2.5rem;
          margin-bottom: 1.5rem;
        }
        .hero-content {
          display: flex;
          align-items: center;
          gap: 2.5rem;
          flex-wrap: wrap;
        }
        .avatar-container {
          position: relative;
          flex-shrink: 0;
        }
        .avatar {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, var(--glow-color, #00d4ff), #ff0080);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          box-shadow: 0 0 40px var(--glow-color, #00d4ff);
          position: relative;
          z-index: 1;
        }
        .avatar-ring {
          position: absolute;
          top: -5px;
          left: -5px;
          right: -5px;
          bottom: -5px;
          border: 2px solid var(--glow-color, #00d4ff);
          border-radius: 50%;
          animation: pulse-ring 2s ease-in-out infinite;
        }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.2; }
        }
        .level-section {
          flex: 1;
          min-width: 280px;
        }
        .tier-label {
          font-family: 'Orbitron', monospace;
          font-size: 0.85rem;
          letter-spacing: 0.1em;
          margin-bottom: 0.25rem;
        }
        .level-display {
          font-family: 'Orbitron', monospace;
          font-size: 2.5rem;
          font-weight: 900;
          background: linear-gradient(90deg, #00d4ff, #ff0080);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }
        .xp-section {
          margin-top: 1rem;
        }
        .xp-text {
          font-family: 'Orbitron', monospace;
          font-size: 0.9rem;
          color: rgba(255,255,255,0.7);
          margin-top: 0.5rem;
          text-align: center;
        }
        .next-tier-hint {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          margin-top: 0.5rem;
          text-align: center;
        }
        .stats-row {
          display: flex;
          gap: 1rem;
        }

        /* Reward Section */
        .reward-section {
          background: linear-gradient(135deg, rgba(255, 149, 0, 0.08), rgba(255, 215, 0, 0.08));
          border: 1px solid rgba(255, 149, 0, 0.3);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .reward-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .reward-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .reward-icon { font-size: 1.75rem; }
        .reward-title {
          font-family: 'Orbitron', monospace;
          font-weight: 700;
          color: #ff9500;
        }
        .reward-subtitle {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
        }
        .reward-amount {
          font-family: 'Orbitron', monospace;
          font-size: 2rem;
          font-weight: 700;
          color: #00ff88;
          text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
        }
        .reward-progress { margin-top: 0.5rem; }
        .reward-hint {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          text-align: center;
          margin-top: 0.5rem;
        }

        /* Lucky Quest */
        .lucky-quest-card {
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.08), rgba(0, 200, 100, 0.05));
          border: 2px solid rgba(0, 255, 136, 0.4);
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .lucky-quest-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(0, 255, 136, 0.2);
        }
        .lucky-quest-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .lucky-icon { font-size: 1.75rem; }
        .lucky-label {
          font-family: 'Orbitron', monospace;
          font-size: 0.7rem;
          color: #00ff88;
          letter-spacing: 0.05em;
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
          font-size: 0.75rem;
          color: #00ff88;
        }

        /* HUD */
        .hud {
          display: flex;
          justify-content: space-around;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        .hud-stat {
          text-align: center;
          cursor: pointer;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .hud-stat:hover {
          background: rgba(255,255,255,0.05);
        }
        .hud-value {
          font-family: 'Orbitron', monospace;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .hud-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 0.25rem;
        }

        /* Filters */
        .filters {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .filter-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .filter-btn.active {
          background: rgba(0, 212, 255, 0.15);
          border-color: rgba(0, 212, 255, 0.4);
          color: #00d4ff;
        }

        /* Quest Grid */
        .quest-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .quest-card-wrapper {
          opacity: 0;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255,255,255,0.4);
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        /* Toast */
        .toast {
          position: fixed;
          top: 100px;
          right: 20px;
          background: rgba(10, 10, 15, 0.95);
          border: 1px solid #00ff88;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }
        .toast span {
          color: #00ff88;
        }
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }
        .modal {
          background: #12121a;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          animation: modalIn 0.3s ease;
        }
        .modal-small {
          max-width: 420px;
        }
        @keyframes modalIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .modal-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 1.5rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .modal-close:hover {
          color: #fff;
        }
        .modal-body {
          padding: 1.5rem;
        }
        .modal-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .meta-category {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .meta-xp {
          font-family: 'Orbitron', monospace;
          color: #ff9500;
          font-weight: 700;
        }
        .modal-description {
          color: rgba(255,255,255,0.7);
          line-height: 1.7;
          margin-bottom: 1.5rem;
        }
        .modal-section {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
        }
        .modal-section h3 {
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          color: #00d4ff;
        }
        .modal-section p {
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
        }
        .modal-section.warning {
          background: rgba(255, 149, 0, 0.1);
          border: 1px solid rgba(255, 149, 0, 0.3);
        }
        .modal-section.warning h3 {
          color: #ff9500;
        }
        .modal-section.success {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
        }
        .modal-section.success h3 {
          color: #00ff88;
        }
        .steps-list {
          padding-left: 1.25rem;
          color: rgba(255,255,255,0.7);
        }
        .steps-list li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .evidence-hints {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 1rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.6);
          margin-bottom: 0.5rem;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 0.75rem;
          color: #fff;
          font-size: 0.95rem;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #00d4ff;
        }
        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }
        .link-input-row {
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
        .btn-add-link {
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
          gap: 1rem;
        }
        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          border: none;
          color: #fff;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4);
        }
        .btn-success {
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          border: none;
          color: #0a0a0f;
        }
        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0, 255, 136, 0.4);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .pending-notice {
          color: #a855f7;
          font-weight: 500;
        }

        /* Streak Modal */
        .streak-tiers {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .streak-tier {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .streak-tier.active {
          background: rgba(255, 149, 0, 0.1);
          border-color: rgba(255, 149, 0, 0.3);
        }
        .streak-tier-fires { font-size: 1.25rem; }
        .streak-tier-label { color: rgba(255,255,255,0.8); }
        .streak-tier-bonus {
          font-family: 'Orbitron', monospace;
          color: #ff9500;
        }
        .current-streak-display {
          text-align: center;
          padding: 1.5rem;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          margin-top: 1.5rem;
        }
        .current-streak-label {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
        }
        .current-streak-value {
          font-family: 'Orbitron', monospace;
          font-size: 2.5rem;
          font-weight: 700;
          color: #ff9500;
        }
        .current-streak-bonus {
          color: #00ff88;
          margin-top: 0.5rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-content {
            flex-direction: column;
            text-align: center;
          }
          .stats-row {
            justify-content: center;
          }
          .level-display {
            font-size: 2rem;
          }
          .quest-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
