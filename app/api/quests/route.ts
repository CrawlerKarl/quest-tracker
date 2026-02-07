import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';

// XP thresholds for each tier
const TIER_THRESHOLDS: Record<string, number> = {
  rookie: 0,
  apprentice: 500,
  pro: 1500,
  elite: 3500,
  legend: 7000,
};

const TIER_INFO: Record<string, { icon: string; name: string }> = {
  rookie: { icon: '🌱', name: 'ROOKIE' },
  apprentice: { icon: '⚡', name: 'APPRENTICE' },
  pro: { icon: '🔥', name: 'PRO' },
  elite: { icon: '💎', name: 'ELITE' },
  legend: { icon: '👑', name: 'LEGEND' },
};

// GET all quests for the authenticated user
export async function GET() {
  const role = getCurrentRole();
  
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get current XP to determine unlocked tiers
    const statsResult = await sql`SELECT total_xp FROM mentee_stats WHERE id = 1`;
    const currentXp = statsResult.rows[0]?.total_xp || 0;

    // Determine which tiers are unlocked
    const unlockedTiers: string[] = [];
    for (const [tier, threshold] of Object.entries(TIER_THRESHOLDS)) {
      if (currentXp >= threshold) {
        unlockedTiers.push(tier);
      }
    }

    // Get all quests with their progress
    const questsResult = await sql`
      SELECT 
        q.*,
        qp.id as progress_id,
        qp.status,
        qp.evidence_links,
        qp.reflection,
        qp.mentor_feedback,
        qp.started_at,
        qp.submitted_at,
        qp.completed_at
      FROM quests q
      LEFT JOIN quest_progress qp ON q.id = qp.quest_id
      WHERE q.is_active = true
      ORDER BY q.sort_order ASC
    `;

    // Get reactions for completed quests
    const reactionsResult = await sql`
      SELECT qr.quest_progress_id, qr.reaction
      FROM quest_reactions qr
      JOIN quest_progress qp ON qr.quest_progress_id = qp.id
      WHERE qp.status = 'completed'
    `;
    
    const reactionsByProgress: Record<number, string[]> = {};
    for (const row of reactionsResult.rows) {
      if (!reactionsByProgress[row.quest_progress_id]) {
        reactionsByProgress[row.quest_progress_id] = [];
      }
      reactionsByProgress[row.quest_progress_id].push(row.reaction);
    }

    // Process quests - unlock based on XP tier
    const quests = questsResult.rows.map(quest => {
      const tier = quest.tier || 'rookie';
      const unlockXp = quest.unlock_at_xp || TIER_THRESHOLDS[tier] || 0;
      const isUnlocked = currentXp >= unlockXp;
      
      // For mentors, show all quests; for mentees, respect lock status
      const showQuest = role === 'mentor' || isUnlocked;
      
      if (!showQuest) {
        return null; // Filter out locked quests for mentee view
      }

      return {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        category: quest.category,
        difficulty: quest.difficulty,
        xp_reward: quest.xp_reward,
        steps: JSON.parse(quest.steps || '[]'),
        why_it_matters: quest.why_it_matters,
        safety_notes: quest.safety_notes,
        evidenceExamples: JSON.parse(quest.evidence_examples || '[]'),
        is_active: quest.is_active,
        is_locked: !isUnlocked,
        is_lucky_quest: quest.is_lucky_quest,
        lucky_multiplier: quest.lucky_multiplier,
        tier: tier,
        unlock_at_xp: unlockXp,
        sort_order: quest.sort_order,
        progress: quest.progress_id ? {
          id: quest.progress_id,
          status: quest.status,
          evidence_links: quest.evidence_links,
          reflection: quest.reflection,
          mentor_feedback: quest.mentor_feedback,
          started_at: quest.started_at,
          submitted_at: quest.submitted_at,
          completed_at: quest.completed_at,
        } : null,
        reactions: quest.progress_id ? reactionsByProgress[quest.progress_id] || [] : [],
      };
    }).filter(Boolean);

    // Calculate locked quests info (for preview)
    const lockedQuestsPreview = await sql`
      SELECT tier, COUNT(*) as count, MIN(unlock_at_xp) as unlock_xp
      FROM quests 
      WHERE is_active = true AND unlock_at_xp > ${currentXp}
      GROUP BY tier
      ORDER BY MIN(unlock_at_xp) ASC
    `;

    const nextTierInfo = lockedQuestsPreview.rows.length > 0 ? {
      tier: lockedQuestsPreview.rows[0].tier,
      questCount: parseInt(lockedQuestsPreview.rows[0].count),
      unlockXp: parseInt(lockedQuestsPreview.rows[0].unlock_xp),
      xpNeeded: parseInt(lockedQuestsPreview.rows[0].unlock_xp) - currentXp,
      tierInfo: TIER_INFO[lockedQuestsPreview.rows[0].tier] || { icon: '🔒', name: 'LOCKED' }
    } : null;

    return NextResponse.json({ 
      quests,
      currentXp,
      unlockedTiers,
      nextTierInfo,
      tierInfo: TIER_INFO,
    });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
  }
}

// POST - Create a new quest (mentor only)
export async function POST(request: Request) {
  const role = getCurrentRole();
  
  if (role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    const result = await sql`
      INSERT INTO quests (
        title, description, category, difficulty, xp_reward,
        steps, why_it_matters, safety_notes, evidence_examples,
        is_locked, tier, unlock_at_xp, sort_order
      ) VALUES (
        ${body.title},
        ${body.description},
        ${body.category},
        ${body.difficulty},
        ${body.xpReward || 100},
        ${JSON.stringify(body.steps || [])},
        ${body.whyItMatters || ''},
        ${body.safetyNotes || ''},
        ${JSON.stringify(body.evidenceExamples || [])},
        ${body.isLocked !== false},
        ${body.tier || 'rookie'},
        ${body.unlockAtXp || 0},
        ${body.sortOrder || 999}
      )
      RETURNING id
    `;

    return NextResponse.json({ success: true, questId: result.rows[0].id });
  } catch (error) {
    console.error('Error creating quest:', error);
    return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 });
  }
}
