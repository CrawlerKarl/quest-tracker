import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';

// Helper to set daily lucky quest (excluding completed quests)
async function updateDailyLuckyQuest() {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if we already set lucky quest today
  const currentLucky = await sql`
    SELECT id, updated_at FROM quests 
    WHERE is_lucky_quest = true 
    LIMIT 1
  `;
  
  if (currentLucky.rows.length > 0) {
    const lastUpdate = currentLucky.rows[0].updated_at;
    const lastUpdateDate = new Date(lastUpdate).toISOString().split('T')[0];
    
    // If already updated today, skip
    if (lastUpdateDate === today) {
      return;
    }
  }
  
  // Clear all lucky quest flags
  await sql`UPDATE quests SET is_lucky_quest = false WHERE is_lucky_quest = true`;
  
  // Pick a random quest that is:
  // - Active
  // - NOT completed
  // - Available (has no progress or is selected but not completed)
  const eligibleQuests = await sql`
    SELECT q.id FROM quests q
    LEFT JOIN quest_progress qp ON q.id = qp.quest_id
    WHERE q.is_active = true 
    AND (qp.status IS NULL OR qp.status NOT IN ('completed', 'submitted'))
    ORDER BY RANDOM()
    LIMIT 1
  `;
  
  if (eligibleQuests.rows.length > 0) {
    await sql`
      UPDATE quests 
      SET is_lucky_quest = true, updated_at = NOW()
      WHERE id = ${eligibleQuests.rows[0].id}
    `;
  }
}

// GET all quests with progress
export async function GET() {
  const role = getCurrentRole();
  
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Update lucky quest daily (excludes completed quests)
    await updateDailyLuckyQuest();

    // Get all active quests with their progress
    const result = await sql`
      SELECT 
        q.*,
        qp.id as progress_id,
        qp.status,
        qp.evidence_links,
        qp.reflection,
        qp.mentor_feedback,
        qp.is_selected,
        qp.started_at,
        qp.submitted_at,
        qp.completed_at
      FROM quests q
      LEFT JOIN quest_progress qp ON q.id = qp.quest_id
      WHERE q.is_active = true
      ORDER BY 
        CASE 
          WHEN qp.status = 'submitted' THEN 1
          WHEN qp.is_selected = true THEN 2
          WHEN qp.status = 'completed' THEN 4
          ELSE 3
        END,
        q.sort_order ASC,
        q.id ASC
    `;

    const quests = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      xp_reward: row.xp_reward,
      steps: JSON.parse(row.steps || '[]'),
      why_it_matters: row.why_it_matters,
      safety_notes: row.safety_notes,
      evidenceExamples: JSON.parse(row.evidence_examples || '[]'),
      is_active: row.is_active,
      is_locked: row.is_locked,
      is_lucky_quest: row.is_lucky_quest,
      lucky_multiplier: row.lucky_multiplier || 1.5,
      tier: row.tier || 'rookie',
      unlock_at_xp: row.unlock_at_xp || 0,
      sort_order: row.sort_order,
      progress: row.progress_id ? {
        id: row.progress_id,
        status: row.status,
        evidence_links: row.evidence_links,
        reflection: row.reflection,
        mentor_feedback: row.mentor_feedback,
        is_selected: row.is_selected,
        started_at: row.started_at,
        submitted_at: row.submitted_at,
        completed_at: row.completed_at,
      } : null,
    }));

    return NextResponse.json({ quests });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
  }
}

// POST create new quest (mentor only)
export async function POST(request: Request) {
  const role = getCurrentRole();
  
  if (role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    const title = body.title?.slice(0, 255) || 'New Quest';
    const description = body.description?.slice(0, 2000) || '';
    const category = body.category?.slice(0, 100) || 'General';
    const difficulty = ['beginner', 'intermediate', 'advanced'].includes(body.difficulty) 
      ? body.difficulty 
      : 'beginner';
    const xpReward = Math.min(Math.max(parseInt(body.xpReward) || 100, 10), 1000);
    const steps = JSON.stringify(body.steps || []);
    const whyItMatters = body.whyItMatters?.slice(0, 1000) || '';
    const safetyNotes = body.safetyNotes?.slice(0, 1000) || '';
    const evidenceExamples = JSON.stringify(body.evidenceExamples || []);
    const tier = body.tier || 'rookie';
    const unlockAtXp = parseInt(body.unlockAtXp) || 0;

    const result = await sql`
      INSERT INTO quests (
        title, description, category, difficulty, xp_reward,
        steps, why_it_matters, safety_notes, evidence_examples,
        tier, unlock_at_xp, is_active, is_locked
      ) VALUES (
        ${title}, ${description}, ${category}, ${difficulty}, ${xpReward},
        ${steps}, ${whyItMatters}, ${safetyNotes}, ${evidenceExamples},
        ${tier}, ${unlockAtXp}, true, false
      )
      RETURNING *
    `;

    return NextResponse.json({ quest: result.rows[0] });
  } catch (error) {
    console.error('Error creating quest:', error);
    return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 });
  }
}
