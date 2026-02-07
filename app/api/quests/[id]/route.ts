import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';

// GET single quest
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role = getCurrentRole();
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const questId = parseInt(params.id);
  if (isNaN(questId)) {
    return NextResponse.json({ error: 'Invalid quest ID' }, { status: 400 });
  }

  try {
    const result = await sql`
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
      WHERE q.id = ${questId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    const quest = result.rows[0];

    // Get reactions if completed
    let reactions: string[] = [];
    if (quest.progress_id && quest.status === 'completed') {
      const reactionsResult = await sql`
        SELECT reaction FROM quest_reactions WHERE quest_progress_id = ${quest.progress_id}
      `;
      reactions = reactionsResult.rows.map(r => r.reaction);
    }

    const formattedQuest = {
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
      is_locked: quest.is_locked,
      is_lucky_quest: quest.is_lucky_quest,
      lucky_multiplier: quest.lucky_multiplier,
      tier: quest.tier,
      unlock_at_xp: quest.unlock_at_xp,
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
      reactions,
    };

    // Safety reminder for certain quest types
    let safetyReminder = '';
    if (quest.category === 'Security' || quest.category === 'Privacy') {
      safetyReminder = 'Remember: Never include passwords, personal addresses, or sensitive personal information in your screenshots!';
    }

    return NextResponse.json({ quest: formattedQuest, safetyReminder });
  } catch (error) {
    console.error('Error fetching quest:', error);
    return NextResponse.json({ error: 'Failed to fetch quest' }, { status: 500 });
  }
}

// POST - Start or submit quest (mentee)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role = getCurrentRole();
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const questId = parseInt(params.id);
  if (isNaN(questId)) {
    return NextResponse.json({ error: 'Invalid quest ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'start') {
      // Check if already started
      const existing = await sql`
        SELECT id FROM quest_progress WHERE quest_id = ${questId}
      `;
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Quest already started' }, { status: 400 });
      }

      await sql`
        INSERT INTO quest_progress (quest_id, status, started_at)
        VALUES (${questId}, 'in_progress', NOW())
      `;

      await sql`
        INSERT INTO activity_log (action, quest_id)
        VALUES ('quest_started', ${questId})
      `;

      return NextResponse.json({ success: true, status: 'in_progress' });
    }

    if (action === 'submit') {
      const evidenceLinks = body.evidenceLinks || [];
      const reflection = sanitizeText(body.reflection || '', 2000);

      if (evidenceLinks.length === 0) {
        return NextResponse.json({ error: 'At least one evidence link required' }, { status: 400 });
      }

      await sql`
        UPDATE quest_progress 
        SET status = 'submitted',
            evidence_links = ${JSON.stringify(evidenceLinks)},
            reflection = ${reflection},
            submitted_at = NOW(),
            updated_at = NOW()
        WHERE quest_id = ${questId}
      `;

      await sql`
        INSERT INTO activity_log (action, quest_id)
        VALUES ('quest_submitted', ${questId})
      `;

      return NextResponse.json({ success: true, status: 'submitted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing quest action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}

// PUT - Update quest (mentor only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role = getCurrentRole();
  if (role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const questId = parseInt(params.id);
  if (isNaN(questId)) {
    return NextResponse.json({ error: 'Invalid quest ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Handle simple lock toggle
    if (body.toggleLock !== undefined) {
      await sql`
        UPDATE quests SET is_locked = NOT is_locked, updated_at = NOW()
        WHERE id = ${questId}
      `;
      return NextResponse.json({ success: true });
    }

    // Full quest update
    const title = sanitizeText(body.title || '', 200);
    const description = sanitizeText(body.description || '', 2000);
    const category = sanitizeText(body.category || '', 100);
    const difficulty = body.difficulty || 'beginner';
    const xpReward = parseInt(body.xpReward) || 100;
    const steps = JSON.stringify(body.steps || []);
    const whyItMatters = sanitizeText(body.whyItMatters || '', 2000);
    const safetyNotes = sanitizeText(body.safetyNotes || '', 1000);
    const evidenceExamples = JSON.stringify(body.evidenceExamples || []);
    const isLocked = body.isLocked !== false;
    const tier = body.tier || 'rookie';
    const unlockAtXp = parseInt(body.unlockAtXp) || 0;
    const sortOrder = parseInt(body.sortOrder) || 999;

    await sql`
      UPDATE quests 
      SET title = ${title},
          description = ${description},
          category = ${category},
          difficulty = ${difficulty},
          xp_reward = ${xpReward},
          steps = ${steps},
          why_it_matters = ${whyItMatters},
          safety_notes = ${safetyNotes},
          evidence_examples = ${evidenceExamples},
          is_locked = ${isLocked},
          tier = ${tier},
          unlock_at_xp = ${unlockAtXp},
          sort_order = ${sortOrder},
          updated_at = NOW()
      WHERE id = ${questId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quest:', error);
    return NextResponse.json({ error: 'Failed to update quest' }, { status: 500 });
  }
}
