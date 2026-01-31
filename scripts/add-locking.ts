import { sql } from '@vercel/postgres';

async function addLockingColumns() {
  console.log('🔒 Adding quest locking columns...\n');

  try {
    // Add is_locked column (default true = new quests start locked)
    await sql`
      ALTER TABLE quests 
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false
    `;
    console.log('✅ Added is_locked column');

    // Add unlocks_after column (JSON array of quest IDs that must be completed)
    await sql`
      ALTER TABLE quests 
      ADD COLUMN IF NOT EXISTS unlocks_after TEXT DEFAULT '[]'
    `;
    console.log('✅ Added unlocks_after column');

    // Lock all quests except the first 5 most important ones
    await sql`
      UPDATE quests 
      SET is_locked = true 
      WHERE sort_order > 5
    `;
    console.log('✅ Locked quests with sort_order > 5');

    await sql`
      UPDATE quests 
      SET is_locked = false 
      WHERE sort_order <= 5
    `;
    console.log('✅ Unlocked first 5 quests');

    // Set up unlock chains
    await sql`UPDATE quests SET unlocks_after = '[5]' WHERE sort_order BETWEEN 6 AND 10`;
    await sql`UPDATE quests SET unlocks_after = '[10]' WHERE sort_order BETWEEN 11 AND 15`;
    await sql`UPDATE quests SET unlocks_after = '[15]' WHERE sort_order BETWEEN 16 AND 20`;
    await sql`UPDATE quests SET unlocks_after = '[20]' WHERE sort_order BETWEEN 21 AND 25`;

    console.log('✅ Set up unlock chains');
    console.log('\n🎉 Quest locking system ready!');
    console.log('\n📋 Current setup:');
    console.log('   • Quests 1-5: Unlocked (starter quests)');
    console.log('   • Quests 6-10: Unlock after quest 5 completed');
    console.log('   • Quests 11-15: Unlock after quest 10 completed');
    console.log('   • Quests 16-20: Unlock after quest 15 completed');
    console.log('   • Quests 21-25: Unlock after quest 20 completed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addLockingColumns();