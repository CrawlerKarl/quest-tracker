import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';

// GET timeline/progress data
export async function GET() {
  const role = getCurrentRole();
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get weekly quest completion stats
    const weeklyStats = await sql`
      SELECT 
        DATE_TRUNC('week', completed_at) as week_start,
        COUNT(*) as quests_completed,
        SUM(q.xp_reward) as xp_earned
      FROM quest_progress qp
      JOIN quests q ON qp.quest_id = q.id
      WHERE qp.status = 'completed' AND qp.completed_at IS NOT NULL
      GROUP BY DATE_TRUNC('week', completed_at)
      ORDER BY week_start ASC
    `;

    // Get total stats
    const totalStats = await sql`
      SELECT 
        COUNT(*) as total_completed,
        COALESCE(SUM(q.xp_reward), 0) as total_xp,
        MIN(qp.completed_at) as first_quest_date,
        MAX(qp.completed_at) as last_quest_date
      FROM quest_progress qp
      JOIN quests q ON qp.quest_id = q.id
      WHERE qp.status = 'completed'
    `;

    // Get total available quests
    const totalQuestsResult = await sql`
      SELECT COUNT(*) as count FROM quests WHERE is_active = true
    `;

    // Get milestones achieved
    const milestonesResult = await sql`
      SELECT 
        action,
        details,
        created_at
      FROM activity_log
      WHERE action IN ('badge_earned', 'achievement_unlocked', 'level_up')
      ORDER BY created_at ASC
    `;

    // Get recent activity (last 10)
    const recentActivity = await sql`
      SELECT 
        al.action,
        al.details,
        al.created_at,
        q.title as quest_title
      FROM activity_log al
      LEFT JOIN quests q ON al.quest_id = q.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `;

    const stats = totalStats.rows[0];
    const totalQuests = parseInt(totalQuestsResult.rows[0].count);
    const completedCount = parseInt(stats.total_completed) || 0;
    const progressPercentage = totalQuests > 0 ? Math.round((completedCount / totalQuests) * 100) : 0;

    // Calculate journey duration
    let journeyDays = 0;
    if (stats.first_quest_date) {
      const firstDate = new Date(stats.first_quest_date);
      const lastDate = stats.last_quest_date ? new Date(stats.last_quest_date) : new Date();
      journeyDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    return NextResponse.json({
      weeklyStats: weeklyStats.rows.map(row => ({
        weekStart: row.week_start,
        questsCompleted: parseInt(row.quests_completed),
        xpEarned: parseInt(row.xp_earned)
      })),
      totalStats: {
        questsCompleted: completedCount,
        totalXp: parseInt(stats.total_xp) || 0,
        totalQuests,
        progressPercentage,
        journeyDays,
        firstQuestDate: stats.first_quest_date,
        lastQuestDate: stats.last_quest_date
      },
      milestones: milestonesResult.rows,
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}
