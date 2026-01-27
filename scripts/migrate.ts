import { sql } from '@vercel/postgres';

async function migrate() {
  console.log('🚀 Running database migrations...\n');

  try {
    // Create quests table
    await sql`
      CREATE TABLE IF NOT EXISTS quests (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        xp_reward INTEGER NOT NULL DEFAULT 100,
        steps TEXT NOT NULL,
        why_it_matters TEXT,
        safety_notes TEXT,
        evidence_examples TEXT,
        prerequisites TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ Created quests table');

    // Create quest_progress table
    await sql`
      CREATE TABLE IF NOT EXISTS quest_progress (
        id SERIAL PRIMARY KEY,
        quest_id INTEGER NOT NULL REFERENCES quests(id),
        status VARCHAR(50) NOT NULL DEFAULT 'available',
        evidence_links TEXT,
        reflection TEXT,
        mentor_feedback TEXT,
        started_at TIMESTAMP,
        submitted_at TIMESTAMP,
        reviewed_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ Created quest_progress table');

    // Create mentee_stats table
    await sql`
      CREATE TABLE IF NOT EXISTS mentee_stats (
        id SERIAL PRIMARY KEY,
        total_xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        quests_completed INTEGER NOT NULL DEFAULT 0,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_activity_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ Created mentee_stats table');

    // Create badges table
    await sql`
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(50) NOT NULL,
        requirement TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ Created badges table');

    // Create earned_badges table
    await sql`
      CREATE TABLE IF NOT EXISTS earned_badges (
        id SERIAL PRIMARY KEY,
        badge_id INTEGER NOT NULL REFERENCES badges(id),
        earned_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ Created earned_badges table');

    // Create activity_log table
    await sql`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        quest_id INTEGER REFERENCES quests(id),
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ Created activity_log table');

    // Initialize mentee_stats with a single row if not exists
    await sql`
      INSERT INTO mentee_stats (id, total_xp, level, quests_completed)
      VALUES (1, 0, 1, 0)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Initialized mentee stats');

    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
