import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole, checkRateLimit } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';
import { calculateLevel } from '@/lib/db';

// Streak bonus calculation
function getStreakBonus(streakDays: number): number {
  if (streakDays >= 3) return 200;
  if (streakDays >= 2) return 100;
  return 0;
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

  if (!checkRateLimit('mentor-review', 60, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const progressId = parseInt(params.id);
  if (isNaN(progressId)) {
    return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const action = body.action;
    const feedback = sanitizeText(body.feedback || '', 1000);

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const progressResult = await sql`
      SELECT qp.*, q.xp_reward, q.title as quest_title, q.category, q.is_lucky_quest, q.lucky_multiplier
      FROM quest_progress qp
      JOIN quests q ON qp.quest_id = q.id
      WHERE qp.id = ${progressId} AND qp.status = 'submitted'
    `;

    if (progressResult.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = progressResult.rows[0];

    if (action === 'approve') {
      await sql`
        UPDATE quest_progress 
        SET status = 'completed',
            mentor_feedback = ${feedback},
            reviewed_at = NOW(),
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${progressId}
      `;

      // Get current stats
      const statsResult = await sql`SELECT * FROM mentee_stats WHERE id = 1`;
      const currentStats = statsResult.rows[0];
      
      // Calculate streak first (needed for bonus)
      const today = new Date().toISOString().split('T')[0];
      const lastStreakDate = currentStats.last_streak_date 
        ? new Date(currentStats.last_streak_date).toISOString().split('T')[0] 
        : null;
      
      let newStreak = currentStats.current_streak || 0;
      let usedFreeze = false;
      
      if (!lastStreakDate || lastStreakDate !== today) {
        if (lastStreakDate) {
          const lastDate = new Date(lastStreakDate);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays === 2 && currentStats.streak_freeze_available) {
            newStreak += 1;
            usedFreeze = true;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
      }

      // Calculate XP with all bonuses
      let baseXp = submission.xp_reward;
      let bonusBreakdown: any[] = [];
      
      // Lucky quest bonus (1.5x)
      if (submission.is_lucky_quest && submission.lucky_multiplier > 1) {
        const luckyBonus = Math.round(baseXp * (submission.lucky_multiplier - 1));
        bonusBreakdown.push({ type: 'lucky', label: '🍀 Lucky Quest', amount: luckyBonus });
        baseXp = Math.round(baseXp * submission.lucky_multiplier);
      }
      
      // Weekend bonus (2x)
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const isWeekend = ['saturday', 'sunday'].includes(dayOfWeek);
      if (isWeekend) {
        const weekendBonus = baseXp;
        bonusBreakdown.push({ type: 'weekend', label: '🎉 Weekend Warrior 2x', amount: weekendBonus });
        baseXp *= 2;
      }
      
      // Streak bonus (+100 for 2-day, +200 for 3+ day)
      const streakBonus = getStreakBonus(newStreak);
      if (streakBonus > 0) {
        bonusBreakdown.push({ type: 'streak', label: `🔥 ${newStreak}-Day Streak`, amount: streakBonus });
        baseXp += streakBonus;
      }
      
      // First quest of day bonus
      const isFirstQuestToday = currentStats.last_first_quest_date !== today;
      if (isFirstQuestToday) {
        bonusBreakdown.push({ type: 'first_daily', label: '☀️ First Quest of Day', amount: 25 });
        baseXp += 25;
      }
      
      const totalXpAwarded = baseXp;
      const newXp = currentStats.total_xp + totalXpAwarded;
      const newLevel = calculateLevel(newXp);
      const leveledUp = newLevel > currentStats.level;
      const newQuestsCompleted = currentStats.quests_completed + 1;
      const newLongestStreak = Math.max(currentStats.longest_streak || 0, newStreak);
      const questsTowardReward = (currentStats.quests_toward_reward || 0) + 1;

      await sql`
        UPDATE mentee_stats 
        SET total_xp = ${newXp},
            level = ${newLevel},
            quests_completed = ${newQuestsCompleted},
            current_streak = ${newStreak},
            longest_streak = ${newLongestStreak},
            last_streak_date = ${today},
            streak_freeze_available = ${usedFreeze ? false : currentStats.streak_freeze_available},
            quests_toward_reward = ${questsTowardReward},
            first_quest_today = ${isFirstQuestToday ? true : currentStats.first_quest_today},
            last_first_quest_date = ${isFirstQuestToday ? today : currentStats.last_first_quest_date},
            total_bonus_xp = COALESCE(total_bonus_xp, 0) + ${totalXpAwarded - submission.xp_reward},
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = 1
      `;

      // Check badges
      await checkAndAwardBadges(newXp, newLevel, newQuestsCompleted);
      
      // Check achievements
      const unlockedAchievements = await checkAndAwardAchievements(
        newXp, newLevel, newQuestsCompleted, newStreak,
        submission.category, submission.submitted_at
      );

      // Add achievement bonus XP
      let achievementBonusXp = 0;
      for (const achievement of unlockedAchievements) {
        achievementBonusXp += achievement.xp_bonus || 0;
        bonusBreakdown.push({ type: 'achievement', label: `🏆 ${achievement.name}`, amount: achievement.xp_bonus });
      }
      
      if (achievementBonusXp > 0) {
        await sql`UPDATE mentee_stats SET total_xp = total_xp + ${achievementBonusXp} WHERE id = 1`;
      }

      // Rotate lucky quest
      await sql`UPDATE quests SET is_lucky_quest = false WHERE is_lucky_quest = true`;
      await sql`
        UPDATE quests 
        SET is_lucky_quest = true, lucky_multiplier = 1.5
        WHERE id = (SELECT id FROM quests WHERE is_active = true AND is_locked = false ORDER BY RANDOM() LIMIT 1)
      `;

      // Log activity
      await sql`
        INSERT INTO activity_log (action, quest_id, details)
        VALUES ('quest_approved', ${submission.quest_id}, ${JSON.stringify({ 
          xpAwarded: totalXpAwarded,
          baseXp: submission.xp_reward,
          bonusBreakdown,
          achievementsUnlocked: unlockedAchievements.map(a => a.name),
          leveledUp,
          newLevel,
          newStreak
        })})
      `;

      // Check for reward milestone
      const rewardEarned = questsTowardReward % 10 === 0 && questsTowardReward > 0;

      return NextResponse.json({ 
        success: true, 
        status: 'completed',
        xpAwarded: totalXpAwarded,
        baseXp: submission.xp_reward,
        bonusBreakdown,
        newTotalXp: newXp + achievementBonusXp,
        newLevel,
        leveledUp,
        newStreak,
        streakBonus,
        achievementsUnlocked: unlockedAchievements,
        rewardEarned,
        celebration: {
          confetti: true,
          levelUp: leveledUp,
          achievements: unlockedAchievements.length > 0,
          reward: rewardEarned
        }
      });
    }

    if (action === 'reject') {
      await sql`
        UPDATE quest_progress 
        SET status = 'in_progress',
            mentor_feedback = ${feedback},
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${progressId}
      `;

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

// Badge checking (legacy)
async function checkAndAwardBadges(totalXp: number, level: number, questsCompleted: number) {
  try {
    const badgesResult = await sql`
      SELECT b.* FROM badges b
      WHERE NOT EXISTS (SELECT 1 FROM earned_badges eb WHERE eb.badge_id = b.id)
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
          const catResult = await sql`
            SELECT COUNT(*) as count FROM quest_progress qp
            JOIN quests q ON qp.quest_id = q.id
            WHERE qp.status = 'completed' AND q.category = ${requirement.category}
          `;
          earned = parseInt(catResult.rows[0].count) >= requirement.count;
          break;
      }

      if (earned) {
        await sql`INSERT INTO earned_badges (badge_id) VALUES (${badge.id})`;
        await sql`INSERT INTO activity_log (action, details) VALUES ('badge_earned', ${JSON.stringify({ badgeName: badge.name, badgeIcon: badge.icon })})`;
      }
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  }
}

// Achievement checking
async function checkAndAwardAchievements(
  totalXp: number, level: number, questsCompleted: number,
  currentStreak: number, questCategory: string, submittedAt: string
): Promise<any[]> {
  const unlocked: any[] = [];
  
  try {
    const achievementsResult = await sql`
      SELECT a.* FROM achievements a
      WHERE NOT EXISTS (SELECT 1 FROM earned_achievements ea WHERE ea.achievement_id = a.id)
    `;

    for (const achievement of achievementsResult.rows) {
      let earned = false;

      switch (achievement.requirement_type) {
        case 'quests_completed':
          earned = questsCompleted >= achievement.requirement_value;
          break;
        case 'streak':
          earned = currentStreak >= achievement.requirement_value;
          break;
        case 'total_xp':
          earned = totalXp >= achievement.requirement_value;
          break;
        case 'special':
          if (achievement.code === 'night_owl') {
            const hour = new Date(submittedAt).getHours();
            earned = hour >= 22 || hour < 5;
          } else if (achievement.code === 'early_bird') {
            const hour = new Date(submittedAt).getHours();
            earned = hour >= 5 && hour < 7;
          } else if (achievement.code === 'speed_demon') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const countResult = await sql`
              SELECT COUNT(*) as count FROM quest_progress
              WHERE status = 'completed' AND completed_at >= ${todayStart.toISOString()}
            `;
            earned = parseInt(countResult.rows[0].count) >= 3;
          } else if (achievement.code === 'perfectionist') {
            const rejectResult = await sql`SELECT COUNT(*) as count FROM activity_log WHERE action = 'quest_rejected'`;
            earned = questsCompleted >= 5 && parseInt(rejectResult.rows[0].count) === 0;
          }
          break;
        case 'category_complete':
          if (achievement.code === 'security_master') {
            const totalResult = await sql`SELECT COUNT(*) as total FROM quests WHERE category = 'Security' AND is_active = true`;
            const completedResult = await sql`
              SELECT COUNT(*) as completed FROM quest_progress qp
              JOIN quests q ON qp.quest_id = q.id
              WHERE qp.status = 'completed' AND q.category = 'Security'
            `;
            earned = parseInt(completedResult.rows[0].completed) >= parseInt(totalResult.rows[0].total);
          }
          break;
      }

      if (earned) {
        await sql`INSERT INTO earned_achievements (achievement_id) VALUES (${achievement.id})`;
        await sql`INSERT INTO activity_log (action, details) VALUES ('achievement_unlocked', ${JSON.stringify({ achievementName: achievement.name, achievementIcon: achievement.icon, xpBonus: achievement.xp_bonus })})`;
        unlocked.push(achievement);
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
  
  return unlocked;
}
