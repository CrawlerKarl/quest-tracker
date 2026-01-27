import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });

// Helper to calculate level from XP
export function calculateLevel(xp: number): number {
  // Level up every 500 XP
  return Math.floor(xp / 500) + 1;
}

// Helper to calculate XP needed for next level
export function xpForNextLevel(currentXp: number): { current: number; needed: number; progress: number } {
  const level = calculateLevel(currentXp);
  const xpForCurrentLevel = (level - 1) * 500;
  const xpForNext = level * 500;
  const current = currentXp - xpForCurrentLevel;
  const needed = 500;
  const progress = Math.round((current / needed) * 100);
  return { current, needed, progress };
}
