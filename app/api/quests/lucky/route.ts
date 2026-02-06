import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';

// POST - Set a quest as lucky (mentor only)
export async function POST(request: Request) {
  const role = getCurrentRole();
  if (role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { questId } = body;

    if (!questId) {
      return NextResponse.json({ error: 'Quest ID required' }, { status: 400 });
    }

    // Clear all lucky quests
    await sql`UPDATE quests SET is_lucky_quest = false, lucky_multiplier = 1.0`;

    // Set new lucky quest
    await sql`
      UPDATE quests 
      SET is_lucky_quest = true, lucky_multiplier = 1.5
      WHERE id = ${questId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting lucky quest:', error);
    return NextResponse.json({ error: 'Failed to set lucky quest' }, { status: 500 });
  }
}
