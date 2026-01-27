import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole, checkRateLimit } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';
import { calculateLevel } from '@/lib/db';

// POST approve or reject submission (mentor only)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role = getCurrentRole();
  
  if (role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Rate limit approvals
  if (!checkRateLimit('mentor-review', 60, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const progressId = parseInt(params.id);
  if (isNaN(progressId)) {
    return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const action = body.action; // 'approve' or 'reject'
    const feedback = sanitizeText(body.feedback || '', 1000);

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the submission and quest
    const progressResult = await sql`
      SELECT qp.*, q.xp_reward, q.title as quest_title
      FROM quest_progress qp
      JOIN quests q ON qp.quest_id = q.id
      WHERE qp.id = ${progressId} AND qp.status = 'submitted'
    `;

    if (progressResult.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found or already reviewed' }, { status: 404 });
    }

    const submission = progressResult.rows[0];

    if (action === 'approve') {
      // Update progress to completed
      await sql`
        UPDATE quest_progress 
        SET status = 'completed',
            mentor_feedback = ${feedback},
            reviewed_at = NOW(),
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${progressId}
      `;

      // Update mentee stats
      const xpReward = submission.xp_reward;
      
      // Get current stats
      const statsResult = await sql`SELECT * FROM mentee_stats WHERE id = 1`;
      const currentStats = statsResult.rows[0];
      const newXp = currentStats.total_xp + xpReward;
      const newLevel = calculateLevel(newXp);
      const newQuestsCompleted = currentStats.quests_completed + 1;

      await sql`
        UPDATE mentee_stats 
        SET total_xp = ${newXp},
            level = ${newLevel},
            quests_completed = ${newQuestsCompleted},
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = 1
      `;

      // Check for badge unlocks
      await checkAndAwardBadges(newXp, newLevel, newQuestsCompleted);

      // Log activity
      await sql`
        INSERT INTO activity_log (action, quest_id, details)
        VALUES ('quest_approved', ${submission.quest_id}, ${JSON.stringify({ xpAwarded: xpReward })})
      `;

      return NextResponse.json({ 
        success: true, 
        status: 'completed',
        xpAwarded: xpReward,
        newTotalXp: newXp,
        newLevel: newLevel
      });
    }

    if (action === 'reject') {
      // Update progress back to in_progress
      await sql`
        UPDATE quest_progress 
        SET status = 'in_progress',
            mentor_feedback = ${feedback},
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${progressId}
      `;

      // Log activity
      await sql`
        INSERT INTO activity_log (action, quest_id, details)
        VALUES ('quest_rejected', ${submission.quest_id}, ${JSON.stringify({ feedback })})
      `;

      return NextResponse.json({ success: true, status: 'rejected' });
    }

  } catch (error) {
    console.error('Error reviewing submission:', error);
    return NextResponse.json({ error: 'Failed to process review' }, { status: 500 });
  }
}

// Helper to check and award badges
async function checkAndAwardBadges(totalXp: number, level: number, questsCompleted: number) {
  try {
    // Get all badges not yet earned
    const badgesResult = await sql`
      SELECT b.* FROM badges b
      WHERE NOT EXISTS (
        SELECT 1 FROM earned_badges eb WHERE eb.badge_id = b.id
      )
    `;

    for (const badge of badgesResult.rows) {
      const requirement = JSON.parse(badge.requirement);
      let earned = false;

      switch (requirement.type) {
        case 'total_complete':
          earned = questsCompleted >= requirement.count;
          break;
        case 'level_reached':
          earned = level >= requirement.level;
          break;
        case 'category_complete':
          const categoryCountResult = await sql`
            SELECT COUNT(*) as count FROM quest_progress qp
            JOIN quests q ON qp.quest_id = q.id
            WHERE qp.status = 'completed' AND q.category = ${requirement.category}
          `;
          earned = parseInt(categoryCountResult.rows[0].count) >= requirement.count;
          break;
        case 'difficulty_complete':
          const diffCountResult = await sql`
            SELECT COUNT(*) as count FROM quest_progress qp
            JOIN quests q ON qp.quest_id = q.id
            WHERE qp.status = 'completed' AND q.difficulty = ${requirement.difficulty}
          `;
          earned = parseInt(diffCountResult.rows[0].count) >= requirement.count;
          break;
        case 'percentage_complete':
          const totalQuestsResult = await sql`SELECT COUNT(*) as count FROM quests WHERE is_active = true`;
          const totalQuests = parseInt(totalQuestsResult.rows[0].count);
          const percentage = (questsCompleted / totalQuests) * 100;
          earned = percentage >= requirement.percentage;
          break;
      }

      if (earned) {
        await sql`INSERT INTO earned_badges (badge_id) VALUES (${badge.id})`;
        await sql`
          INSERT INTO activity_log (action, details)
          VALUES ('badge_earned', ${JSON.stringify({ badgeName: badge.name, badgeIcon: badge.icon })})
        `;
      }
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  }
}
