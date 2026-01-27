import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';
import { sanitizeText, sanitizeStringArray } from '@/lib/sanitize';

// GET all quests (with progress for mentee)
export async function GET() {
  const role = getCurrentRole();
  
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active quests
    const questsResult = await sql`
      SELECT * FROM quests WHERE is_active = true ORDER BY sort_order ASC, id ASC
    `;

    // Get progress for each quest
    const progressResult = await sql`
      SELECT * FROM quest_progress
    `;

    // Map progress to quests
    const progressMap = new Map(
      progressResult.rows.map(p => [p.quest_id, p])
    );

    const quests = questsResult.rows.map(quest => ({
      ...quest,
      steps: JSON.parse(quest.steps || '[]'),
      evidenceExamples: JSON.parse(quest.evidence_examples || '[]'),
      prerequisites: JSON.parse(quest.prerequisites || '[]'),
      progress: progressMap.get(quest.id) || null,
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
    
    const title = sanitizeText(body.title, 255);
    const description = sanitizeText(body.description, 2000);
    const category = sanitizeText(body.category, 100);
    const difficulty = ['beginner', 'intermediate', 'advanced'].includes(body.difficulty) 
      ? body.difficulty 
      : 'beginner';
    const xpReward = Math.min(Math.max(parseInt(body.xpReward) || 100, 10), 1000);
    const steps = JSON.stringify(sanitizeStringArray(body.steps, 20, 500));
    const whyItMatters = sanitizeText(body.whyItMatters || '', 1000);
    const safetyNotes = sanitizeText(body.safetyNotes || '', 1000);
    const evidenceExamples = JSON.stringify(sanitizeStringArray(body.evidenceExamples || [], 10, 500));
    
    // Get next sort order
    const maxOrderResult = await sql`SELECT MAX(sort_order) as max_order FROM quests`;
    const sortOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1;

    const result = await sql`
      INSERT INTO quests (title, description, category, difficulty, xp_reward, steps, why_it_matters, safety_notes, evidence_examples, sort_order)
      VALUES (${title}, ${description}, ${category}, ${difficulty}, ${xpReward}, ${steps}, ${whyItMatters}, ${safetyNotes}, ${evidenceExamples}, ${sortOrder})
      RETURNING *
    `;

    // Log activity
    await sql`
      INSERT INTO activity_log (action, quest_id, details)
      VALUES ('quest_created', ${result.rows[0].id}, ${JSON.stringify({ title })})
    `;

    return NextResponse.json({ quest: result.rows[0] });
  } catch (error) {
    console.error('Error creating quest:', error);
    return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 });
  }
}
