import { sql } from '@vercel/postgres';

// Quest tier assignments - the original configuration
const TIER_ASSIGNMENTS = {
  rookie: [
    'Defender Shield Activated',
    'Update Champion',
    'Password Fortress',
    'Browser Guardian',
  ],
  apprentice: [
    'Two-Factor Warrior',
    'Screenshot Scholar',
    'File Organization Rookie',
    'Steam Setup Complete',
    'Scam Spotter Training',
  ],
  pro: [
    'Screen Recording Pro',
    'Steam Privacy Lock',
    'Find My Phone Setup',
    'Piracy Awareness',
    'Backup Basics',
  ],
  elite: [
    'Standard User Shield',
    'Email Like a Pro',
    'Privacy Settings Audit',
    'Home Network Basics',
    'Research Like a Scholar',
    'Ask Before You Act',
  ],
  legend: [
    'Command Line Basics',
    'Encryption Explorer',
    'Virtual Machine Sandbox',
    'DNS Deep Dive',
    'Git Version Control',
  ],
};

const TIER_XP_THRESHOLDS: Record<string, number> = {
  rookie: 0,
  apprentice: 500,
  pro: 1500,
  elite: 3500,
  legend: 7000,
};

async function resetToStartingState() {
  console.log('🔄 RESETTING CYBERQUEST TO STARTING STATE...\n');

  try {
    // 1. Delete all progress
    console.log('🗑️  Clearing quest progress...');
    await sql`DELETE FROM quest_progress`;
    console.log('   ✓ Quest progress cleared');

    // 2. Delete earned badges
    console.log('🗑️  Clearing earned badges...');
    try {
      await sql`DELETE FROM earned_badges`;
      console.log('   ✓ Earned badges cleared');
    } catch (e) {
      console.log('   ⚠ No earned_badges table (ok)');
    }

    // 3. Delete earned achievements
    console.log('🗑️  Clearing earned achievements...');
    try {
      await sql`DELETE FROM earned_achievements`;
      console.log('   ✓ Earned achievements cleared');
    } catch (e) {
      console.log('   ⚠ No earned_achievements table (ok)');
    }

    // 4. Delete reactions
    console.log('🗑️  Clearing reactions...');
    try {
      await sql`DELETE FROM quest_reactions`;
      console.log('   ✓ Reactions cleared');
    } catch (e) {
      console.log('   ⚠ No quest_reactions table (ok)');
    }

    // 5. Clear activity log
    console.log('🗑️  Clearing activity log...');
    try {
      await sql`DELETE FROM activity_log`;
      console.log('   ✓ Activity log cleared');
    } catch (e) {
      console.log('   ⚠ No activity_log table (ok)');
    }

    // 6. Reset mentee stats - only update columns that exist
    console.log('📊 Resetting Hero stats...');
    
    // First, get the current columns in mentee_stats
    const columnsResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mentee_stats'
    `;
    const existingColumns = columnsResult.rows.map(r => r.column_name);
    console.log(`   Found columns: ${existingColumns.join(', ')}`);
    
    // Reset core stats (these should always exist)
    await sql`
      UPDATE mentee_stats SET
        total_xp = 0,
        level = 1,
        quests_completed = 0,
        current_streak = 0,
        longest_streak = 0,
        updated_at = NOW()
      WHERE id = 1
    `;
    console.log('   ✓ Core stats reset');

    // Reset optional columns if they exist
    if (existingColumns.includes('streak_freeze_available')) {
      await sql`UPDATE mentee_stats SET streak_freeze_available = true WHERE id = 1`;
      console.log('   ✓ Streak freeze reset');
    }
    if (existingColumns.includes('quests_toward_reward')) {
      await sql`UPDATE mentee_stats SET quests_toward_reward = 0 WHERE id = 1`;
      console.log('   ✓ Quests toward reward reset');
    }
    if (existingColumns.includes('rewards_claimed')) {
      await sql`UPDATE mentee_stats SET rewards_claimed = 0 WHERE id = 1`;
      console.log('   ✓ Rewards claimed reset');
    }
    if (existingColumns.includes('last_streak_date')) {
      await sql`UPDATE mentee_stats SET last_streak_date = NULL WHERE id = 1`;
      console.log('   ✓ Last streak date reset');
    }
    if (existingColumns.includes('last_activity_at')) {
      await sql`UPDATE mentee_stats SET last_activity_at = NULL WHERE id = 1`;
      console.log('   ✓ Last activity reset');
    }
    if (existingColumns.includes('first_quest_today')) {
      await sql`UPDATE mentee_stats SET first_quest_today = false WHERE id = 1`;
    }
    if (existingColumns.includes('last_first_quest_date')) {
      await sql`UPDATE mentee_stats SET last_first_quest_date = NULL WHERE id = 1`;
    }
    if (existingColumns.includes('total_bonus_xp')) {
      await sql`UPDATE mentee_stats SET total_bonus_xp = 0 WHERE id = 1`;
    }

    console.log('   ✓ Hero stats reset to 0 XP, Level 1');

    // 7. Reset all quests to default state
    console.log('⚔️  Resetting quest states...');
    try {
      await sql`
        UPDATE quests SET
          is_lucky_quest = false,
          lucky_multiplier = 1.0
      `;
      console.log('   ✓ Lucky quest flags cleared');
    } catch (e) {
      console.log('   ⚠ Lucky quest columns may not exist (ok)');
    }

    // 8. Reorganize quests into tiers
    console.log('\n📦 Reorganizing quests into tiers...');
    
    // Add columns if they don't exist
    try {
      await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS unlock_at_xp INTEGER DEFAULT 0`;
      console.log('   ✓ Added unlock_at_xp column');
    } catch (e) {}
    
    try {
      await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'rookie'`;
      console.log('   ✓ Added tier column');
    } catch (e) {}

    let sortOrder = 1;
    
    for (const [tier, questTitles] of Object.entries(TIER_ASSIGNMENTS)) {
      const xpThreshold = TIER_XP_THRESHOLDS[tier];
      console.log(`\n   ${tier.toUpperCase()} TIER (${xpThreshold} XP):`);
      
      for (const title of questTitles) {
        try {
          const result = await sql`
            UPDATE quests 
            SET unlock_at_xp = ${xpThreshold},
                tier = ${tier},
                is_locked = ${xpThreshold > 0},
                sort_order = ${sortOrder},
                is_active = true
            WHERE title = ${title}
            RETURNING id, title
          `;
          
          if (result.rows.length > 0) {
            console.log(`   ✓ ${title}`);
          } else {
            console.log(`   ⚠ "${title}" not found`);
          }
        } catch (e) {
          console.log(`   ⚠ Error updating "${title}"`);
        }
        sortOrder++;
      }
    }

    // 9. Set a random lucky quest from rookie tier
    console.log('\n🍀 Setting random lucky quest...');
    try {
      await sql`
        UPDATE quests 
        SET is_lucky_quest = true, lucky_multiplier = 1.5
        WHERE id = (
          SELECT id FROM quests 
          WHERE is_active = true AND tier = 'rookie'
          ORDER BY RANDOM() 
          LIMIT 1
        )
      `;
      console.log('   ✓ Lucky quest set');
    } catch (e) {
      console.log('   ⚠ Could not set lucky quest (ok)');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 RESET COMPLETE!\n');
    console.log('📊 Starting State:');
    console.log('   • Hero XP: 0');
    console.log('   • Hero Level: 1');
    console.log('   • Hero Rank: 🌱 ROOKIE');
    console.log('   • Quests Completed: 0');
    console.log('   • Streak: 0 days');
    console.log('   • Unlocked Quests: 4 (ROOKIE tier)');
    console.log('\n💡 Tier unlock thresholds:');
    console.log('   • 🌱 ROOKIE: 0 XP (4 quests)');
    console.log('   • ⚡ APPRENTICE: 500 XP (5 quests)');
    console.log('   • 🔥 PRO: 1500 XP (5 quests)');
    console.log('   • 💎 ELITE: 3500 XP (6 quests)');
    console.log('   • 👑 LEGEND: 7000 XP (5 quests)');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

resetToStartingState();
