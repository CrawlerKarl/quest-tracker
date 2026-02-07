import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';

// Calculate level from XP
function calculateLevel(totalXp: number): number {
  // Levels require progressively more XP
  // Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, etc.
  if (totalXp < 100) return 1;
  if (totalXp < 250) return 2;
  if (totalXp < 500) return 3;
  if (totalXp < 850) return 4;
  if (totalXp < 1300) return 5;
  if (totalXp < 1850) return 6;
  if (totalXp < 2500) return 7;
  if (totalXp < 3250) return 8;
  if (totalXp < 4100) return 9;
  if (totalXp < 5050) return 10;
  if (totalXp < 6100) return 11;
  if (totalXp < 7250) return 12;
  if (totalXp < 8500) return 13;
  if (totalXp < 9850) return 14;
  if (totalXp < 11300) return 15;
  // Beyond level 15
  return Math.floor(15 + (totalXp - 11300) / 2000);
}

// POST approve or reject submission (mentor only)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role = getCurrentRole();
  
  if (role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Get the submission and quest - check by progress ID
    const progressResult = await sql`
      SELECT qp.*, q.xp_reward, q.title as quest_title, q.id as quest_id,
             q.is_lucky_quest, q.lucky_multiplier
      FROM quest_progress qp
      JOIN quests q ON qp.quest_id = q.id
      WHERE qp.id = ${progressId} AND qp.status = 'submitted'
    `;

    if (progressResult.rows.length === 0) {
      // Debug: let's check if submission exists at all
      const debugResult = await sql`
        SELECT id, quest_id, status FROM quest_progress WHERE id = ${progressId}
      `;
      console.log('Debug - Looking for progress ID:', progressId);
      console.log('Debug - Found:', debugResult.rows);
      
      return NextResponse.json({ 
        error: 'Submission not found or already reviewed',
        debug: { searchedId: progressId, found: debugResult.rows }
      }, { status: 404 });
    }

    const submission = progressResult.rows[0];

    if (action === 'approve') {
      // Calculate XP with bonuses
      let xpReward = submission.xp_reward;
      
      // Lucky quest bonus (1.5x)
      if (submission.is_lucky_quest && submission.lucky_multiplier) {
        xpReward = Math.round(xpReward * submission.lucky_multiplier);
      }

      // Update progress to completed
      await sql`
        UPDATE quest_progress 
        SET status = 'completed',
            mentor_feedback = ${feedback},
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${progressId}
      `;

      // Get current stats
      const statsResult = await sql`SELECT * FROM mentee_stats WHERE id = 1`;
      const currentStats = statsResult.rows[0] || { total_xp: 0, quests_completed: 0, current_streak: 0, longest_streak: 0 };
      
      const newXp = (currentStats.total_xp || 0) + xpReward;
      const newLevel = calculateLevel(newXp);
      const newQuestsCompleted = (currentStats.quests_completed || 0) + 1;

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const lastActivityDate = currentStats.last_activity_at 
        ? new Date(currentStats.last_activity_at).toISOString().split('T')[0]
        : null;
      
      let newStreak = currentStats.current_streak || 0;
      
      if (lastActivityDate === today) {
        // Already did something today, streak unchanged
      } else if (lastActivityDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastActivityDate === yesterdayStr) {
          // Continued streak
          newStreak += 1;
        } else {
          // Streak broken, start fresh
          newStreak = 1;
        }
      } else {
        // First activity
        newStreak = 1;
      }

      const newLongestStreak = Math.max(newStreak, currentStats.longest_streak || 0);

      await sql`
        UPDATE mentee_stats 
        SET total_xp = ${newXp},
            level = ${newLevel},
            quests_completed = ${newQuestsCompleted},
            current_streak = ${newStreak},
            longest_streak = ${newLongestStreak},
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
        newLevel: newLevel,
        newStreak: newStreak
      });
    }

    if (action === 'reject') {
      // Update progress back to in_progress
      await sql`
        UPDATE quest_progress 
        SET status = 'in_progress',
            mentor_feedback = ${feedback},
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
      let requirement;
      try {
        requirement = typeof badge.requirement === 'string' 
          ? JSON.parse(badge.requirement) 
          : badge.requirement;
      } catch {
        continue;
      }
      
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
