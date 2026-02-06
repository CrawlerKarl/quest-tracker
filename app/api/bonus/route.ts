import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';

// GET active bonus events and lucky quest
export async function GET() {
  const role = getCurrentRole();
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayDate = today.toISOString().split('T')[0];

    // Get active bonus events
    const eventsResult = await sql`
      SELECT * FROM bonus_events
      WHERE is_active = true
      AND (start_date IS NULL OR start_date <= ${todayDate})
      AND (end_date IS NULL OR end_date >= ${todayDate})
    `;

    // Filter events that apply today
    const activeEvents = eventsResult.rows.filter(event => {
      if (event.days_of_week) {
        const days = JSON.parse(event.days_of_week);
        return days.includes(dayOfWeek);
      }
      return true;
    });

    // Get lucky quest
    const luckyQuestResult = await sql`
      SELECT id, title, xp_reward, lucky_multiplier, category, difficulty
      FROM quests
      WHERE is_lucky_quest = true AND is_active = true
      LIMIT 1
    `;

    // Check if user already got first quest bonus today
    const statsResult = await sql`
      SELECT first_quest_today, last_first_quest_date
      FROM mentee_stats WHERE id = 1
    `;
    const stats = statsResult.rows[0];
    const gotFirstQuestBonus = stats?.last_first_quest_date === todayDate && stats?.first_quest_today;

    // Calculate total multiplier
    let totalMultiplier = 1.0;
    let bonusXp = 0;
    const appliedBonuses: any[] = [];

    for (const event of activeEvents) {
      if (event.event_type === 'first_daily' && !gotFirstQuestBonus) {
        bonusXp += event.bonus_xp;
        appliedBonuses.push({
          name: event.name,
          type: 'bonus',
          value: event.bonus_xp
        });
      } else if (event.event_type === 'weekend') {
        totalMultiplier *= parseFloat(event.multiplier);
        appliedBonuses.push({
          name: event.name,
          type: 'multiplier',
          value: event.multiplier
        });
      }
    }

    return NextResponse.json({
      activeEvents,
      luckyQuest: luckyQuestResult.rows[0] || null,
      totalMultiplier,
      bonusXp,
      appliedBonuses,
      firstQuestBonusAvailable: !gotFirstQuestBonus
    });
  } catch (error) {
    console.error('Error fetching bonus info:', error);
    return NextResponse.json({ error: 'Failed to fetch bonus info' }, { status: 500 });
  }
}
