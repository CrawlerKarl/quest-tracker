/**
 * fix-xp-totals.ts
 * 
 * Updates:
 * 1. PC Cleanup Master quest xp_reward: 600 → 650
 * 2. mentee_stats total_xp: → 1000 (650 + 200 + 150)
 * 3. mentee_stats level: recalculated for 1000 XP
 * 4. quests_completed: 3
 * 
 * Run with:
 *   npx dotenv -e .env.local -- npx tsx scripts/fix-xp-totals.ts
 */

import { sql } from '@vercel/postgres';

function calculateLevel(totalXp: number): number {
  if (totalXp < 100) return 1;
  if (totalXp < 250) return 2;
  if (totalXp < 500) return 3;
  if (totalXp < 1000) return 4;
  if (totalXp < 1750) return 5;
  if (totalXp < 2750) return 6;
  if (totalXp < 4000) return 7;
  if (totalXp < 5500) return 8;
  if (totalXp < 7500) return 9;
  if (totalXp < 10000) return 10;
  return 10 + Math.floor((totalXp - 10000) / 3000);
}

async function main() {
  console.log('=== Fixing XP Totals ===\n');

  // 1. Update PC Cleanup Master quest XP from 600 to 650
  const questUpdate = await sql`
    UPDATE quests 
    SET xp_reward = 650 
    WHERE title = 'PC Cleanup Master'
    RETURNING id, title, xp_reward;
  `;
  
  if (questUpdate.rows.length > 0) {
    console.log(`✅ Updated "${questUpdate.rows[0].title}" to ${questUpdate.rows[0].xp_reward} XP`);
  } else {
    console.log('⚠️  PC Cleanup Master quest not found - trying case-insensitive search...');
    const fuzzy = await sql`
      UPDATE quests 
      SET xp_reward = 650 
      WHERE LOWER(title) LIKE '%pc cleanup%'
      RETURNING id, title, xp_reward;
    `;
    if (fuzzy.rows.length > 0) {
      console.log(`✅ Updated "${fuzzy.rows[0].title}" to ${fuzzy.rows[0].xp_reward} XP`);
    } else {
      console.log('❌ Could not find PC Cleanup quest!');
    }
  }

  // 2. Update mentee_stats: total_xp = 1000, level for 1000 XP, quests_completed = 3
  const newXp = 1000;
  const newLevel = calculateLevel(newXp);
  
  const statsUpdate = await sql`
    UPDATE mentee_stats 
    SET total_xp = ${newXp},
        level = ${newLevel},
        quests_completed = 3
    WHERE id = 1
    RETURNING total_xp, level, quests_completed;
  `;

  if (statsUpdate.rows.length > 0) {
    const s = statsUpdate.rows[0];
    console.log(`✅ Stats updated: ${s.total_xp} XP, Level ${s.level}, ${s.quests_completed} quests completed`);
    console.log(`✅ Reward: $${s.total_xp / 100}`);
  } else {
    console.log('❌ Could not update mentee_stats!');
  }

  // 3. Verify completed quest progress entries
  const completedProgress = await sql`
    SELECT qp.quest_id, q.title, q.xp_reward, qp.status
    FROM quest_progress qp
    JOIN quests q ON q.id = qp.quest_id
    WHERE qp.status = 'completed'
    ORDER BY qp.completed_at;
  `;

  console.log(`\n📋 Completed quests in database:`);
  let totalFromQuests = 0;
  for (const row of completedProgress.rows) {
    console.log(`   ${row.title}: ${row.xp_reward} XP (${row.status})`);
    totalFromQuests += row.xp_reward;
  }
  console.log(`   Total from completed quests: ${totalFromQuests} XP`);
  
  if (totalFromQuests !== newXp) {
    console.log(`\n⚠️  Note: Quest XP sum (${totalFromQuests}) differs from total_xp (${newXp}).`);
    console.log(`   This is OK if some XP came from bonuses/spins, or if quest progress entries need updating.`);
  }

  console.log('\n=== Done! ===');
  console.log('Deploy with: git add . ; git commit -m "Fix XP totals: 1000 XP, $10 reward" ; git push');
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
