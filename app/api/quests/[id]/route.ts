import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole, checkRateLimit } from '@/lib/auth';

// ============================================
// INLINE SANITIZATION FUNCTIONS
// ============================================

function sanitizeText(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') return '';
  return input.slice(0, maxLength).replace(/[<>]/g, '').trim();
}

function sanitizeStringArray(input: unknown, maxItems: number = 20, maxLength: number = 1000): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, maxItems)
    .map(item => sanitizeText(String(item), maxLength))
    .filter(item => item.length > 0);
}

// Sanitize proof - can be URL or text description
function sanitizeProof(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 1000) return trimmed.slice(0, 1000);
  
  const sanitized = trimmed
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
  
  return sanitized.length > 0 ? sanitized : null;
}

// Accept text OR URLs for proof
function sanitizeProofArray(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => sanitizeProof(String(item)))
    .filter((item): item is string => item !== null && item.length > 0)
    .slice(0, 10);
}

// ============================================
// API ROUTES
// ============================================

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
      progress: progressResult.rows[0] ? {
        ...progressResult.rows[0],
        evidenceLinks: JSON.parse(progressResult.rows[0].evidence_links || '[]'),
      } : null,
    };

    return NextResponse.json({ quest });
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
    
    // Handle simple lock toggle
    if (body.toggleLock !== undefined) {
      const result = await sql`
        UPDATE quests 
        SET is_locked = NOT is_locked,
            updated_at = NOW()
        WHERE id = ${questId}
        RETURNING *
      `;
      return NextResponse.json({ quest: result.rows[0] });
    }

    // Full quest update
    const title = sanitizeText(body.title || '', 255);
    const description = sanitizeText(body.description || '', 2000);
    const category = sanitizeText(body.category || '', 100);
    const difficulty = ['beginner', 'intermediate', 'advanced'].includes(body.difficulty) 
      ? body.difficulty 
      : 'beginner';
    const xpReward = Math.min(Math.max(parseInt(body.xpReward) || 100, 10), 1000);
    const steps = JSON.stringify(sanitizeStringArray(body.steps || [], 20, 500));
    const whyItMatters = sanitizeText(body.whyItMatters || '', 1000);
    const safetyNotes = sanitizeText(body.safetyNotes || '', 1000);
    const evidenceExamples = JSON.stringify(sanitizeStringArray(body.evidenceExamples || [], 10, 500));
    const isActive = body.isActive !== false;
    const isLocked = body.isLocked === true;
    const tier = body.tier || 'rookie';
    const unlockAtXp = parseInt(body.unlockAtXp) || 0;
    const sortOrder = parseInt(body.sortOrder) || 999;

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
          is_locked = ${isLocked},
          tier = ${tier},
          unlock_at_xp = ${unlockAtXp},
          sort_order = ${sortOrder},
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

    console.log('Quest action:', action, 'for quest:', questId);

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
      try {
        await sql`
          INSERT INTO activity_log (action, quest_id)
          VALUES ('quest_started', ${questId})
        `;
      } catch (e) {
        console.log('Activity log insert failed (non-critical)');
      }

      // Update last activity
      await sql`UPDATE mentee_stats SET last_activity_at = NOW() WHERE id = 1`;

      return NextResponse.json({ success: true, status: 'in_progress' });
    }

    if (action === 'submit') {
      console.log('Submit action - existing progress:', existingProgress);
      
      if (!existingProgress) {
        return NextResponse.json({ error: 'Quest not started yet' }, { status: 400 });
      }
      
      if (existingProgress.status === 'completed') {
        return NextResponse.json({ error: 'Quest already completed' }, { status: 400 });
      }

      if (existingProgress.status === 'submitted') {
        return NextResponse.json({ error: 'Quest already submitted, awaiting review' }, { status: 400 });
      }

      // Use sanitizeProofArray - accepts text OR URLs
      const evidenceLinks = sanitizeProofArray(body.evidenceLinks);
      const reflection = sanitizeText(body.reflection || '', 2000);

      console.log('Evidence links after sanitize:', evidenceLinks);

      if (evidenceLinks.length === 0) {
        return NextResponse.json({ error: 'At least one proof item is required' }, { status: 400 });
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
      try {
        await sql`
          INSERT INTO activity_log (action, quest_id)
          VALUES ('quest_submitted', ${questId})
        `;
      } catch (e) {
        console.log('Activity log insert failed (non-critical)');
      }

      // Update last activity
      await sql`UPDATE mentee_stats SET last_activity_at = NOW() WHERE id = 1`;

      console.log('Submit successful');
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
    await sql`
      UPDATE quests SET is_active = false, updated_at = NOW() WHERE id = ${questId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quest:', error);
    return NextResponse.json({ error: 'Failed to delete quest' }, { status: 500 });
  }
}
