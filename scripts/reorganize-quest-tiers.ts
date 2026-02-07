import { sql } from '@vercel/postgres';

// Quest tier assignments based on XP thresholds
// ROOKIE (0 XP): 4 starter quests - essentials to protect him now
// APPRENTICE (500 XP): 5 quests - building core skills
// PRO (1500 XP): 5 quests - deeper knowledge
// ELITE (3500 XP): 6 quests - power user territory  
// LEGEND (7000 XP): 5 quests - master level challenges

const TIER_ASSIGNMENTS = {
  // ROOKIE TIER (0 XP) - Start with these
  rookie: [
    'Defender Shield Activated',    // Security basics
    'Update Champion',              // Security basics
    'Password Fortress',            // Critical security
    'Browser Guardian',             // Safe browsing
  ],
  
  // APPRENTICE TIER (500 XP) - Building skills
  apprentice: [
    'Two-Factor Warrior',           // Security
    'Screenshot Scholar',           // Digital skill
    'File Organization Rookie',     // Digital skill
    'Steam Setup Complete',         // Gaming (fun!)
    'Scam Spotter Training',        // Security awareness
  ],
  
  // PRO TIER (1500 XP) - Going deeper
  pro: [
    'Screen Recording Pro',         // Digital skill
    'Steam Privacy Lock',           // Gaming/Privacy
    'Find My Phone Setup',          // Security
    'Piracy Awareness',             // Digital citizenship
    'Backup Basics',                // Critical skill
  ],
  
  // ELITE TIER (3500 XP) - Power user
  elite: [
    'Standard User Shield',         // Security
    'Email Like a Pro',             // Digital skill
    'Privacy Settings Audit',       // Privacy
    'Home Network Basics',          // Security
    'Research Like a Scholar',      // Digital literacy
    'Ask Before You Act',           // Good habits
  ],
  
  // LEGEND TIER (7000 XP) - Master challenges
  legend: [
    'Command Line Basics',          // Technical
    'Encryption Explorer',          // Advanced security
    'Virtual Machine Sandbox',      // Technical
    'DNS Deep Dive',                // Advanced
    'Git Version Control',          // Technical
  ],
};

const TIER_XP_THRESHOLDS = {
  rookie: 0,
  apprentice: 500,
  pro: 1500,
  elite: 3500,
  legend: 7000,
};

async function reorganizeQuestTiers() {
  console.log('🎮 Reorganizing quests into XP-based tiers...\n');

  try {
    // Add unlock_at_xp column if not exists
    await sql`
      ALTER TABLE quests 
      ADD COLUMN IF NOT EXISTS unlock_at_xp INTEGER DEFAULT 0
    `;
    console.log('✅ Added unlock_at_xp column');

    // Add tier column for easy reference
    await sql`
      ALTER TABLE quests 
      ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'rookie'
    `;
    console.log('✅ Added tier column');

    // Reset all locks first
    await sql`UPDATE quests SET is_locked = true, unlocks_after = '[]'`;
    
    let sortOrder = 1;
    
    // Process each tier
    for (const [tier, questTitles] of Object.entries(TIER_ASSIGNMENTS)) {
      const xpThreshold = TIER_XP_THRESHOLDS[tier as keyof typeof TIER_XP_THRESHOLDS];
      console.log(`\n📦 ${tier.toUpperCase()} TIER (${xpThreshold} XP):`);
      
      for (const title of questTitles) {
        const result = await sql`
          UPDATE quests 
          SET unlock_at_xp = ${xpThreshold},
              tier = ${tier},
              is_locked = ${xpThreshold > 0},
              sort_order = ${sortOrder},
              unlocks_after = '[]'
          WHERE title = ${title}
          RETURNING id, title
        `;
        
        if (result.rows.length > 0) {
          console.log(`   ✓ ${title} (${xpThreshold > 0 ? 'locked' : 'unlocked'})`);
        } else {
          console.log(`   ⚠ "${title}" not found in database`);
        }
        sortOrder++;
      }
    }

    // Count quests per tier
    console.log('\n📊 Tier Summary:');
    for (const tier of Object.keys(TIER_ASSIGNMENTS)) {
      const count = await sql`SELECT COUNT(*) as count FROM quests WHERE tier = ${tier}`;
      const xp = TIER_XP_THRESHOLDS[tier as keyof typeof TIER_XP_THRESHOLDS];
      console.log(`   ${tier.toUpperCase()}: ${count.rows[0].count} quests (unlocks at ${xp} XP)`);
    }

    console.log('\n🎉 Quest tiers reorganized successfully!');
    console.log('\n💡 How it works:');
    console.log('   • Quests unlock when Hero reaches the XP threshold');
    console.log('   • Within each tier, Hero can complete quests in any order');
    console.log('   • "New Unlocks" celebration when reaching a new tier');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

reorganizeQuestTiers();
