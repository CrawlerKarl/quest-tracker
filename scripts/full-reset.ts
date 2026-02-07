import { sql } from '@vercel/postgres';

// All 25 quests with their original data
const QUESTS = [
  {
    title: "Defender Shield Activated",
    description: "Enable and configure Windows Defender to protect your computer from viruses and malware.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 100,
    steps: ["Open Windows Security (search for it in the Start menu)", "Click on 'Virus & threat protection'", "Make sure 'Real-time protection' is turned ON", "Click 'Quick scan' and let it run", "Check that 'Cloud-delivered protection' is ON"],
    why_it_matters: "Windows Defender is your computer's immune system. It constantly watches for viruses, malware, and other threats trying to sneak onto your computer. Keeping it on and updated is your first line of defense.",
    safety_notes: "Never disable Defender because a website or download asks you to - that's a major red flag!",
    evidence_examples: ["Screenshot of Windows Security showing 'Real-time protection: On'", "Screenshot of a completed Quick Scan with results"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Update Champion",
    description: "Check for and install all Windows updates to patch security vulnerabilities.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 100,
    steps: ["Open Settings (Windows + I)", "Click 'Windows Update'", "Click 'Check for updates'", "Install any available updates", "Restart if required", "Check again to confirm you're fully updated"],
    why_it_matters: "Updates fix security holes that hackers exploit. The WannaCry ransomware attack affected millions of computers that hadn't installed a simple update. Stay current, stay safe!",
    safety_notes: "Only update through official Windows Settings, never from pop-ups or emails claiming you need updates.",
    evidence_examples: ["Screenshot showing 'You're up to date'", "Screenshot of recently installed updates list"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Password Fortress",
    description: "Set up a password manager and create your first secure passwords.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Choose a password manager (Bitwarden is free and excellent)", "Create an account with a STRONG master password (ask mentor for help)", "Install the browser extension", "Save at least 3 existing passwords to your vault", "Generate a new secure password for one account"],
    why_it_matters: "Using the same password everywhere means one breach exposes ALL your accounts. A password manager lets you have unique, strong passwords for every site without memorizing them.",
    safety_notes: "Your master password is the ONE password you must memorize. Never share it. Write it down and store it somewhere physical and safe (not on your computer).",
    evidence_examples: ["Screenshot of password manager with browser extension installed (hide actual passwords!)", "Screenshot showing number of saved passwords"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Browser Guardian",
    description: "Set up your browser for safe browsing with security settings and an ad blocker.",
    category: "Browser Safety",
    difficulty: "beginner",
    xp_reward: 150,
    steps: ["Open your browser settings", "Enable 'Safe Browsing' or 'Enhanced Protection'", "Install uBlock Origin extension from the official browser store", "Set your browser to block third-party cookies", "Enable 'Send Do Not Track' requests"],
    why_it_matters: "Malicious ads can install malware or trick you into scams. An ad blocker isn't just about convenience - it's a security tool that blocks dangerous content before it reaches you.",
    safety_notes: "Only install extensions from official browser stores (Chrome Web Store, Firefox Add-ons). Fake extensions can steal your data!",
    evidence_examples: ["Screenshot of Safe Browsing enabled in settings", "Screenshot showing uBlock Origin installed"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Two-Factor Warrior",
    description: "Enable two-factor authentication on your most important accounts.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Start with your email account (most important!)", "Go to account security settings", "Enable two-factor authentication", "Choose authenticator app (preferred) or SMS", "Save backup codes somewhere safe (not on your computer)", "Repeat for at least one more important account"],
    why_it_matters: "2FA means even if someone steals your password, they still can't get in without your phone. It stops the vast majority of hacking attempts.",
    safety_notes: "NEVER share 2FA codes with anyone, even if they claim to be tech support. Real support will never ask for these codes.",
    evidence_examples: ["Screenshot of 2FA enabled in account settings (blur any sensitive info)", "Confirmation that backup codes are saved"],
    tier: "apprentice", unlock_at_xp: 500
  },
  {
    title: "Screenshot Scholar",
    description: "Master the art of taking clear, helpful screenshots.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 75,
    steps: ["Learn Windows + Shift + S for Snipping Tool", "Practice: full screen capture", "Practice: window capture", "Practice: region/selection capture", "Save screenshots with descriptive names", "Learn where screenshots are saved by default"],
    why_it_matters: "Screenshots are essential for getting help with tech problems, documenting your work, and communicating clearly. They're a core digital skill.",
    safety_notes: "Always review screenshots before sharing - make sure they don't show passwords, personal info, or embarrassing browser tabs!",
    evidence_examples: ["Three different types of screenshots you took", "Screenshot showing your organized screenshots folder"],
    tier: "apprentice", unlock_at_xp: 500
  },
  {
    title: "File Organization Rookie",
    description: "Set up a logical folder structure to keep your files organized and findable.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 100,
    steps: ["Open File Explorer", "Create main folders in Documents: School, Personal, Projects, Downloads-Sorted", "Create subfolders as needed (by subject, by year, etc.)", "Move at least 10 existing files into appropriate folders", "Empty or organize your Downloads folder"],
    why_it_matters: "Good organization saves time and reduces stress. You'll always know where things are, and it's easier to back up important files when they're organized.",
    safety_notes: "Be careful not to move or delete system files. Stick to your personal folders (Documents, Pictures, etc.).",
    evidence_examples: ["Screenshot of your new folder structure", "Before/after of an organized folder"],
    tier: "apprentice", unlock_at_xp: 500
  },
  {
    title: "Steam Setup Complete",
    description: "Install Steam safely and configure your account security.",
    category: "Gaming",
    difficulty: "beginner",
    xp_reward: 150,
    steps: ["Download Steam ONLY from store.steampowered.com", "Install Steam", "Create account or log into existing account", "Go to Steam > Settings > Account", "Enable Steam Guard (email or mobile authenticator)", "Set a strong, unique password (use your password manager!)"],
    why_it_matters: "Steam accounts are valuable targets for hackers because of game libraries and trading items. Proper security protects your games and prevents your account from being used for scams.",
    safety_notes: "NEVER click links claiming free games or items - these are almost always scams. Steam will never ask for your password outside the official app/website.",
    evidence_examples: ["Screenshot of Steam Guard enabled in settings", "Screenshot of Steam library (can be empty, just shows setup complete)"],
    tier: "apprentice", unlock_at_xp: 500
  },
  {
    title: "Scam Spotter Training",
    description: "Learn to identify common online scams and phishing attempts.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 150,
    steps: ["Learn the signs of phishing emails (urgency, bad grammar, suspicious links)", "Learn about fake tech support scams", "Learn about 'too good to be true' offers", "Take the Google Phishing Quiz", "Find and screenshot 3 examples of obvious scams (from your spam folder or online)"],
    why_it_matters: "Scams are getting more sophisticated every day. Training your eye to spot red flags is one of the most valuable security skills you can develop.",
    safety_notes: "When in doubt, don't click. Ask your mentor before interacting with anything suspicious. It's better to miss out than to get scammed.",
    evidence_examples: ["Screenshot of your Google Phishing Quiz results", "3 scam examples with notes on what made them suspicious"],
    tier: "apprentice", unlock_at_xp: 500
  },
  {
    title: "Screen Recording Pro",
    description: "Learn to record your screen to document processes or get help.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 100,
    steps: ["Open Xbox Game Bar (Windows + G)", "Find the Capture widget", "Practice starting and stopping a recording", "Record a 30-second video doing something simple", "Find where the recording was saved", "Learn to trim if needed"],
    why_it_matters: "Sometimes a video explains a problem or process better than words or screenshots. This skill helps you document issues and share knowledge.",
    safety_notes: "Screen recordings capture EVERYTHING on screen, including notifications. Close sensitive apps and turn off notifications before recording.",
    evidence_examples: ["Link to a short screen recording you made", "Screenshot of Game Bar capture settings"],
    tier: "pro", unlock_at_xp: 1500
  },
  {
    title: "Steam Privacy Lock",
    description: "Configure Steam privacy settings to control what others can see.",
    category: "Gaming",
    difficulty: "beginner",
    xp_reward: 100,
    steps: ["Open Steam > Settings > Privacy", "Review each privacy setting", "Set profile visibility (recommended: Friends Only)", "Control who can see your game details", "Control who can see your friends list", "Set inventory privacy"],
    why_it_matters: "Privacy settings let you control your digital footprint. You decide who sees what - there's no 'right' setting, just what works for you.",
    safety_notes: "Public profiles can be used to target you for scams. Consider keeping most things Friends Only until you understand the risks.",
    evidence_examples: ["Screenshot of your privacy settings", "Brief note explaining why you chose these settings"],
    tier: "pro", unlock_at_xp: 1500
  },
  {
    title: "Find My Phone Setup",
    description: "Enable device tracking so you can find (or erase) your phone if lost.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 150,
    steps: ["For iPhone: Settings > [Your Name] > Find My > Find My iPhone > Turn ON", "For Android: Settings > Security > Find My Device > Turn ON", "Test it: go to icloud.com/find or google.com/android/find", "Make sure you can see your device on the map", "Note: You need to be signed into iCloud/Google on your phone"],
    why_it_matters: "If your phone is lost or stolen, Find My lets you locate it, make it ring, lock it, or even erase it remotely to protect your data.",
    safety_notes: "This feature requires location services. The security benefit outweighs privacy concerns for most people, but discuss with your mentor.",
    evidence_examples: ["Screenshot of Find My enabled in phone settings", "Screenshot of the web interface showing your device (blur exact location)"],
    tier: "pro", unlock_at_xp: 1500
  },
  {
    title: "Piracy Awareness",
    description: "Understand why piracy is risky and where to find legitimate free content.",
    category: "Digital Citizenship",
    difficulty: "beginner",
    xp_reward: 100,
    steps: ["Research: What is software/media piracy?", "List 3 security risks of downloading pirated content", "List 3 legal free alternatives for games (Epic free games, Game Pass, etc.)", "List 3 legal free alternatives for other media", "Discuss with mentor: How to handle peer pressure around piracy"],
    why_it_matters: "Pirated software is a top source of malware. Even if 'everyone does it,' the security and legal risks aren't worth it when so many legal free options exist.",
    safety_notes: "If a friend shares pirated content, you don't have to use it. 'No thanks, I don't want malware' is a perfectly good reason.",
    evidence_examples: ["Written summary of risks you learned about", "List of legitimate free content sources you found"],
    tier: "pro", unlock_at_xp: 1500
  },
  {
    title: "Backup Basics",
    description: "Set up automatic backups to protect your important files.",
    category: "Digital Skills",
    difficulty: "intermediate",
    xp_reward: 200,
    steps: ["Identify your most important files (documents, photos, projects)", "Set up OneDrive or Google Drive backup", "Enable automatic sync for key folders", "Verify files are syncing correctly", "Learn how to restore a file from backup"],
    why_it_matters: "Hardware fails. Ransomware encrypts. Accidents happen. Backups mean you never lose important work. The 3-2-1 rule: 3 copies, 2 different media, 1 offsite.",
    safety_notes: "Cloud backups sync deletions too! Understand how to recover deleted files within the time window.",
    evidence_examples: ["Screenshot of cloud sync setup", "Screenshot showing files backed up successfully"],
    tier: "pro", unlock_at_xp: 1500
  },
  {
    title: "Standard User Shield",
    description: "Understand the difference between admin and standard accounts, and set up properly.",
    category: "Security",
    difficulty: "intermediate",
    xp_reward: 150,
    steps: ["Open Settings > Accounts", "Check if your account is 'Administrator' or 'Standard'", "Discuss with mentor: should you have admin or standard?", "If needed, create a separate admin account for installations", "Use standard account for daily activities"],
    why_it_matters: "Using a standard account daily limits what malware can do if it gets on your system. It's like having a bouncer that stops unauthorized changes.",
    safety_notes: "Don't share admin credentials. When something asks for admin permission, think carefully about whether it should need that access.",
    evidence_examples: ["Screenshot of account type in Settings", "Brief explanation of your account setup and why"],
    tier: "elite", unlock_at_xp: 3500
  },
  {
    title: "Email Like a Pro",
    description: "Learn professional email etiquette and organization.",
    category: "Digital Skills",
    difficulty: "intermediate",
    xp_reward: 150,
    steps: ["Set up email folders/labels for organization", "Create an email signature", "Write a practice professional email to your mentor", "Learn to use BCC appropriately", "Set up email filters for common senders"],
    why_it_matters: "Email is still the primary professional communication tool. Good email habits make great first impressions and keep you organized.",
    safety_notes: "Never send sensitive information via email - it's not encrypted. Double-check recipients before sending!",
    evidence_examples: ["Screenshot of organized inbox", "Your professional email signature"],
    tier: "elite", unlock_at_xp: 3500
  },
  {
    title: "Privacy Settings Audit",
    description: "Review and tighten privacy settings across your main accounts.",
    category: "Privacy",
    difficulty: "intermediate",
    xp_reward: 200,
    steps: ["Google: myaccount.google.com/privacycheckup", "Social media: review each platform's privacy settings", "Review app permissions on your phone", "Delete unused accounts (or at least secure them)", "Search for yourself online - what comes up?"],
    why_it_matters: "Companies default to collecting maximum data. You have to actively protect your privacy. Regular audits catch changes and new settings.",
    safety_notes: "Some privacy settings affect functionality. Balance privacy with usability based on your needs.",
    evidence_examples: ["Screenshots of tightened privacy settings", "List of accounts deleted or permissions removed"],
    tier: "elite", unlock_at_xp: 3500
  },
  {
    title: "Home Network Basics",
    description: "Understand and secure your home WiFi network.",
    category: "Security",
    difficulty: "intermediate",
    xp_reward: 200,
    steps: ["Find your router's admin page (usually 192.168.1.1 or 192.168.0.1)", "Check that WiFi uses WPA3 or WPA2 (not WEP!)", "Change default admin password if not done", "Check for router firmware updates", "Review connected devices list"],
    why_it_matters: "Your home network is the gateway to all your devices. A compromised router can spy on everything you do online.",
    safety_notes: "Coordinate with parents/guardians before making router changes. Write down passwords before changing them!",
    evidence_examples: ["Screenshot of security settings (blur passwords)", "Confirmation of encryption type used"],
    tier: "elite", unlock_at_xp: 3500
  },
  {
    title: "Research Like a Scholar",
    description: "Develop critical evaluation skills for online information.",
    category: "Digital Literacy",
    difficulty: "intermediate",
    xp_reward: 150,
    steps: ["Learn the CRAAP test (Currency, Relevance, Authority, Accuracy, Purpose)", "Practice evaluating 5 different sources on a topic", "Find a deliberately fake/misleading source and identify red flags", "Learn to use Wikipedia as a starting point, not a citation", "Find primary sources for a claim"],
    why_it_matters: "Misinformation spreads fast. Being able to evaluate sources protects you from false beliefs and helps you make informed decisions.",
    safety_notes: "Even reputable sources can be wrong. Cross-reference important information from multiple reliable sources.",
    evidence_examples: ["CRAAP evaluation of a source", "Example of a misleading source you identified"],
    tier: "elite", unlock_at_xp: 3500
  },
  {
    title: "Ask Before You Act",
    description: "Establish a habit of checking with your mentor before risky actions.",
    category: "Digital Citizenship",
    difficulty: "beginner",
    xp_reward: 75,
    steps: ["Create a mental checklist: 'Should I ask first?'", "Things that need asking: Downloads from new sites, new account signups, sharing personal info, unusual requests", "Practice: Next time you're unsure, actually ask", "Document one real situation where you asked first"],
    why_it_matters: "The best security tool is the pause button. Taking a moment to check prevents most mistakes. Your mentor is here to help, not to judge.",
    safety_notes: "There's no such thing as a stupid question when it comes to online safety. Asking is always the right move when you're uncertain.",
    evidence_examples: ["Written reflection on when you should ask", "Example of a time you asked first (even if the answer was 'yes, that's fine')"],
    tier: "elite", unlock_at_xp: 3500
  },
  {
    title: "Command Line Basics",
    description: "Learn fundamental command line skills for troubleshooting.",
    category: "Technical Skills",
    difficulty: "intermediate",
    xp_reward: 200,
    steps: ["Open Command Prompt or PowerShell", "Learn: dir, cd, mkdir, del (with CAUTION)", "Learn: ipconfig, ping, tracert", "Check your IP address and network info", "Ping a website to test connectivity"],
    why_it_matters: "The command line gives you power and precision that GUIs can't match. It's also essential for many tech careers and troubleshooting.",
    safety_notes: "The command line can delete files permanently with no recycle bin. Always double-check before running destructive commands!",
    evidence_examples: ["Screenshot of successful ping", "Screenshot showing ipconfig output"],
    tier: "legend", unlock_at_xp: 7000
  },
  {
    title: "Encryption Explorer",
    description: "Understand encryption and when to use it.",
    category: "Security",
    difficulty: "advanced",
    xp_reward: 250,
    steps: ["Research: What is encryption? Symmetric vs asymmetric?", "Enable device encryption on your computer (BitLocker/FileVault)", "Understand HTTPS and check for it when browsing", "Learn about end-to-end encryption in messaging", "Explore encrypted messaging apps (Signal)"],
    why_it_matters: "Encryption is the math that keeps your data safe from prying eyes. Understanding it helps you make informed choices about your digital security.",
    safety_notes: "If you lose your encryption keys/passwords, your data is gone forever. Store recovery keys safely!",
    evidence_examples: ["Screenshot of device encryption enabled", "Written explanation of symmetric vs asymmetric encryption"],
    tier: "legend", unlock_at_xp: 7000
  },
  {
    title: "Virtual Machine Sandbox",
    description: "Set up a virtual machine for safe experimentation.",
    category: "Technical Skills",
    difficulty: "advanced",
    xp_reward: 300,
    steps: ["Download VirtualBox (free)", "Download a Linux ISO (Ubuntu recommended)", "Create a new virtual machine", "Install Linux in the VM", "Experiment! It's safe - you can't break your real computer"],
    why_it_matters: "VMs let you test software, explore operating systems, and practice dangerous things safely. They're sandboxes for learning.",
    safety_notes: "VMs use significant RAM and storage. Make sure you have at least 8GB RAM and 25GB free disk space.",
    evidence_examples: ["Screenshot of Linux running in VirtualBox", "Brief notes on something cool you tried in the VM"],
    tier: "legend", unlock_at_xp: 7000
  },
  {
    title: "DNS Deep Dive",
    description: "Understand DNS and configure a secure DNS provider.",
    category: "Security",
    difficulty: "advanced",
    xp_reward: 200,
    steps: ["Research: What is DNS? Why does it matter for privacy/security?", "Learn about DNS-over-HTTPS (DoH)", "Configure your browser to use Cloudflare or Google DNS-over-HTTPS", "Or configure system-wide DNS (discuss with mentor first)", "Test that it's working"],
    why_it_matters: "Your ISP can see every domain you visit through DNS. Encrypted DNS improves privacy and can block malicious domains.",
    safety_notes: "System-wide DNS changes affect your whole network. Start with browser-level changes.",
    evidence_examples: ["Screenshot of DoH configuration", "DNS leak test results"],
    tier: "legend", unlock_at_xp: 7000
  },
  {
    title: "Git Version Control",
    description: "Learn the basics of Git for tracking changes in projects.",
    category: "Technical Skills",
    difficulty: "advanced",
    xp_reward: 300,
    steps: ["Install Git", "Configure your name and email", "Create a repository for a project", "Make commits with meaningful messages", "Learn: status, add, commit, log", "Push to GitHub"],
    why_it_matters: "Git is how professional developers track changes. It's also an excellent backup system and portfolio builder. This skill is career-valuable.",
    safety_notes: "Never commit passwords, API keys, or personal information. Use .gitignore to exclude sensitive files.",
    evidence_examples: ["Link to your GitHub repository", "Screenshot of your commit history"],
    tier: "legend", unlock_at_xp: 7000
  }
];

async function fullReset() {
  console.log('🔄 FULL RESET - RESTORING ALL QUESTS TO ORIGINAL STATE\n');
  console.log('⚠️  This will DELETE all quests and re-create them!\n');

  try {
    // 1. Delete all progress first (foreign key constraint)
    console.log('🗑️  Clearing quest progress...');
    await sql`DELETE FROM quest_progress`;
    console.log('   ✓ Done');

    // 2. Delete reactions
    try {
      await sql`DELETE FROM quest_reactions`;
      console.log('   ✓ Reactions cleared');
    } catch (e) {}

    // 3. Delete activity log
    try {
      await sql`DELETE FROM activity_log`;
      console.log('   ✓ Activity log cleared');
    } catch (e) {}

    // 4. Delete earned badges/achievements
    try { await sql`DELETE FROM earned_badges`; } catch (e) {}
    try { await sql`DELETE FROM earned_achievements`; } catch (e) {}
    console.log('   ✓ Badges/achievements cleared');

    // 5. DELETE ALL QUESTS
    console.log('\n🗑️  Deleting all quests...');
    await sql`DELETE FROM quests`;
    console.log('   ✓ All quests deleted');

    // 6. Ensure columns exist
    console.log('\n🔧 Ensuring columns exist...');
    try { await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'rookie'`; } catch (e) {}
    try { await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS unlock_at_xp INTEGER DEFAULT 0`; } catch (e) {}
    try { await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS is_lucky_quest BOOLEAN DEFAULT false`; } catch (e) {}
    try { await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS lucky_multiplier DECIMAL(3,2) DEFAULT 1.0`; } catch (e) {}
    console.log('   ✓ Columns ready');

    // 7. INSERT ALL QUESTS FRESH
    console.log('\n📜 Re-creating all 25 quests...\n');
    
    let sortOrder = 1;
    for (const quest of QUESTS) {
      await sql`
        INSERT INTO quests (
          title, description, category, difficulty, xp_reward,
          steps, why_it_matters, safety_notes, evidence_examples,
          tier, unlock_at_xp, is_locked, is_active, sort_order,
          is_lucky_quest, lucky_multiplier
        ) VALUES (
          ${quest.title},
          ${quest.description},
          ${quest.category},
          ${quest.difficulty},
          ${quest.xp_reward},
          ${JSON.stringify(quest.steps)},
          ${quest.why_it_matters},
          ${quest.safety_notes},
          ${JSON.stringify(quest.evidence_examples)},
          ${quest.tier},
          ${quest.unlock_at_xp},
          ${quest.unlock_at_xp > 0},
          true,
          ${sortOrder},
          false,
          1.0
        )
      `;
      console.log(`   ✓ ${quest.title} (${quest.tier.toUpperCase()})`);
      sortOrder++;
    }

    // 8. Reset mentee stats
    console.log('\n📊 Resetting Hero stats...');
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
    console.log('   ✓ Hero reset to 0 XP, Level 1');

    // 9. Set random lucky quest
    console.log('\n🍀 Setting lucky quest...');
    await sql`
      UPDATE quests 
      SET is_lucky_quest = true, lucky_multiplier = 1.5
      WHERE id = (SELECT id FROM quests WHERE tier = 'rookie' ORDER BY RANDOM() LIMIT 1)
    `;
    console.log('   ✓ Lucky quest set');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 FULL RESET COMPLETE!\n');
    console.log('📊 All 25 quests restored to original state');
    console.log('📊 Hero: 0 XP, Level 1, ROOKIE rank');
    console.log('\n💡 Quest tiers:');
    console.log('   🌱 ROOKIE (0 XP): 4 quests');
    console.log('   ⚡ APPRENTICE (500 XP): 5 quests');
    console.log('   🔥 PRO (1500 XP): 5 quests');
    console.log('   💎 ELITE (3500 XP): 6 quests');
    console.log('   👑 LEGEND (7000 XP): 5 quests');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

fullReset();
