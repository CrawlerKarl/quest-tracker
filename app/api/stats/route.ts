import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';
import { xpForNextLevel } from '@/lib/db';

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

    // Get quest counts
    const questCountsResult = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE qp.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE qp.status = 'submitted') as pending_review,
        COUNT(*) FILTER (WHERE qp.status = 'completed') as completed
      FROM quest_progress qp
    `;
    const questCounts = questCountsResult.rows[0];

    // Get completed quest IDs
    const completedResult = await sql`
      SELECT quest_id FROM quest_progress WHERE status = 'completed'
    `;
    const completedQuestIds = completedResult.rows.map(r => r.quest_id);

    // Get all quests to calculate unlocked count
    const allQuestsResult = await sql`
      SELECT id, is_locked, unlocks_after FROM quests WHERE is_active = true
    `;
    
    let unlockedCount = 0;
    for (const quest of allQuestsResult.rows) {
      if (!quest.is_locked) {
        unlockedCount++;
        continue;
      }
      const unlocksAfter = JSON.parse(quest.unlocks_after || '[]');
      if (unlocksAfter.length > 0) {
        const allPrereqsCompleted = unlocksAfter.every((reqId: number) => 
          completedQuestIds.includes(reqId)
        );
        if (allPrereqsCompleted) unlockedCount++;
      }
    }

    // Get earned badges
    const badgesResult = await sql`
      SELECT b.* FROM badges b
      JOIN earned_badges eb ON b.id = eb.badge_id
      ORDER BY eb.earned_at DESC
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
    } catch (e) {
      console.log('Achievements not available');
    }

    // Get bonus events info
    let bonusInfo = {
      activeEvents: [],
      luckyQuest: null,
      totalMultiplier: 1.0,
      bonusXp: 0,
      isWeekend: false,
      firstQuestBonusAvailable: true
    };

    try {
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const isWeekend = ['saturday', 'sunday'].includes(dayOfWeek);
      
      // Get lucky quest
      const luckyResult = await sql`
        SELECT id, title, xp_reward, lucky_multiplier, category, difficulty
        FROM quests WHERE is_lucky_quest = true AND is_active = true LIMIT 1
      `;
      
      // Check first quest bonus
      const firstQuestAvailable = stats.last_first_quest_date !== today;

      bonusInfo = {
        activeEvents: [],
        luckyQuest: luckyResult.rows[0] || null,
        totalMultiplier: isWeekend ? 2.0 : 1.0,
        bonusXp: firstQuestAvailable ? 25 : 0,
        isWeekend,
        firstQuestBonusAvailable: firstQuestAvailable
      };
    } catch (e) {
      console.log('Bonus info not available');
    }

    // Calculate XP progress
    const xpProgress = xpForNextLevel(stats.total_xp);

    // Calculate available quests
    const inProgressCount = parseInt(questCounts.in_progress) || 0;
    const pendingCount = parseInt(questCounts.pending_review) || 0;
    const completedCount = parseInt(questCounts.completed) || 0;
    const availableCount = unlockedCount - inProgressCount - pendingCount - completedCount;

    // Reward progress
    const questsTowardReward = stats.quests_toward_reward || completedCount;
    const rewardProgress = {
      current: questsTowardReward % 10,
      target: 10,
      rewardName: '$30 Steam Credit',
      rewardIcon: '🎮',
      rewardsClaimed: stats.rewards_claimed || 0,
      progress: ((questsTowardReward % 10) / 10) * 100
    };

    // Get suggested quest (prioritize lucky quest if available)
    let suggestedQuest = null;
    try {
      // First try lucky quest
      if (bonusInfo.luckyQuest) {
        const luckyProgressResult = await sql`
          SELECT id FROM quest_progress WHERE quest_id = ${bonusInfo.luckyQuest.id}
        `;
        if (luckyProgressResult.rows.length === 0) {
          suggestedQuest = {
            ...bonusInfo.luckyQuest,
            isLucky: true
          };
        }
      }
      
      // Fall back to regular suggestion
      if (!suggestedQuest) {
        const suggestedResult = await sql`
          SELECT q.id, q.title, q.xp_reward, q.difficulty, q.category
          FROM quests q
          LEFT JOIN quest_progress qp ON q.id = qp.quest_id
          WHERE q.is_active = true AND q.is_locked = false
            AND (qp.id IS NULL OR qp.status IS NULL)
          ORDER BY q.sort_order ASC
          LIMIT 1
        `;
        if (suggestedResult.rows.length > 0) {
          suggestedQuest = suggestedResult.rows[0];
        }
      }
    } catch (e) {
      console.log('Could not get suggested quest');
    }

    return NextResponse.json({
      stats: {
        totalXp: stats.total_xp,
        level: stats.level,
        questsCompleted: stats.quests_completed,
        currentStreak: currentStreak,
        longestStreak: stats.longest_streak,
        lastActivityAt: stats.last_activity_at,
        streakFreezeAvailable: stats.streak_freeze_available,
      },
      streakStatus,
      xpProgress,
      questCounts: {
        inProgress: inProgressCount,
        pendingReview: pendingCount,
        completed: completedCount,
        total: unlockedCount,
        available: Math.max(0, availableCount),
      },
      rewardProgress,
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
