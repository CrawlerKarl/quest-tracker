import { sql } from '@vercel/postgres';

/*
 * CYBERQUEST 2.0 - 50 Quests with Scaled Rewards
 * 
 * REWARD SYSTEM: $1 per 100 XP
 * - 5 easy quests ≈ $10 (200 XP each = 1000 XP = $10)
 * - Scales up as quests get harder
 * 
 * XP GUIDE:
 * - ⭐ Beginner: 150-250 XP
 * - ⭐⭐ Intermediate: 250-400 XP  
 * - ⭐⭐⭐ Advanced: 400-600 XP
 * 
 * TIERS:
 * - 🌱 ROOKIE (0 XP): 8 quests - First steps, immediate protection
 * - ⚡ APPRENTICE (1000 XP): 10 quests - Building core skills
 * - 🔥 PRO (3000 XP): 12 quests - Going deeper, more independence
 * - 💎 ELITE (6000 XP): 12 quests - Power user territory
 * - 👑 LEGEND (10000 XP): 8 quests - Master challenges
 */

const QUESTS = [
  // ============================================
  // 🌱 ROOKIE TIER (0 XP) - 8 Quests
  // First steps - protect him NOW
  // ============================================
  {
    title: "Defender Shield Activated",
    description: "Enable and configure Windows Defender to protect your computer from viruses and malware.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Open Windows Security (search for it in the Start menu)", "Click on 'Virus & threat protection'", "Make sure 'Real-time protection' is turned ON", "Click 'Quick scan' and let it run", "Check that 'Cloud-delivered protection' is ON"],
    why_it_matters: "Windows Defender is your computer's immune system. It constantly watches for viruses, malware, and other threats trying to sneak onto your computer.",
    safety_notes: "Never disable Defender because a website or download asks you to - that's a major red flag!",
    evidence_examples: ["📺 SCREENSHARE: Show me Windows Security with Real-time protection ON", "📺 SCREENSHARE: Walk me through running a Quick Scan"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Update Champion",
    description: "Check for and install all Windows updates to patch security vulnerabilities.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Open Settings (Windows + I)", "Click 'Windows Update'", "Click 'Check for updates'", "Install any available updates", "Restart if required", "Check again to confirm you're fully updated"],
    why_it_matters: "Updates fix security holes that hackers exploit. The WannaCry ransomware attack affected millions of computers that hadn't installed a simple update.",
    safety_notes: "Only update through official Windows Settings, never from pop-ups or emails claiming you need updates.",
    evidence_examples: ["📺 SCREENSHARE: Show me Windows Update saying 'You're up to date'", "📺 SCREENSHARE: Show me the recently installed updates list"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Password Fortress",
    description: "Set up a password manager and create your first secure passwords.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 250,
    steps: ["Choose a password manager (Bitwarden is free and excellent)", "Create an account with a STRONG master password (ask mentor for help)", "Install the browser extension", "Save at least 3 existing passwords to your vault", "Generate a new secure password for one account"],
    why_it_matters: "Using the same password everywhere means one breach exposes ALL your accounts. A password manager lets you have unique, strong passwords for every site.",
    safety_notes: "Your master password is the ONE password you must memorize. Never share it. Write it down and store it somewhere physical and safe.",
    evidence_examples: ["📺 SCREENSHARE: Show me your password manager with the browser extension (hide passwords!)", "📺 SCREENSHARE: Demo generating a new secure password"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Browser Guardian",
    description: "Set up your browser for safe browsing with security settings and an ad blocker.",
    category: "Browser Safety",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Open your browser settings", "Enable 'Safe Browsing' or 'Enhanced Protection'", "Install uBlock Origin extension from the official browser store", "Set your browser to block third-party cookies", "Enable 'Send Do Not Track' requests"],
    why_it_matters: "Malicious ads can install malware or trick you into scams. An ad blocker isn't just about convenience - it's a security tool.",
    safety_notes: "Only install extensions from official browser stores (Chrome Web Store, Firefox Add-ons). Fake extensions can steal your data!",
    evidence_examples: ["📺 SCREENSHARE: Show me Safe Browsing enabled in your browser settings", "📺 SCREENSHARE: Show me uBlock Origin blocking ads on a website"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Screenshot Scholar",
    description: "Master the art of taking clear, helpful screenshots.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 150,
    steps: ["Learn Windows + Shift + S for Snipping Tool", "Practice: full screen capture", "Practice: window capture", "Practice: region/selection capture", "Save screenshots with descriptive names", "Learn where screenshots are saved by default"],
    why_it_matters: "Screenshots are essential for getting help with tech problems, documenting your work, and communicating clearly. They're a core digital skill.",
    safety_notes: "Always review screenshots before sharing - make sure they don't show passwords, personal info, or embarrassing browser tabs!",
    evidence_examples: ["📺 SCREENSHARE: Demo all 3 screenshot types (full, window, region) live", "📺 SCREENSHARE: Show me your organized screenshots folder"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Steam Setup Complete",
    description: "Install Steam safely and configure your account security.",
    category: "Gaming",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Download Steam ONLY from store.steampowered.com", "Install Steam", "Create account or log into existing account", "Go to Steam > Settings > Account", "Enable Steam Guard (email or mobile authenticator)", "Set a strong, unique password (use your password manager!)"],
    why_it_matters: "Steam accounts are valuable targets for hackers because of game libraries and trading items. Proper security protects your games.",
    safety_notes: "NEVER click links claiming free games or items - these are almost always scams.",
    evidence_examples: ["📺 SCREENSHARE: Show me Steam Guard enabled in your settings", "📺 SCREENSHARE: Give me a tour of your Steam setup"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Keyboard Ninja: Level 1",
    description: "Learn essential keyboard shortcuts to work faster and smarter.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 150,
    steps: ["Learn and practice: Ctrl+C (copy), Ctrl+V (paste), Ctrl+Z (undo)", "Learn: Ctrl+A (select all), Ctrl+S (save)", "Learn: Alt+Tab (switch windows), Win+D (show desktop)", "Practice using these shortcuts for 15 minutes", "Try to go a full hour using shortcuts instead of right-clicking"],
    why_it_matters: "Keyboard shortcuts make you dramatically faster. Pro users rarely touch the mouse for common tasks.",
    safety_notes: "Be careful with Ctrl+Z in some programs - you can't always undo everything!",
    evidence_examples: ["📺 SCREENSHARE: Demo at least 8 shortcuts live while I watch", "📺 SCREENSHARE: Complete a task (copy text, switch apps, etc.) using only keyboard"],
    tier: "rookie", unlock_at_xp: 0
  },
  {
    title: "Scam Spotter Training",
    description: "Learn to identify common online scams and phishing attempts.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Learn the signs of phishing emails (urgency, bad grammar, suspicious links)", "Learn about fake tech support scams", "Learn about 'too good to be true' offers", "Take the Google Phishing Quiz", "Find 3 examples of obvious scams"],
    why_it_matters: "Scams are getting more sophisticated every day. Training your eye to spot red flags is one of the most valuable security skills.",
    safety_notes: "When in doubt, don't click. Ask your mentor before interacting with anything suspicious.",
    evidence_examples: ["📺 SCREENSHARE: Show me your Google Phishing Quiz results", "📺 SCREENSHARE: Walk me through 3 scam examples and explain the red flags"],
    tier: "rookie", unlock_at_xp: 0
  },

  // ============================================
  // ⚡ APPRENTICE TIER (1000 XP) - 10 Quests
  // Building core skills
  // ============================================
  {
    title: "Two-Factor Warrior",
    description: "Enable two-factor authentication on your most important accounts.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 250,
    steps: ["Start with your email account (most important!)", "Go to account security settings", "Enable two-factor authentication", "Choose authenticator app (preferred) or SMS", "Save backup codes somewhere safe", "Repeat for at least one more important account"],
    why_it_matters: "2FA means even if someone steals your password, they still can't get in without your phone. It stops the vast majority of hacking attempts.",
    safety_notes: "NEVER share 2FA codes with anyone, even if they claim to be tech support.",
    evidence_examples: ["📺 SCREENSHARE: Show me 2FA enabled on your email account", "📺 SCREENSHARE: Show me where you saved your backup codes"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "File Organization Rookie",
    description: "Set up a logical folder structure to keep your files organized and findable.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Open File Explorer", "Create main folders in Documents: School, Personal, Projects, Downloads-Sorted", "Create subfolders as needed (by subject, by year, etc.)", "Move at least 10 existing files into appropriate folders", "Empty or organize your Downloads folder"],
    why_it_matters: "Good organization saves time and reduces stress. You'll always know where things are.",
    safety_notes: "Be careful not to move or delete system files. Stick to your personal folders.",
    evidence_examples: ["📺 SCREENSHARE: Give me a tour of your new folder structure", "📺 SCREENSHARE: Show me your cleaned-up Downloads folder"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "Screen Recording Pro",
    description: "Learn to record your screen to document processes or get help.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Open Xbox Game Bar (Windows + G)", "Find the Capture widget", "Practice starting and stopping a recording", "Record a 30-second video doing something simple", "Find where the recording was saved", "Learn to trim if needed"],
    why_it_matters: "Sometimes a video explains a problem or process better than words. This skill helps you document issues and share knowledge.",
    safety_notes: "Screen recordings capture EVERYTHING on screen, including notifications. Close sensitive apps first.",
    evidence_examples: ["📺 SCREENSHARE: Demo starting and stopping a recording live", "📺 SCREENSHARE: Show me a recording you made and where it's saved"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "Steam Privacy Lock",
    description: "Configure Steam privacy settings to control what others can see.",
    category: "Gaming",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Open Steam > Settings > Privacy", "Review each privacy setting", "Set profile visibility (recommended: Friends Only)", "Control who can see your game details", "Control who can see your friends list", "Set inventory privacy"],
    why_it_matters: "Privacy settings let you control your digital footprint. You decide who sees what.",
    safety_notes: "Public profiles can be used to target you for scams. Consider keeping most things Friends Only.",
    evidence_examples: ["📺 SCREENSHARE: Walk me through each of your Steam privacy settings", "📺 SCREENSHARE: Explain why you chose these settings"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "Keyboard Ninja: Level 2",
    description: "Master browser and advanced navigation shortcuts.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Learn: Ctrl+T (new tab), Ctrl+W (close tab), Ctrl+Shift+T (reopen closed tab)", "Learn: Ctrl+L (address bar), Ctrl+F (find)", "Learn: Ctrl+Tab (next tab), Ctrl+Shift+Tab (previous tab)", "Learn: F5 (refresh), Ctrl+Click (open link in new tab)", "Use only keyboard shortcuts for 30 minutes of browsing"],
    why_it_matters: "Browser shortcuts are game-changers. You'll be amazed how much faster you can navigate.",
    safety_notes: "None - practice away!",
    evidence_examples: ["📺 SCREENSHARE: Demo all browser shortcuts while navigating the web", "📺 SCREENSHARE: Browse for 2 minutes using only keyboard - no mouse!"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "Find My Device Setup",
    description: "Enable device tracking so you can find (or erase) your devices if lost.",
    category: "Security",
    difficulty: "beginner",
    xp_reward: 250,
    steps: ["For phone: Enable Find My iPhone or Find My Device (Android)", "Test it: go to icloud.com/find or google.com/android/find", "For Windows: Settings > Update & Security > Find My Device", "Make sure you can see your devices on a map", "Learn how to remotely lock or erase"],
    why_it_matters: "If your device is lost or stolen, Find My lets you locate it, make it ring, lock it, or even erase it remotely.",
    safety_notes: "This requires location services. The security benefit outweighs privacy concerns for most people.",
    evidence_examples: ["📺 SCREENSHARE: Show me Find My enabled on your phone settings", "📺 SCREENSHARE: Show me the web interface with your device on the map (blur exact location)"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "Discord Safety Setup",
    description: "Configure Discord for safe and private communication.",
    category: "Gaming",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Open Discord Settings > Privacy & Safety", "Enable 'Keep me safe' for DM scanning", "Disable 'Allow direct messages from server members' (or set carefully)", "Review 'Who can add you as a friend'", "Enable 2FA on your Discord account", "Review your servers and leave any sketchy ones"],
    why_it_matters: "Discord is great for gaming communities but also attracts scammers and inappropriate content. Good settings keep you safe.",
    safety_notes: "Never click links from strangers. Free Nitro offers are ALWAYS scams.",
    evidence_examples: ["📺 SCREENSHARE: Walk me through all your Privacy & Safety settings", "📺 SCREENSHARE: Show me 2FA is enabled on your Discord"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "Piracy Awareness",
    description: "Understand why piracy is risky and where to find legitimate free content.",
    category: "Digital Citizenship",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Research: What is software/media piracy?", "List 3 security risks of downloading pirated content", "List 3 legal free alternatives for games (Epic free games, Game Pass, etc.)", "List 3 legal free alternatives for other media", "Discuss with mentor: How to handle peer pressure around piracy"],
    why_it_matters: "Pirated software is a top source of malware. Legal free options are everywhere now.",
    safety_notes: "If a friend shares pirated content, you don't have to use it.",
    evidence_examples: ["📺 SCREENSHARE: Show me 3 legal free game sources and explain them", "📝 Written summary of piracy risks we can discuss together"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "Email Like a Pro: Level 1",
    description: "Set up and organize your email like a professional.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Set up email folders/labels: School, Gaming, Shopping, Important", "Create an email signature with your name", "Unsubscribe from 5+ newsletters you don't read", "Set up a filter to auto-sort one type of email", "Archive old emails to clean your inbox"],
    why_it_matters: "Email is still the primary professional communication tool. Good habits start now.",
    safety_notes: "Never send sensitive information via email - it's not encrypted.",
    evidence_examples: ["📺 SCREENSHARE: Give me a tour of your organized inbox", "📺 SCREENSHARE: Show me how your email filter works"],
    tier: "apprentice", unlock_at_xp: 1000
  },
  {
    title: "Google Power User: Level 1",
    description: "Learn to search smarter with Google search operators.",
    category: "Digital Skills",
    difficulty: "beginner",
    xp_reward: 200,
    steps: ["Learn: quotes for exact phrases (\"exact match\")", "Learn: minus to exclude words (dogs -puppies)", "Learn: site: to search specific sites (site:reddit.com)", "Learn: filetype: to find specific files (filetype:pdf)", "Find something useful using 3 different operators"],
    why_it_matters: "Most people only use basic Google. Power users find exactly what they need in seconds.",
    safety_notes: "Be cautious clicking results from unknown sites, even in Google.",
    evidence_examples: ["📺 SCREENSHARE: Demo each search operator live and show results", "📺 SCREENSHARE: Find something specific using operators that you couldn't find normally"],
    tier: "apprentice", unlock_at_xp: 1000
  },

  // ============================================
  // 🔥 PRO TIER (3000 XP) - 12 Quests
  // Going deeper
  // ============================================
  {
    title: "Backup Basics",
    description: "Set up automatic backups to protect your important files.",
    category: "Digital Skills",
    difficulty: "intermediate",
    xp_reward: 300,
    steps: ["Identify your most important files (documents, photos, projects)", "Set up OneDrive or Google Drive backup", "Enable automatic sync for key folders", "Verify files are syncing correctly", "Learn how to restore a file from backup"],
    why_it_matters: "Hardware fails. Ransomware encrypts. Accidents happen. Backups mean you never lose important work.",
    safety_notes: "Cloud backups sync deletions too! Understand how to recover deleted files.",
    evidence_examples: ["📺 SCREENSHARE: Show me your cloud backup setup and synced files", "📺 SCREENSHARE: Demo restoring a file from backup"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Privacy Settings Audit",
    description: "Review and tighten privacy settings across your main accounts.",
    category: "Privacy",
    difficulty: "intermediate",
    xp_reward: 350,
    steps: ["Google: myaccount.google.com/privacycheckup", "Social media: review each platform's privacy settings", "Review app permissions on your phone", "Delete unused accounts (or at least secure them)", "Search for yourself online - what comes up?"],
    why_it_matters: "Companies default to collecting maximum data. You have to actively protect your privacy.",
    safety_notes: "Some privacy settings affect functionality. Balance privacy with usability.",
    evidence_examples: ["📺 SCREENSHARE: Walk me through Google Privacy Checkup", "📺 SCREENSHARE: Show me your tightened social media settings"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Home Network Basics",
    description: "Understand and secure your home WiFi network.",
    category: "Security",
    difficulty: "intermediate",
    xp_reward: 350,
    steps: ["Find your router's admin page (usually 192.168.1.1 or 192.168.0.1)", "Check that WiFi uses WPA3 or WPA2 (not WEP!)", "Change default admin password if not done", "Check for router firmware updates", "Review connected devices list"],
    why_it_matters: "Your home network is the gateway to all your devices. A compromised router can spy on everything.",
    safety_notes: "Coordinate with parents/guardians before making router changes.",
    evidence_examples: ["📺 SCREENSHARE: Show me your router's security settings (blur passwords)", "📺 SCREENSHARE: Show me the connected devices list and identify each one"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Research Like a Scholar",
    description: "Develop critical evaluation skills for online information.",
    category: "Digital Literacy",
    difficulty: "intermediate",
    xp_reward: 300,
    steps: ["Learn the CRAAP test (Currency, Relevance, Authority, Accuracy, Purpose)", "Practice evaluating 5 different sources on a topic", "Find a deliberately fake/misleading source and identify red flags", "Learn to use Wikipedia as a starting point, not a citation", "Find primary sources for a claim"],
    why_it_matters: "Misinformation spreads fast. Being able to evaluate sources protects you from false beliefs.",
    safety_notes: "Even reputable sources can be wrong. Cross-reference important information.",
    evidence_examples: ["📺 SCREENSHARE: Walk me through evaluating a source using CRAAP", "📺 SCREENSHARE: Show me a fake/misleading source and explain the red flags"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Photo Editing Basics",
    description: "Learn essential photo editing skills for better images.",
    category: "Creative",
    difficulty: "intermediate",
    xp_reward: 300,
    steps: ["Download a free editor (Photopea.com works online, or GIMP)", "Learn to crop and resize images", "Learn to adjust brightness and contrast", "Learn to remove red-eye or blemishes", "Edit 3 photos and compare before/after"],
    why_it_matters: "Basic photo editing is useful for school projects, social media, and documenting your work.",
    safety_notes: "Don't edit photos to deceive or manipulate others.",
    evidence_examples: ["📺 SCREENSHARE: Demo cropping, resizing, and adjusting a photo live", "📺 SCREENSHARE: Show me before/after of a photo you edited"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Spreadsheet Starter",
    description: "Learn the basics of spreadsheets - a superpower skill.",
    category: "Digital Skills",
    difficulty: "intermediate",
    xp_reward: 350,
    steps: ["Open Google Sheets or Excel", "Create a simple budget tracker with categories", "Learn to use SUM to add up numbers", "Learn to use AVERAGE", "Sort and filter your data", "Create a simple chart from your data"],
    why_it_matters: "Spreadsheets are used everywhere - budgeting, tracking, analyzing. This skill will serve you forever.",
    safety_notes: "Don't put sensitive personal data in shared spreadsheets.",
    evidence_examples: ["📺 SCREENSHARE: Show me your budget tracker with working formulas", "📺 SCREENSHARE: Demo creating a chart from your data"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "YouTube Creator: Level 1",
    description: "Set up a YouTube channel properly with privacy and security.",
    category: "Creative",
    difficulty: "intermediate",
    xp_reward: 300,
    steps: ["Create or access your YouTube channel", "Set up channel branding (name, profile pic)", "Review privacy settings for your channel", "Understand the difference between Public, Unlisted, Private", "Upload a short test video as Unlisted", "Learn about YouTube's Community Guidelines"],
    why_it_matters: "Understanding YouTube as a creator teaches you about content, privacy, and digital footprint.",
    safety_notes: "Never share personal info in videos. Think before making anything Public.",
    evidence_examples: ["📺 SCREENSHARE: Give me a tour of your channel settings", "📺 SCREENSHARE: Show me your test video and explain Public vs Unlisted vs Private"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Task Manager Master",
    description: "Learn to use Task Manager to monitor and control your PC.",
    category: "Technical Skills",
    difficulty: "intermediate",
    xp_reward: 300,
    steps: ["Open Task Manager (Ctrl+Shift+Esc)", "Understand the Processes tab - what's using CPU/memory?", "Identify normal Windows processes vs. suspicious ones", "Learn to end unresponsive programs", "Explore the Startup tab - disable unnecessary startup programs", "Check the Performance tab during normal use"],
    why_it_matters: "Task Manager helps you understand what your computer is doing, fix problems, and spot suspicious activity.",
    safety_notes: "Don't end processes unless you know what they are. Some are critical!",
    evidence_examples: ["📺 SCREENSHARE: Give me a tour of Task Manager - explain what's running", "📺 SCREENSHARE: Show me the Startup tab and what you disabled"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Typing Speed Challenge",
    description: "Improve your typing speed and accuracy.",
    category: "Digital Skills",
    difficulty: "intermediate",
    xp_reward: 250,
    steps: ["Take a typing test at typing.com or keybr.com", "Record your starting WPM (words per minute)", "Practice for at least 30 minutes total", "Focus on accuracy over speed", "Take the test again and compare"],
    why_it_matters: "Faster typing = faster everything on a computer. It's a foundational skill.",
    safety_notes: "Take breaks to avoid hand strain.",
    evidence_examples: ["📺 SCREENSHARE: Take a typing test live and show me your WPM", "📺 SCREENSHARE: Compare your before/after scores"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "AI Assistant Basics",
    description: "Learn to use AI assistants effectively and responsibly.",
    category: "Digital Skills",
    difficulty: "intermediate",
    xp_reward: 350,
    steps: ["Try different AI assistants (Claude, ChatGPT, etc.)", "Practice writing clear, specific prompts", "Ask it to explain something you're learning", "Ask it to help brainstorm ideas for a project", "Understand limitations: AI can be wrong, don't share personal info", "Learn when AI is helpful vs. when to use other sources"],
    why_it_matters: "AI tools are becoming essential. Learning to use them well gives you a huge advantage.",
    safety_notes: "Never share personal info with AI. Don't trust AI for medical/legal/safety advice. Always verify important facts.",
    evidence_examples: ["📺 SCREENSHARE: Show me a conversation where you used good prompting", "📺 SCREENSHARE: Demo asking AI to help with something and evaluating its answer"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Email Like a Pro: Level 2",
    description: "Write professional emails that get results.",
    category: "Digital Skills",
    difficulty: "intermediate",
    xp_reward: 300,
    steps: ["Learn the structure: greeting, purpose, details, action, closing", "Write a practice email requesting something politely", "Write a practice email following up on something", "Learn to use BCC appropriately", "Practice proofreading before sending"],
    why_it_matters: "Good emails make great impressions. Bad emails can cost opportunities.",
    safety_notes: "Double-check recipients before sending anything sensitive!",
    evidence_examples: ["📺 SCREENSHARE: Show me two professional emails you drafted", "📺 SCREENSHARE: Walk me through how you structured them"],
    tier: "pro", unlock_at_xp: 3000
  },
  {
    title: "Gaming PC Optimization",
    description: "Optimize your PC for better gaming performance.",
    category: "Gaming",
    difficulty: "intermediate",
    xp_reward: 350,
    steps: ["Close background programs before gaming", "Update your graphics drivers", "Learn about in-game graphics settings (resolution, FPS, etc.)", "Disable unnecessary visual effects in Windows", "Monitor your temps and FPS while gaming", "Clear temporary files and disk space"],
    why_it_matters: "A well-optimized PC runs games better without spending money on upgrades.",
    safety_notes: "Don't download 'optimization' software from random sites - most are scams or malware.",
    evidence_examples: ["📺 SCREENSHARE: Show me your optimization steps and settings", "📺 SCREENSHARE: Demo checking FPS and temps in a game"],
    tier: "pro", unlock_at_xp: 3000
  },

  // ============================================
  // 💎 ELITE TIER (6000 XP) - 12 Quests
  // Power user territory
  // ============================================
  {
    title: "Command Line Basics",
    description: "Learn fundamental command line skills for troubleshooting.",
    category: "Technical Skills",
    difficulty: "intermediate",
    xp_reward: 400,
    steps: ["Open Command Prompt or PowerShell", "Learn: dir, cd, mkdir (directory commands)", "Learn: ipconfig (see your network info)", "Learn: ping (test internet connectivity)", "Check your IP address", "Ping google.com to test your connection"],
    why_it_matters: "The command line gives you power and precision that GUIs can't match. Essential for tech careers.",
    safety_notes: "Don't run commands you don't understand. Never use del or format without being 100% sure.",
    evidence_examples: ["📺 SCREENSHARE: Demo ping and ipconfig commands live", "📺 SCREENSHARE: Explain what the output means"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Command Line: Level 2",
    description: "Master more powerful command line tools.",
    category: "Technical Skills",
    difficulty: "advanced",
    xp_reward: 450,
    steps: ["Learn: tracert (trace route to a server)", "Learn: netstat (see network connections)", "Learn: tasklist and taskkill (process management)", "Learn: systeminfo (system details)", "Use sfc /scannow to check system files (run as admin)", "Create a batch file that runs multiple commands"],
    why_it_matters: "These commands let you diagnose problems that stump most users.",
    safety_notes: "Some commands need admin rights. Be careful with taskkill.",
    evidence_examples: ["📺 SCREENSHARE: Run tracert and explain the results", "📺 SCREENSHARE: Show me your batch file and run it"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Standard User Shield",
    description: "Understand the difference between admin and standard accounts.",
    category: "Security",
    difficulty: "intermediate",
    xp_reward: 350,
    steps: ["Open Settings > Accounts", "Check if your account is 'Administrator' or 'Standard'", "Discuss with mentor: should you have admin or standard?", "Understand why standard is safer for daily use", "Learn what triggers admin prompts"],
    why_it_matters: "Using a standard account daily limits what malware can do if it gets on your system.",
    safety_notes: "Don't share admin credentials.",
    evidence_examples: ["📺 SCREENSHARE: Show me your account type and explain your setup", "📺 SCREENSHARE: Demo what happens when an app needs admin rights"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "VPN Explorer",
    description: "Understand what VPNs do (and don't do) and try one out.",
    category: "Privacy",
    difficulty: "intermediate",
    xp_reward: 400,
    steps: ["Research: What is a VPN? What does it actually protect?", "Learn what VPNs DON'T do (they're not magic privacy shields)", "Find a reputable free VPN (ProtonVPN free tier)", "Install and connect to a VPN", "Check your IP before and after (whatismyip.com)", "Understand when to use a VPN"],
    why_it_matters: "VPNs are useful tools but widely misunderstood. Knowing the truth helps you make smart choices.",
    safety_notes: "Free VPNs often sell your data. Only use reputable ones. VPNs don't make you anonymous.",
    evidence_examples: ["📺 SCREENSHARE: Show me your IP before and after connecting to VPN", "📺 SCREENSHARE: Explain what VPNs actually protect and what they don't"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Spreadsheet Power User",
    description: "Master advanced spreadsheet features.",
    category: "Digital Skills",
    difficulty: "advanced",
    xp_reward: 450,
    steps: ["Learn IF statements (=IF(A1>10, \"Yes\", \"No\"))", "Learn VLOOKUP or INDEX/MATCH", "Create a dropdown menu using Data Validation", "Use Conditional Formatting to highlight data", "Create a spreadsheet that uses all these features"],
    why_it_matters: "Advanced spreadsheet skills are valued in almost every career.",
    safety_notes: "Save backups before making major changes to important spreadsheets.",
    evidence_examples: ["📺 SCREENSHARE: Demo your spreadsheet with formulas - click cells to show them", "📺 SCREENSHARE: Show how conditional formatting and dropdowns work"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Presentation Master",
    description: "Create engaging presentations that aren't boring.",
    category: "Digital Skills",
    difficulty: "intermediate",
    xp_reward: 350,
    steps: ["Learn the 6x6 rule: max 6 bullets, max 6 words each", "Use high-quality images (Unsplash.com is free)", "Learn to use consistent fonts and colors", "Create a 5-slide presentation on a topic you like", "Add speaker notes", "Practice presenting without reading slides"],
    why_it_matters: "Good presentations = good communication. This skill matters for school and career.",
    safety_notes: "Don't use copyrighted images without permission.",
    evidence_examples: ["📺 SCREENSHARE: Present your 5-slide presentation to me", "📺 SCREENSHARE: Show me your speaker notes"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Basic HTML: Level 1",
    description: "Learn the basics of HTML - the language of the web.",
    category: "Coding",
    difficulty: "intermediate",
    xp_reward: 400,
    steps: ["Learn what HTML is and why it matters", "Create a simple HTML file in Notepad", "Learn tags: html, head, body, h1, p, a, img", "Create a simple webpage about yourself or a hobby", "Open it in your browser", "Add at least one link and one image"],
    why_it_matters: "Understanding HTML helps you understand how the web works. It's the foundation of web development.",
    safety_notes: "Your local HTML files are private. Don't put personal info if you'll share them.",
    evidence_examples: ["📺 SCREENSHARE: Show me your HTML code and explain the tags", "📺 SCREENSHARE: Open it in a browser and show me it works"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Basic HTML: Level 2",
    description: "Add style to your web pages with CSS.",
    category: "Coding",
    difficulty: "advanced",
    xp_reward: 450,
    steps: ["Learn what CSS does (styling HTML)", "Add a <style> section to your HTML", "Change colors, fonts, and backgrounds", "Learn about margins and padding", "Style your Level 1 page to look much better", "Try to recreate a simple design you like"],
    why_it_matters: "CSS is what makes websites look good. Combined with HTML, you can build real web pages.",
    safety_notes: "None - experiment freely!",
    evidence_examples: ["📺 SCREENSHARE: Show me before/after of your styled page", "📺 SCREENSHARE: Walk me through your CSS code"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Malware Analysis 101",
    description: "Learn to recognize malware and suspicious behavior.",
    category: "Security",
    difficulty: "advanced",
    xp_reward: 450,
    steps: ["Research common types of malware (viruses, trojans, ransomware, spyware)", "Learn signs of infection: slow PC, popups, unknown programs", "Check your installed programs for anything suspicious", "Use VirusTotal.com to scan a suspicious file (safely)", "Learn about how malware spreads", "Create a checklist for spotting potential malware"],
    why_it_matters: "Knowing your enemy helps you avoid infection and recognize problems early.",
    safety_notes: "NEVER run suspected malware! Use VirusTotal to scan files without opening them.",
    evidence_examples: ["📺 SCREENSHARE: Show me how to use VirusTotal to scan a file", "📺 SCREENSHARE: Walk me through your malware detection checklist"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Digital Art Basics",
    description: "Create digital art using free tools.",
    category: "Creative",
    difficulty: "intermediate",
    xp_reward: 350,
    steps: ["Download a free art program (Krita, FireAlpaca, or use Photopea.com)", "Learn about layers and why they matter", "Learn basic brush tools", "Create a simple drawing or design", "Experiment with different brushes and effects", "Create something you're proud of"],
    why_it_matters: "Digital art skills are useful for games, content creation, and self-expression.",
    safety_notes: "Take breaks to avoid eye strain.",
    evidence_examples: ["📺 SCREENSHARE: Show me your artwork and explain how you made it", "📺 SCREENSHARE: Demo using layers and brushes"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "YouTube Creator: Level 2",
    description: "Learn basic video editing for better content.",
    category: "Creative",
    difficulty: "advanced",
    xp_reward: 450,
    steps: ["Get free editing software (DaVinci Resolve, CapCut, or ClipChamp)", "Import video clips and arrange them", "Learn to cut and trim clips", "Add text/titles to your video", "Add music or sound effects (use royalty-free)", "Export a finished 1-minute video"],
    why_it_matters: "Video editing is increasingly valuable. You'll use this for school, fun, and maybe career.",
    safety_notes: "Only use royalty-free music to avoid copyright strikes.",
    evidence_examples: ["📺 SCREENSHARE: Show me your editing timeline and explain your cuts", "📺 SCREENSHARE: Play your finished video for me"],
    tier: "elite", unlock_at_xp: 6000
  },
  {
    title: "Ask Before You Act",
    description: "Build the habit of pausing before risky online actions.",
    category: "Digital Citizenship",
    difficulty: "beginner",
    xp_reward: 250,
    steps: ["Create a mental checklist: 'Should I ask first?'", "Things that need asking: Downloads, signups, sharing info, money, meeting people", "Practice: Next time you're unsure, actually ask", "Document one real situation where you asked first", "Reflect on why this habit matters"],
    why_it_matters: "The best security tool is the pause button. Taking a moment to check prevents most mistakes.",
    safety_notes: "There's no such thing as a stupid question when it comes to online safety.",
    evidence_examples: ["📺 SCREENSHARE: Walk me through your 'ask first' checklist", "📝 Tell me about a real situation where you asked first"],
    tier: "elite", unlock_at_xp: 6000
  },

  // ============================================
  // 👑 LEGEND TIER (10000 XP) - 8 Quests
  // Master challenges
  // ============================================
  {
    title: "Encryption Explorer",
    description: "Understand encryption and when to use it.",
    category: "Security",
    difficulty: "advanced",
    xp_reward: 500,
    steps: ["Research: What is encryption? Symmetric vs asymmetric?", "Enable device encryption on your computer (BitLocker/FileVault)", "Understand HTTPS and check for it when browsing", "Learn about end-to-end encryption in messaging", "Explore encrypted messaging apps (Signal)"],
    why_it_matters: "Encryption is the math that keeps your data safe from prying eyes.",
    safety_notes: "If you lose your encryption keys/passwords, your data is gone forever.",
    evidence_examples: ["📺 SCREENSHARE: Show me encryption enabled and explain how it works", "📺 SCREENSHARE: Demo checking for HTTPS and explain why it matters"],
    tier: "legend", unlock_at_xp: 10000
  },
  {
    title: "Virtual Machine Sandbox",
    description: "Set up a virtual machine for safe experimentation.",
    category: "Technical Skills",
    difficulty: "advanced",
    xp_reward: 600,
    steps: ["Download VirtualBox (free)", "Download a Linux ISO (Ubuntu recommended)", "Create a new virtual machine", "Install Linux in the VM", "Experiment! Try commands, install software - you can't break your real computer"],
    why_it_matters: "VMs let you test software, explore operating systems, and practice safely. They're sandboxes for learning.",
    safety_notes: "VMs use significant RAM and storage. Make sure you have at least 8GB RAM.",
    evidence_examples: ["📺 SCREENSHARE: Show me Linux running in your VM", "📺 SCREENSHARE: Demo something cool you tried in the VM"],
    tier: "legend", unlock_at_xp: 10000
  },
  {
    title: "DNS Deep Dive",
    description: "Understand DNS and configure a secure DNS provider.",
    category: "Security",
    difficulty: "advanced",
    xp_reward: 500,
    steps: ["Research: What is DNS? Why does it matter for privacy/security?", "Learn about DNS-over-HTTPS (DoH)", "Configure your browser to use Cloudflare or Google DoH", "Test that it's working (dnsleaktest.com)", "Understand when DNS protection helps"],
    why_it_matters: "Your ISP can see every domain you visit through DNS. Encrypted DNS improves privacy.",
    safety_notes: "Start with browser-level changes. System-wide DNS affects everything.",
    evidence_examples: ["📺 SCREENSHARE: Show me your DoH configuration", "📺 SCREENSHARE: Run a DNS leak test and explain the results"],
    tier: "legend", unlock_at_xp: 10000
  },
  {
    title: "Git Version Control",
    description: "Learn the basics of Git for tracking changes in projects.",
    category: "Technical Skills",
    difficulty: "advanced",
    xp_reward: 600,
    steps: ["Install Git", "Configure your name and email", "Create a repository for a project", "Make commits with meaningful messages", "Learn: status, add, commit, log", "Create a GitHub account and push your repo"],
    why_it_matters: "Git is how professional developers track changes. It's an essential career skill.",
    safety_notes: "Never commit passwords, API keys, or personal information.",
    evidence_examples: ["📺 SCREENSHARE: Demo git status, add, commit, and log", "📺 SCREENSHARE: Show me your GitHub repo online"],
    tier: "legend", unlock_at_xp: 10000
  },
  {
    title: "Python Basics: Level 1",
    description: "Write your first Python programs.",
    category: "Coding",
    difficulty: "advanced",
    xp_reward: 500,
    steps: ["Install Python from python.org", "Write a 'Hello World' program", "Learn variables and basic math", "Learn to get user input", "Create a simple calculator that adds two numbers", "Make it work with multiply, subtract, divide too"],
    why_it_matters: "Python is one of the most popular and beginner-friendly programming languages.",
    safety_notes: "Never run Python code you don't understand from the internet.",
    evidence_examples: ["📺 SCREENSHARE: Show me your calculator code and run it", "📺 SCREENSHARE: Demo adding and multiplying numbers"],
    tier: "legend", unlock_at_xp: 10000
  },
  {
    title: "Python Basics: Level 2",
    description: "Learn loops and conditions in Python.",
    category: "Coding",
    difficulty: "advanced",
    xp_reward: 550,
    steps: ["Learn if/else statements", "Learn while loops", "Learn for loops", "Create a number guessing game", "Add features: count tries, play again option", "Make it fun!"],
    why_it_matters: "Loops and conditions are fundamental to all programming.",
    safety_notes: "Watch out for infinite loops!",
    evidence_examples: ["📺 SCREENSHARE: Walk me through your guessing game code", "📺 SCREENSHARE: Let's play your game together!"],
    tier: "legend", unlock_at_xp: 10000
  },
  {
    title: "Network Monitoring",
    description: "Learn to see what's happening on your network.",
    category: "Technical Skills",
    difficulty: "advanced",
    xp_reward: 500,
    steps: ["Install Wireshark or use built-in Windows tools", "Learn to see active connections (Resource Monitor > Network)", "Identify which programs are using the internet", "Look up unfamiliar connections to verify they're safe", "Learn to spot unusual network activity"],
    why_it_matters: "Seeing your network traffic helps you understand what your computer is really doing.",
    safety_notes: "Don't capture network traffic that isn't yours.",
    evidence_examples: ["📺 SCREENSHARE: Show me Resource Monitor network tab and explain connections", "📺 SCREENSHARE: Identify all programs using internet right now"],
    tier: "legend", unlock_at_xp: 10000
  },
  {
    title: "Capstone: Security Audit",
    description: "Perform a complete security audit of your digital life.",
    category: "Security",
    difficulty: "advanced",
    xp_reward: 600,
    steps: ["Audit all your passwords (are they all unique and strong?)", "Verify 2FA is on all important accounts", "Check all your devices are updated", "Review privacy settings on 5 main accounts", "Remove unused apps and accounts", "Create a summary of improvements made"],
    why_it_matters: "This brings together everything you've learned into a real-world security improvement.",
    safety_notes: "Take your time. This is important work.",
    evidence_examples: ["📺 SCREENSHARE: Walk me through your complete security audit", "📺 SCREENSHARE: Show me the improvements you made"],
    tier: "legend", unlock_at_xp: 10000
  }
];

async function fullReset() {
  console.log('🔄 FULL RESET - 50 QUEST SYSTEM WITH SCALED REWARDS\n');
  console.log('⚠️  This will DELETE all quests and re-create them!\n');

  try {
    // 1. Delete all progress
    console.log('🗑️  Clearing all data...');
    await sql`DELETE FROM quest_progress`;
    try { await sql`DELETE FROM quest_reactions`; } catch (e) {}
    try { await sql`DELETE FROM activity_log`; } catch (e) {}
    try { await sql`DELETE FROM earned_badges`; } catch (e) {}
    try { await sql`DELETE FROM earned_achievements`; } catch (e) {}
    console.log('   ✓ Progress cleared');

    // 2. DELETE ALL QUESTS
    await sql`DELETE FROM quests`;
    console.log('   ✓ All quests deleted');

    // 3. Ensure columns exist
    try { await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'rookie'`; } catch (e) {}
    try { await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS unlock_at_xp INTEGER DEFAULT 0`; } catch (e) {}
    try { await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS is_lucky_quest BOOLEAN DEFAULT false`; } catch (e) {}
    try { await sql`ALTER TABLE quests ADD COLUMN IF NOT EXISTS lucky_multiplier DECIMAL(3,2) DEFAULT 1.0`; } catch (e) {}
    console.log('   ✓ Columns ready');

    // 4. INSERT ALL 50 QUESTS
    console.log('\n📜 Creating 50 quests...\n');
    
    let sortOrder = 1;
    const tierCounts: Record<string, number> = { rookie: 0, apprentice: 0, pro: 0, elite: 0, legend: 0 };
    let totalXp = 0;

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
      
      tierCounts[quest.tier]++;
      totalXp += quest.xp_reward;
      sortOrder++;
    }

    console.log('   ✓ 50 quests created');

    // 5. Reset mentee stats
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

    // 6. Set random lucky quest
    await sql`
      UPDATE quests 
      SET is_lucky_quest = true, lucky_multiplier = 1.5
      WHERE id = (SELECT id FROM quests WHERE tier = 'rookie' ORDER BY RANDOM() LIMIT 1)
    `;
    console.log('   ✓ Lucky quest set');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 FULL RESET COMPLETE!\n');
    console.log('📊 50 Quests Created:\n');
    console.log(`   🌱 ROOKIE (0 XP):       ${tierCounts.rookie} quests`);
    console.log(`   ⚡ APPRENTICE (1000 XP): ${tierCounts.apprentice} quests`);
    console.log(`   🔥 PRO (3000 XP):        ${tierCounts.pro} quests`);
    console.log(`   💎 ELITE (6000 XP):      ${tierCounts.elite} quests`);
    console.log(`   👑 LEGEND (10000 XP):    ${tierCounts.legend} quests`);
    console.log(`\n💰 Total XP Available: ${totalXp} ($${Math.floor(totalXp/100)} in rewards)`);
    console.log(`\n💵 First 5 quests ≈ $10 (200 XP each)`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

fullReset();
