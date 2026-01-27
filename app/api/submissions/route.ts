import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';

// GET all pending submissions (mentor only)
export async function GET() {
  const role = getCurrentRole();
  
  if (role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await sql`
      SELECT 
        qp.*,
        q.title as quest_title,
        q.category as quest_category,
        q.difficulty as quest_difficulty,
        q.xp_reward as quest_xp_reward
      FROM quest_progress qp
      JOIN quests q ON qp.quest_id = q.id
      WHERE qp.status = 'submitted'
      ORDER BY qp.submitted_at ASC
    `;

    const submissions = result.rows.map(row => ({
      ...row,
      evidenceLinks: JSON.parse(row.evidence_links || '[]'),
    }));

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
