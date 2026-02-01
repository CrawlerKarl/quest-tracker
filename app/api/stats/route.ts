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
    const stats = statsResult.rows[0] || { total_xp: 0, level: 1, quests_completed: 0 };

    // Get quest counts by status
    const questCountsResult = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE qp.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE qp.status = 'submitted') as pending_review,
        COUNT(*) FILTER (WHERE qp.status = 'completed') as completed
      FROM quest_progress qp
    `;
    const questCounts = questCountsResult.rows[0];

    // Get completed quest IDs for unlock checking
    const completedResult = await sql`
      SELECT quest_id FROM quest_progress WHERE status = 'completed'
    `;
    const completedQuestIds = completedResult.rows.map(r => r.quest_id);

    // Get all quests to calculate available (unlocked) count
    const allQuestsResult = await sql`
      SELECT id, is_locked, unlocks_after FROM quests WHERE is_active = true
    `;
    
    // Count only unlocked quests (same logic as the quests API)
    let unlockedCount = 0;
    for (const quest of allQuestsResult.rows) {
      // If not locked, count it
      if (!quest.is_locked) {
        unlockedCount++;
        continue;
      }
      
      // If locked, check if prerequisites are met
      const unlocksAfter = JSON.parse(quest.unlocks_after || '[]');
      if (unlocksAfter.length > 0) {
        const allPrereqsCompleted = unlocksAfter.every((reqId: number) => 
          completedQuestIds.includes(reqId)
        );
        if (allPrereqsCompleted) {
          unlockedCount++;
        }
      }
    }

    // Get earned badges
    const badgesResult = await sql`
      SELECT b.* FROM badges b
      JOIN earned_badges eb ON b.id = eb.badge_id
      ORDER BY eb.earned_at DESC
    `;

    // Calculate XP progress
    const xpProgress = xpForNextLevel(stats.total_xp);

    // Calculate available = unlocked - in_progress - pending - completed
    const inProgressCount = parseInt(questCounts.in_progress) || 0;
    const pendingCount = parseInt(questCounts.pending_review) || 0;
    const completedCount = parseInt(questCounts.completed) || 0;
    const availableCount = unlockedCount - inProgressCount - pendingCount - completedCount;

    return NextResponse.json({
      stats: {
        totalXp: stats.total_xp,
        level: stats.level,
        questsCompleted: stats.quests_completed,
        currentStreak: stats.current_streak,
        longestStreak: stats.longest_streak,
        lastActivityAt: stats.last_activity_at,
      },
      xpProgress,
      questCounts: {
        inProgress: inProgressCount,
        pendingReview: pendingCount,
        completed: completedCount,
        total: unlockedCount,
        available: Math.max(0, availableCount),
      },
      earnedBadges: badgesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
