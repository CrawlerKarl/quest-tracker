import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole, checkRateLimit } from '@/lib/auth';
import { sanitizeText, sanitizeStringArray, sanitizeUrlArray, EVIDENCE_SAFETY_REMINDER } from '@/lib/sanitize';

// GET single quest with progress
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
    const questResult = await sql`
      SELECT * FROM quests WHERE id = ${questId}
    `;

    if (questResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    const progressResult = await sql`
      SELECT * FROM quest_progress WHERE quest_id = ${questId}
    `;

    const quest = {
      ...questResult.rows[0],
      steps: JSON.parse(questResult.rows[0].steps || '[]'),
      evidenceExamples: JSON.parse(questResult.rows[0].evidence_examples || '[]'),
      prerequisites: JSON.parse(questResult.rows[0].prerequisites || '[]'),
      progress: progressResult.rows[0] ? {
        ...progressResult.rows[0],
        evidenceLinks: JSON.parse(progressResult.rows[0].evidence_links || '[]'),
      } : null,
    };

    return NextResponse.json({ quest, safetyReminder: EVIDENCE_SAFETY_REMINDER });
  } catch (error) {
    console.error('Error fetching quest:', error);
    return NextResponse.json({ error: 'Failed to fetch quest' }, { status: 500 });
  }
}

// PUT update quest (mentor only)
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
    const isActive = body.isActive !== false;

    const result = await sql`
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
          is_active = ${isActive},
          updated_at = NOW()
      WHERE id = ${questId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    return NextResponse.json({ quest: result.rows[0] });
  } catch (error) {
    console.error('Error updating quest:', error);
    return NextResponse.json({ error: 'Failed to update quest' }, { status: 500 });
  }
}

// POST start quest or submit evidence (mentee only)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role = getCurrentRole();
  
  if (role !== 'mentee') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Rate limit submissions
  if (!checkRateLimit('mentee-action', 30, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const questId = parseInt(params.id);
  if (isNaN(questId)) {
    return NextResponse.json({ error: 'Invalid quest ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const action = body.action; // 'start' or 'submit'

    // Check quest exists
    const questResult = await sql`SELECT * FROM quests WHERE id = ${questId}`;
    if (questResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    // Check existing progress
    const progressResult = await sql`
      SELECT * FROM quest_progress WHERE quest_id = ${questId}
    `;
    const existingProgress = progressResult.rows[0];

    if (action === 'start') {
      if (existingProgress) {
        return NextResponse.json({ error: 'Quest already started' }, { status: 400 });
      }

      await sql`
        INSERT INTO quest_progress (quest_id, status, started_at)
        VALUES (${questId}, 'in_progress', NOW())
      `;

      // Log activity
      await sql`
        INSERT INTO activity_log (action, quest_id)
        VALUES ('quest_started', ${questId})
      `;

      // Update last activity
      await sql`UPDATE mentee_stats SET last_activity_at = NOW() WHERE id = 1`;

      return NextResponse.json({ success: true, status: 'in_progress' });
    }

    if (action === 'submit') {
      if (!existingProgress || existingProgress.status === 'completed') {
        return NextResponse.json({ error: 'Cannot submit for this quest' }, { status: 400 });
      }

      const evidenceLinks = sanitizeUrlArray(body.evidenceLinks);
      const reflection = sanitizeText(body.reflection || '', 2000);

      if (evidenceLinks.length === 0) {
        return NextResponse.json({ error: 'At least one evidence link is required' }, { status: 400 });
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

      // Log activity
      await sql`
        INSERT INTO activity_log (action, quest_id)
        VALUES ('quest_submitted', ${questId})
      `;

      // Update last activity
      await sql`UPDATE mentee_stats SET last_activity_at = NOW() WHERE id = 1`;

      return NextResponse.json({ success: true, status: 'submitted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error with quest action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}

// DELETE quest (mentor only)
export async function DELETE(
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
    // Soft delete by setting is_active to false
    await sql`
      UPDATE quests SET is_active = false, updated_at = NOW() WHERE id = ${questId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quest:', error);
    return NextResponse.json({ error: 'Failed to delete quest' }, { status: 500 });
  }
}
