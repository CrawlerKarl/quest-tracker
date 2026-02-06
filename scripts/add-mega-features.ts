import { sql } from '@vercel/postgres';

async function addMegaFeatures() {
  console.log('🚀 Adding mega engagement features...\n');

  try {
    // 1. Add reactions table
    await sql`
      CREATE TABLE IF NOT EXISTS quest_reactions (
        id SERIAL PRIMARY KEY,
        quest_progress_id INTEGER NOT NULL,
        reaction VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created quest_reactions table');

    // 2. Add bonus XP tracking columns
    await sql`
      ALTER TABLE mentee_stats 
      ADD COLUMN IF NOT EXISTS first_quest_today BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_first_quest_date DATE,
      ADD COLUMN IF NOT EXISTS total_bonus_xp INTEGER DEFAULT 0
    `;
    console.log('✅ Added bonus XP tracking columns');

    // 3. Add lucky quest column to quests
    await sql`
      ALTER TABLE quests 
      ADD COLUMN IF NOT EXISTS is_lucky_quest BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS lucky_multiplier DECIMAL(3,1) DEFAULT 1.0
    `;
    console.log('✅ Added lucky quest columns');

    // 4. Create bonus events table
    await sql`
      CREATE TABLE IF NOT EXISTS bonus_events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL,
        multiplier DECIMAL(3,1) DEFAULT 1.5,
        bonus_xp INTEGER DEFAULT 0,
        start_date DATE,
        end_date DATE,
        days_of_week TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created bonus_events table');

    // 5. Seed default bonus events
    await sql`
      INSERT INTO bonus_events (name, description, event_type, multiplier, bonus_xp, days_of_week, is_active)
      VALUES 
        ('First Quest of the Day', 'Bonus XP for your first completed quest each day', 'first_daily', 1.0, 25, NULL, true),
        ('Weekend Warrior', 'Double XP on weekends!', 'weekend', 2.0, 0, '["saturday","sunday"]', true)
      ON CONFLICT DO NOTHING
    `;
    console.log('✅ Seeded default bonus events');

    // 6. Pick a random lucky quest (changes daily)
    await sql`
      UPDATE quests SET is_lucky_quest = false
    `;
    await sql`
      UPDATE quests 
      SET is_lucky_quest = true, lucky_multiplier = 1.5
      WHERE id = (
        SELECT id FROM quests 
        WHERE is_active = true AND is_locked = false 
        ORDER BY RANDOM() 
        LIMIT 1
      )
    `;
    console.log('✅ Set random lucky quest (1.5x XP)');

    // 7. Add notification preferences
    await sql`
      ALTER TABLE mentee_stats 
      ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS push_subscription TEXT
    `;
    console.log('✅ Added notification columns');

    console.log('\n🎉 Mega features ready!');
    console.log('\n📋 Features added:');
    console.log('   • Quest reactions system (🔥 💪 👏 🎯 💎)');
    console.log('   • Bonus XP events (first daily, weekend warrior)');
    console.log('   • Lucky quest system (random 1.5x multiplier)');
    console.log('   • PWA notification support columns');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addMegaFeatures();
