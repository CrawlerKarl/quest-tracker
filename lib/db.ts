import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });

// Rank thresholds - progressively harder to rank up
// ROOKIE: 0-499 XP
// APPRENTICE: 500-1499 XP (need 500)
// PRO: 1500-3499 XP (need 1000)
// ELITE: 3500-6999 XP (need 2000)
// LEGEND: 7000+ XP (need 3500)

export const RANK_THRESHOLDS = [
  { rank: 'ROOKIE', minXp: 0, icon: '🌱', color: '#9898a8' },
  { rank: 'APPRENTICE', minXp: 500, icon: '⚡', color: '#00d4ff' },
  { rank: 'PRO', minXp: 1500, icon: '🔥', color: '#ff9500' },
  { rank: 'ELITE', minXp: 3500, icon: '💎', color: '#ff0080' },
  { rank: 'LEGEND', minXp: 7000, icon: '👑', color: '#ffd700' },
];

// Helper to get rank from XP
export function getRankFromXp(xp: number): { rank: string; icon: string; color: string; minXp: number; nextRank: typeof RANK_THRESHOLDS[0] | null; xpToNext: number } {
  let currentRank = RANK_THRESHOLDS[0];
  let nextRank: typeof RANK_THRESHOLDS[0] | null = RANK_THRESHOLDS[1];
  
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i].minXp) {
      currentRank = RANK_THRESHOLDS[i];
      nextRank = RANK_THRESHOLDS[i + 1] || null;
      break;
    }
  }
  
  const xpToNext = nextRank ? nextRank.minXp - xp : 0;
  
  return {
    ...currentRank,
    nextRank,
    xpToNext
  };
}

// Helper to calculate level from XP (now based on rank progress)
export function calculateLevel(xp: number): number {
  // Level is now tied to rank progression
  // Each rank has sub-levels within it
  const rank = getRankFromXp(xp);
  const rankIndex = RANK_THRESHOLDS.findIndex(r => r.rank === rank.rank);
  
  // Base level from rank (ROOKIE=1-5, APPRENTICE=6-10, PRO=11-15, ELITE=16-20, LEGEND=21+)
  const baseLevel = rankIndex * 5 + 1;
  
  // Calculate sub-level within rank
  const currentRankMinXp = RANK_THRESHOLDS[rankIndex].minXp;
  const nextRankMinXp = RANK_THRESHOLDS[rankIndex + 1]?.minXp || (currentRankMinXp + 5000);
  const xpInRank = xp - currentRankMinXp;
  const xpPerLevel = (nextRankMinXp - currentRankMinXp) / 5;
  const subLevel = Math.min(4, Math.floor(xpInRank / xpPerLevel));
  
  return baseLevel + subLevel;
}

// Helper to calculate XP needed for next level
export function xpForNextLevel(currentXp: number): { current: number; needed: number; progress: number } {
  const rank = getRankFromXp(currentXp);
  const rankIndex = RANK_THRESHOLDS.findIndex(r => r.rank === rank.rank);
  
  const currentRankMinXp = RANK_THRESHOLDS[rankIndex].minXp;
  const nextRankMinXp = RANK_THRESHOLDS[rankIndex + 1]?.minXp || (currentRankMinXp + 5000);
  const xpPerLevel = (nextRankMinXp - currentRankMinXp) / 5;
  
  const xpInRank = currentXp - currentRankMinXp;
  const currentLevelStart = Math.floor(xpInRank / xpPerLevel) * xpPerLevel;
  const currentLevelXp = xpInRank - currentLevelStart;
  
  const progress = Math.round((currentLevelXp / xpPerLevel) * 100);
  
  return { 
    current: Math.round(currentLevelXp), 
    needed: Math.round(xpPerLevel), 
    progress: Math.min(100, progress) 
  };
}

// Calculate streak bonus XP
export function getStreakBonus(streakDays: number): number {
  if (streakDays >= 3) return 200;
  if (streakDays >= 2) return 100;
  return 0;
}

// Calculate reward value from total XP ($1 per 100 XP)
export function calculateRewardValue(totalXp: number, claimedAmount: number = 0): { 
  earned: number; 
  available: number; 
  claimed: number;
  progress: number;
  nextDollar: number;
} {
  const totalEarned = Math.floor(totalXp / 100);
  const available = totalEarned - claimedAmount;
  const xpTowardNext = totalXp % 100;
  
  return {
    earned: totalEarned,
    available,
    claimed: claimedAmount,
    progress: xpTowardNext,
    nextDollar: 100 - xpTowardNext
  };
}
