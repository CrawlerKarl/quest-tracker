import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentRole } from '@/lib/auth';

// GET recent activity
export async function GET() {
  const role = getCurrentRole();
  
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT al.*, q.title as quest_title
      FROM activity_log al
      LEFT JOIN quests q ON al.quest_id = q.id
      ORDER BY al.created_at DESC
      LIMIT 20
    `;

    const activities = result.rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null,
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
