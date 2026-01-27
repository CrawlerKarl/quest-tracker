# 🎮 Quest Tracker

A gamified quest-tracking app for one mentor and one mentee to track digital skills progress.

**What it does:**
- Mentee sees quests, marks progress, submits evidence links
- Mentor reviews submissions, approves/rejects with feedback
- XP, levels, and badges make learning fun
- Everything saves permanently to a database

---

# 🚀 COMPLETE SETUP GUIDE

**Time needed:** About 45-60 minutes  
**Difficulty:** You can do this! Just follow each step carefully.  
**Cost:** Free (uses free tiers of all services)

---

## PART 1: Create Your Accounts (15 minutes)

### Step 1.1: Create a GitHub Account

GitHub is where your code will live. It's like Google Drive for code.

1. Open your web browser and go to: **https://github.com**
2. Click the **"Sign up"** button (top right)
3. Enter your email address and click **Continue**
4. Create a password and click **Continue**
5. Choose a username (this will be public, so pick something appropriate)
6. Complete the puzzle/verification if asked
7. Check your email and enter the code GitHub sent you
8. When asked about personalization, you can click **"Skip personalization"** at the bottom

✅ **You should see:** The GitHub dashboard with a green button that might say "Create repository"

### Step 1.2: Create a Vercel Account

Vercel is where your app will actually run on the internet.

1. Open a new tab and go to: **https://vercel.com**
2. Click **"Sign Up"** (top right)
3. Click **"Continue with GitHub"** (this is the easiest option)
4. A popup will appear asking to authorize Vercel - click **"Authorize Vercel"**
5. You may need to confirm your email

✅ **You should see:** The Vercel dashboard (might be empty, that's fine)

---

## PART 2: Install Software on Your Computer (15 minutes)

### Step 2.1: Install Node.js

Node.js lets your computer run the code that builds your app.

**On Windows:**
1. Go to: **https://nodejs.org**
2. Click the green button that says **"LTS"** (the version number doesn't matter, LTS is the stable version)
3. Open the downloaded file
4. Click **Next** through all the screens (keep default options)
5. Click **Install**
6. Click **Finish**

**On Mac:**
1. Go to: **https://nodejs.org**
2. Click the green button that says **"LTS"**
3. Open the downloaded .pkg file
4. Follow the installer prompts

**Verify it worked:**
- On Windows: Press the Windows key, type `cmd`, press Enter
- On Mac: Open Spotlight (Cmd + Space), type `terminal`, press Enter

Type this exactly and press Enter:
```
node --version
```

✅ **You should see:** Something like `v20.10.0` (the exact number may vary)

### Step 2.2: Install Git

Git is how you'll send your code to GitHub.

**On Windows:**
1. Go to: **https://git-scm.com/download/win**
2. The download should start automatically
3. Open the downloaded file
4. Click **Next** through all screens (keep all default options)
5. Click **Install**
6. Click **Finish**

**On Mac:**
1. Open Terminal (Spotlight → type "terminal" → Enter)
2. Type: `git --version`
3. If not installed, a popup will offer to install it - click **Install**

**Verify it worked:**
Close your command prompt/terminal and open a new one, then type:
```
git --version
```

✅ **You should see:** Something like `git version 2.43.0`

---

## PART 3: Download and Set Up the Code (10 minutes)

### Step 3.1: Create a Folder for Your Project

**On Windows:**
1. Open File Explorer
2. Go to your Documents folder
3. Right-click → **New** → **Folder**
4. Name it: `quest-tracker`

**On Mac:**
1. Open Finder
2. Go to Documents
3. Right-click → **New Folder**
4. Name it: `quest-tracker`

### Step 3.2: Download the Code Files

You need to put all the code files I'm providing into your `quest-tracker` folder.

The easiest way:
1. I'll provide you with all the files
2. Copy each file to the correct location in your quest-tracker folder

**Your folder structure should look like this:**
```
quest-tracker/
├── app/
│   ├── api/
│   │   ├── activity/
│   │   │   └── route.ts
│   │   ├── quests/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── stats/
│   │   │   └── route.ts
│   │   └── submissions/
│   │       ├── [id]/
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── enter/
│   │   ├── mentee/
│   │   │   └── [token]/
│   │   │       └── page.tsx
│   │   └── mentor/
│   │       └── [token]/
│   │           └── page.tsx
│   ├── mentor/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── sanitize.ts
│   └── schema.ts
├── scripts/
│   ├── generate-tokens.ts
│   ├── migrate.ts
│   └── seed.ts
├── .env.example
├── .gitignore
├── drizzle.config.ts
├── next.config.js
├── package.json
├── README.md
└── tsconfig.json
```

### Step 3.3: Open the Folder in Command Line

**On Windows:**
1. Open File Explorer
2. Navigate to your `quest-tracker` folder
3. Click in the address bar at the top
4. Type `cmd` and press Enter

A black window should open, and you should see something like:
```
C:\Users\YourName\Documents\quest-tracker>
```

**On Mac:**
1. Open Terminal
2. Type: `cd ~/Documents/quest-tracker`
3. Press Enter

### Step 3.4: Install Dependencies

In your command prompt/terminal (which should be open in the quest-tracker folder), type:

```
npm install
```

Press Enter and wait. You'll see a lot of text scroll by. This takes 1-3 minutes.

✅ **You should see:** "added XXX packages" at the end (no red error messages)

### Step 3.5: Generate Your Secret Tokens

Still in the command prompt/terminal, type:

```
npm run generate-tokens
```

Press Enter.

✅ **You should see:** A box with three values:
- MENTEE_TOKEN=...
- MENTOR_TOKEN=...
- COOKIE_SECRET=...

**⚠️ IMPORTANT: Copy these somewhere safe RIGHT NOW!**
- Open Notepad (Windows) or TextEdit (Mac)
- Copy the entire output
- Save it as "my-quest-tracker-secrets.txt" somewhere safe
- You will need these values in the next steps

---

## PART 4: Upload to GitHub (10 minutes)

### Step 4.1: Configure Git (First Time Only)

In your command prompt/terminal, type these two commands (replace with your actual info):

```
git config --global user.email "your-email@example.com"
```
Press Enter, then:
```
git config --global user.name "Your Name"
```
Press Enter.

### Step 4.2: Initialize Git in Your Project

Type each command and press Enter after each one:

```
git init
```
*(This creates a new git repository in your folder)*

```
git add .
```
*(This stages all your files to be saved)*

```
git commit -m "Initial commit"
```
*(This saves a snapshot of your code)*

✅ **You should see:** Messages about files being created/committed

### Step 4.3: Create a Repository on GitHub

1. Go to **https://github.com**
2. Click the **+** icon in the top right
3. Click **"New repository"**
4. Repository name: `quest-tracker`
5. Keep it **Public** (free tier requires this for Vercel)
6. **DO NOT** check "Add a README file" (we already have one)
7. Click **"Create repository"**

✅ **You should see:** A page with setup instructions

### Step 4.4: Connect and Upload

On the GitHub page you just created, look for the section that says **"…or push an existing repository from the command line"**

Copy the commands shown there, OR use these (replace YOUR-USERNAME with your GitHub username):

```
git remote add origin https://github.com/YOUR-USERNAME/quest-tracker.git
```
Press Enter.

```
git branch -M main
```
Press Enter.

```
git push -u origin main
```
Press Enter.

If prompted for a password:
- GitHub no longer accepts passwords
- Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new token (classic)
- Give it a name like "quest-tracker"
- Check the "repo" scope
- Click Generate
- Copy the token and use it as your password

✅ **You should see:** Your code uploading, ending with "Branch 'main' set up..."

Refresh your GitHub repository page - you should see all your files!

---

## PART 5: Deploy to Vercel (10 minutes)

### Step 5.1: Import Your Project

1. Go to **https://vercel.com**
2. Click **"Add New..."** → **"Project"**
3. Find **"quest-tracker"** in your GitHub repositories list
4. Click **"Import"**

### Step 5.2: Configure Environment Variables

Before clicking Deploy, you need to add your secret tokens:

1. Look for **"Environment Variables"** section (expand if collapsed)
2. Add these three variables (copy values from your saved secrets file):

| Name | Value |
|------|-------|
| `MENTEE_TOKEN` | (paste your MENTEE_TOKEN value) |
| `MENTOR_TOKEN` | (paste your MENTOR_TOKEN value) |
| `COOKIE_SECRET` | (paste your COOKIE_SECRET value) |

For each one:
- Type the name in the "Key" field
- Paste the value in the "Value" field
- Click **"Add"**

### Step 5.3: Add Vercel Postgres Database

1. Click **"Deploy"** (don't worry, we'll add the database right after)
2. Wait for the deployment to finish (2-3 minutes)
3. Click **"Continue to Dashboard"**
4. Click the **"Storage"** tab
5. Click **"Create Database"**
6. Select **"Postgres"**
7. Click **"Continue"**
8. Accept the default region and click **"Create"**
9. When asked to connect to your project, click **"Connect"**

The database connection strings will be automatically added to your environment variables.

### Step 5.4: Redeploy with Database

1. Go to the **"Deployments"** tab
2. Click the **"..."** menu next to your latest deployment
3. Click **"Redeploy"**
4. Wait for it to finish

### Step 5.5: Run Database Migrations

Now we need to set up your database tables. Unfortunately, Vercel doesn't have a built-in way to run migrations, so we'll use a workaround:

**Option A: Use Vercel CLI (Recommended)**

1. In your command prompt/terminal (in the quest-tracker folder), type:
```
npm install -g vercel
```

2. Then:
```
vercel login
```
Follow the prompts to log in.

3. Link your project:
```
vercel link
```
Answer the questions to link to your existing project.

4. Pull the environment variables:
```
vercel env pull .env.local
```

5. Run migrations:
```
npm run db:migrate
```

6. Run seed data:
```
npm run db:seed
```

✅ **You should see:** Messages about tables being created and quests being seeded.

**Option B: Use Vercel Dashboard Function Log (Alternative)**

If the CLI doesn't work, we'll need to create a temporary API route to run migrations. Contact me if you need help with this alternative.

---

## PART 6: Test Your App! (5 minutes)

### Step 6.1: Find Your URLs

1. Go to your Vercel dashboard
2. Click on your quest-tracker project
3. Find the **"Domains"** section
4. Copy your URL (looks like: `quest-tracker-abc123.vercel.app`)

### Step 6.2: Access as Mentor

Open this URL in your browser (replace YOUR-APP-URL and YOUR-MENTOR-TOKEN):

```
https://YOUR-APP-URL/enter/mentor/YOUR-MENTOR-TOKEN
```

For example:
```
https://quest-tracker-abc123.vercel.app/enter/mentor/abc123xyz...
```

✅ **You should see:** The mentor dashboard with "Review Queue", "Manage Quests", etc.

### Step 6.3: Test as Mentee

Open this URL in an **incognito/private window** (replace YOUR-APP-URL and YOUR-MENTEE-TOKEN):

```
https://YOUR-APP-URL/enter/mentee/YOUR-MENTEE-TOKEN
```

✅ **You should see:** The quest board with 25 pre-loaded quests

### Step 6.4: Verify Everything Works

- [ ] Mentor dashboard loads
- [ ] You can see pre-loaded quests in "Manage Quests"
- [ ] Mentee view loads (in incognito)
- [ ] Mentee can click a quest and see details
- [ ] Mentee can start a quest
- [ ] Mentee can submit evidence (try with a sample URL like https://example.com)
- [ ] Back in mentor view, the submission appears in Review Queue
- [ ] Mentor can approve the submission
- [ ] Back in mentee view, XP is awarded

🎉 **Congratulations! Your Quest Tracker is live!**

---

## PART 7: Share with Your Mentee

### Your Bookmarks

Save these URLs somewhere safe:

**Your Mentor URL (don't share this!):**
```
https://YOUR-APP-URL/enter/mentor/YOUR-MENTOR-TOKEN
```

**Mentee URL (share this with your mentee):**
```
https://YOUR-APP-URL/enter/mentee/YOUR-MENTEE-TOKEN
```

### How to Share Securely

**DO:**
- Share via Signal or iMessage
- Tell them in person
- Write it down and hand it to them

**DON'T:**
- Send via regular email
- Post anywhere public
- Send via SMS (not encrypted)

---

## 🔧 Troubleshooting

### "Application Error" or blank page
1. Check Vercel dashboard → Deployments → Click latest → Check logs
2. Make sure all environment variables are set
3. Make sure database migration ran successfully
4. Try redeploying

### "Invalid Link" when using your URLs
1. Make sure you copied the tokens exactly (no extra spaces)
2. Check that MENTEE_TOKEN and MENTOR_TOKEN are set in Vercel environment variables
3. Tokens are case-sensitive!

### "Database error" or "Failed to fetch"
1. Make sure Vercel Postgres is connected to your project
2. Check that POSTGRES_URL exists in environment variables
3. Try running migrations again

### Quests don't appear
Run the seed script again:
```
npm run db:seed
```

### Need to start over completely
1. In Vercel, go to Storage → Delete your database
2. Create a new database
3. Run migrations and seed again

### Need new secret tokens
1. Run `npm run generate-tokens` again
2. Update the values in Vercel environment variables
3. Redeploy
4. Give your mentee the new URL

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Run locally | `npm run dev` |
| Generate tokens | `npm run generate-tokens` |
| Run migrations | `npm run db:migrate` |
| Seed data | `npm run db:seed` |

---

**Questions?** The most common issues are:
1. Environment variables not set correctly
2. Database not connected
3. Migrations didn't run

Double-check these three things first!
