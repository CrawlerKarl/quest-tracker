import { sql } from '@vercel/postgres';

async function setupBonusAndQuestSystem() {
  console.log('🎮 Setting up CyberQuest with bonus quest and new system...\n');

  try {
    // 1. Add the PC Cleanup Master quest as already completed
    console.log('1️⃣ Adding PC Cleanup Master bonus quest...');
    
    // First, check if it already exists
    const existingQuest = await sql`
      SELECT id FROM quests WHERE title = 'PC Cleanup Master'
    `;
    
    let bonusQuestId: number;
    
    if (existingQuest.rows.length === 0) {
      // Create the bonus quest
      const newQuest = await sql`
        INSERT INTO quests (
          title, 
          description, 
          category, 
          difficulty, 
          xp_reward, 
          steps, 
          why_it_matters, 
          evidence_examples,
          is_active,
          tier,
          sort_order
        ) VALUES (
          'PC Cleanup Master',
          'Clean up your computer by removing unnecessary files, organizing folders, and freeing up disk space. A clean computer runs faster and is easier to use!',
          'Digital Skills',
          'intermediate',
          600,
          ${JSON.stringify([
            'Review and delete files you no longer need',
            'Empty the Recycle Bin / Trash',
            'Organize files into proper folders',
            'Check disk space before and after',
            'Remove unused programs (with mentor approval)'
          ])},
          'A cluttered computer slows you down and makes it hard to find things. Learning to keep your system clean is a lifelong skill that saves time and prevents problems.',
          ${JSON.stringify(['Screenshot of disk space freed', 'Screenshare walkthrough', 'Before/after storage comparison'])},
          true,
          'rookie',
          0
        ) RETURNING id
      `;
      bonusQuestId = newQuest.rows[0].id;
      console.log(`   ✓ Created quest with ID: ${bonusQuestId}`);
    } else {
      bonusQuestId = existingQuest.rows[0].id;
      console.log(`   ✓ Quest already exists with ID: ${bonusQuestId}`);
    }

    // 2. Mark it as completed
    console.log('2️⃣ Marking PC Cleanup Master as completed...');
    
    // Check if progress exists
    const existingProgress = await sql`
      SELECT id FROM quest_progress WHERE quest_id = ${bonusQuestId}
    `;
    
    if (existingProgress.rows.length === 0) {
      await sql`
        INSERT INTO quest_progress (
          quest_id, 
          status, 
          evidence_links,
          reflection,
          mentor_feedback,
          started_at,
          submitted_at,
          completed_at
        ) VALUES (
          ${bonusQuestId},
          'completed',
          ${JSON.stringify(['Completed during live mentor session'])},
          'Learned how to free up space on my computer!',
          'Great job figuring this out together! You freed up a lot of space.',
          NOW(),
          NOW(),
          NOW()
        )
      `;
      console.log('   ✓ Quest marked as completed');
    } else {
      await sql`
        UPDATE quest_progress 
        SET status = 'completed', completed_at = NOW()
        WHERE quest_id = ${bonusQuestId}
      `;
      console.log('   ✓ Quest progress updated to completed');
    }

    // 3. Update mentee stats to include the 600 XP
    console.log('3️⃣ Adding 600 XP ($6) to stats...');
    
    // Get current stats
    const currentStats = await sql`SELECT * FROM mentee_stats WHERE id = 1`;
    
    if (currentStats.rows.length === 0) {
      // Create stats with the bonus XP
      await sql`
        INSERT INTO mentee_stats (id, total_xp, level, quests_completed)
        VALUES (1, 600, 3, 1)
      `;
      console.log('   ✓ Created stats with 600 XP');
    } else {
      // Only add if not already added (check if XP is less than 600)
      const currentXp = currentStats.rows[0].total_xp || 0;
      if (currentXp < 600) {
        await sql`
          UPDATE mentee_stats 
          SET total_xp = 600, 
              quests_completed = quests_completed + 1,
              level = 3
          WHERE id = 1
        `;
        console.log('   ✓ Updated stats to 600 XP');
      } else {
        console.log(`   ✓ Stats already have ${currentXp} XP, keeping current value`);
      }
    }

    // 4. Add 'is_selected' column to quest_progress if not exists
    console.log('4️⃣ Adding is_selected column for 3-quest system...');
    try {
      await sql`ALTER TABLE quest_progress ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false`;
      console.log('   ✓ Added is_selected column');
    } catch (e) {
      console.log('   ✓ is_selected column already exists');
    }

    // 5. Log the activity
    console.log('5️⃣ Logging bonus quest completion...');
    await sql`
      INSERT INTO activity_log (action, quest_id, details)
      VALUES ('quest_approved', ${bonusQuestId}, ${JSON.stringify({ 
        xpAwarded: 600, 
        note: 'Bonus quest completed during live session' 
      })})
    `;
    console.log('   ✓ Activity logged');

    // Summary
    console.log('\n✅ Setup complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Current Status:');
    console.log('   • PC Cleanup Master: COMPLETED ✓');
    console.log('   • XP Earned: 600 ($6.00)');
    console.log('   • Quest system ready for 3-quest limit');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupBonusAndQuestSystem();
