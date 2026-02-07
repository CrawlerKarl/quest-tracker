import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';
import { xpForNextLevel, getRankFromXp, calculateRewardValue, getStreakBonus } from '@/lib/db';

// Tier thresholds
const TIER_THRESHOLDS: Record<string, number> = {
  rookie: 0,
  apprentice: 500,
  pro: 1500,
  elite: 3500,
  legend: 7000,
};

const TIER_ORDER = ['rookie', 'apprentice', 'pro', 'elite', 'legend'];

// GET mentee stats
export async function GET() {
  const role = getCurrentRole();
  
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get mentee stats
    const statsResult = await sql`SELECT * FROM mentee_stats WHERE id = 1`;
    const stats = statsResult.rows[0] || { 
      total_xp: 0, 
      level: 1, 
      quests_completed: 0,
      current_streak: 0,
      longest_streak: 0,
      streak_freeze_available: true,
      quests_toward_reward: 0,
      rewards_claimed: 0
    };

    // Check and update streak
    const today = new Date().toISOString().split('T')[0];
    const lastStreakDate = stats.last_streak_date ? new Date(stats.last_streak_date).toISOString().split('T')[0] : null;
    
    let currentStreak = stats.current_streak || 0;
    let streakStatus = 'active';
    
    if (lastStreakDate) {
      const lastDate = new Date(lastStreakDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        streakStatus = 'active';
      } else if (diffDays === 1) {
        streakStatus = 'at_risk';
      } else if (diffDays === 2 && stats.streak_freeze_available) {
        streakStatus = 'frozen';
      } else if (diffDays > 1) {
        currentStreak = 0;
        streakStatus = 'lost';
        await sql`UPDATE mentee_stats SET current_streak = 0 WHERE id = 1`;
      }
    }

    // Calculate current tier and check for new unlocks
    const currentXp = stats.total_xp || 0;
    let currentTier = 'rookie';
    const unlockedTiers: string[] = [];
    
    for (const tier of TIER_ORDER) {
      if (currentXp >= TIER_THRESHOLDS[tier]) {
        currentTier = tier;
        unlockedTiers.push(tier);
      }
    }

    // Find next tier
    const currentTierIndex = TIER_ORDER.indexOf(currentTier);
    const nextTier = TIER_ORDER[currentTierIndex + 1] || null;
    const nextTierXp = nextTier ? TIER_THRESHOLDS[nextTier] : null;
    const xpToNextTier = nextTierXp ? nextTierXp - currentXp : 0;

    // Count quests per tier
    const tierQuestCounts = await sql`
      SELECT tier, COUNT(*) as total,
        COUNT(*) FILTER (WHERE id IN (SELECT quest_id FROM quest_progress WHERE status = 'completed')) as completed
      FROM quests 
      WHERE is_active = true
      GROUP BY tier
    `;

    const questsByTier: Record<string, { total: number; completed: number }> = {};
    for (const row of tierQuestCounts.rows) {
      questsByTier[row.tier] = {
        total: parseInt(row.total),
        completed: parseInt(row.completed)
      };
    }

    // Get quest counts by status (only for unlocked quests)
    const questCountsResult = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE qp.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE qp.status = 'submitted') as pending_review,
        COUNT(*) FILTER (WHERE qp.status = 'completed') as completed
      FROM quest_progress qp
      JOIN quests q ON qp.quest_id = q.id
      WHERE q.unlock_at_xp <= ${currentXp}
    `;
    const questCounts = questCountsResult.rows[0];

    // Count available (unlocked and not started)
    const availableResult = await sql`
      SELECT COUNT(*) as count 
      FROM quests q
      WHERE q.is_active = true 
        AND q.unlock_at_xp <= ${currentXp}
        AND NOT EXISTS (SELECT 1 FROM quest_progress qp WHERE qp.quest_id = q.id)
    `;

    // Get achievements
    let earnedAchievements: any[] = [];
    let allAchievements: any[] = [];
    try {
      const achievementsResult = await sql`
        SELECT a.*, ea.earned_at 
        FROM achievements a
        LEFT JOIN earned_achievements ea ON a.id = ea.achievement_id
        ORDER BY a.is_secret ASC, ea.earned_at DESC NULLS LAST
      `;
      allAchievements = achievementsResult.rows;
      earnedAchievements = achievementsResult.rows.filter(a => a.earned_at !== null);
    } catch (e) {}

    // Get bonus info
    let bonusInfo: any = {
      luckyQuest: null,
      totalMultiplier: 1.0,
      bonusXp: 0,
      isWeekend: false,
      firstQuestBonusAvailable: true,
      streakBonus: getStreakBonus(currentStreak)
    };

    try {
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const isWeekend = ['saturday', 'sunday'].includes(dayOfWeek);
      
      const luckyResult = await sql`
        SELECT id, title, xp_reward, lucky_multiplier, category, difficulty, tier
        FROM quests WHERE is_lucky_quest = true AND is_active = true LIMIT 1
      `;
      
      const firstQuestAvailable = stats.last_first_quest_date !== today;

      bonusInfo = {
        luckyQuest: luckyResult.rows[0] || null,
        totalMultiplier: isWeekend ? 2.0 : 1.0,
        bonusXp: firstQuestAvailable ? 25 : 0,
        isWeekend,
        firstQuestBonusAvailable: firstQuestAvailable,
        streakBonus: getStreakBonus(currentStreak)
      };
    } catch (e) {}

    // Get suggested quest (from current tier, not started)
    let suggestedQuest = null;
    try {
      // Prioritize lucky quest if in unlocked tier
      if (bonusInfo.luckyQuest && TIER_THRESHOLDS[bonusInfo.luckyQuest.tier] <= currentXp) {
        const luckyProgressResult = await sql`
          SELECT id FROM quest_progress WHERE quest_id = ${bonusInfo.luckyQuest.id}
        `;
        if (luckyProgressResult.rows.length === 0) {
          suggestedQuest = { ...bonusInfo.luckyQuest, isLucky: true };
        }
      }
      
      if (!suggestedQuest) {
        const suggestedResult = await sql`
          SELECT q.id, q.title, q.xp_reward, q.difficulty, q.category, q.tier
          FROM quests q
          WHERE q.is_active = true 
            AND q.unlock_at_xp <= ${currentXp}
            AND NOT EXISTS (SELECT 1 FROM quest_progress qp WHERE qp.quest_id = q.id)
          ORDER BY q.sort_order ASC
          LIMIT 1
        `;
        if (suggestedResult.rows.length > 0) {
          suggestedQuest = suggestedResult.rows[0];
        }
      }
    } catch (e) {}

    // Calculate XP and rank progress
    const xpProgress = xpForNextLevel(currentXp);
    const rankInfo = getRankFromXp(currentXp);
    const rewardInfo = calculateRewardValue(currentXp, stats.rewards_claimed || 0);

    // Get earned badges
    const badgesResult = await sql`
      SELECT b.* FROM badges b
      JOIN earned_badges eb ON b.id = eb.badge_id
      ORDER BY eb.earned_at DESC
    `;

    return NextResponse.json({
      stats: {
        totalXp: currentXp,
        level: stats.level,
        questsCompleted: stats.quests_completed,
        currentStreak: currentStreak,
        longestStreak: stats.longest_streak,
        lastActivityAt: stats.last_activity_at,
        streakFreezeAvailable: stats.streak_freeze_available,
      },
      streakStatus,
      streakBonus: getStreakBonus(currentStreak),
      xpProgress,
      rankInfo,
      rewardInfo,
      questCounts: {
        inProgress: parseInt(questCounts.in_progress) || 0,
        pendingReview: parseInt(questCounts.pending_review) || 0,
        completed: parseInt(questCounts.completed) || 0,
        available: parseInt(availableResult.rows[0].count) || 0,
      },
      tierInfo: {
        currentTier,
        unlockedTiers,
        nextTier,
        nextTierXp,
        xpToNextTier,
        questsByTier,
      },
      bonusInfo,
      suggestedQuest,
      earnedBadges: badgesResult.rows,
      earnedAchievements,
      allAchievements: allAchievements.filter(a => !a.is_secret || a.earned_at),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
