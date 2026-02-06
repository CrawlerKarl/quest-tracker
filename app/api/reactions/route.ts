import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';

const VALID_REACTIONS = ['🔥', '💪', '👏', '🎯', '💎'];

// GET reactions for a quest progress
export async function GET(request: Request) {
  const role = getCurrentRole();
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const progressId = searchParams.get('progressId');

  if (!progressId) {
    return NextResponse.json({ error: 'Progress ID required' }, { status: 400 });
  }

  try {
    const result = await sql`
      SELECT reaction, created_at 
      FROM quest_reactions 
      WHERE quest_progress_id = ${parseInt(progressId)}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ reactions: result.rows });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }
}

// POST a new reaction (mentor only)
export async function POST(request: Request) {
  const role = getCurrentRole();
  if (role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { progressId, reaction } = body;

    if (!progressId || !reaction) {
      return NextResponse.json({ error: 'Progress ID and reaction required' }, { status: 400 });
    }

    if (!VALID_REACTIONS.includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
    }

    // Check if quest progress exists and is completed
    const progressResult = await sql`
      SELECT id FROM quest_progress WHERE id = ${progressId} AND status = 'completed'
    `;

    if (progressResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quest not found or not completed' }, { status: 404 });
    }

    // Add reaction (allow multiple)
    await sql`
      INSERT INTO quest_reactions (quest_progress_id, reaction)
      VALUES (${progressId}, ${reaction})
    `;

    // Log activity
    await sql`
      INSERT INTO activity_log (action, details)
      VALUES ('reaction_added', ${JSON.stringify({ progressId, reaction })})
    `;

    return NextResponse.json({ success: true, reaction });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  }
}
