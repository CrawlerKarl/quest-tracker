import { pgTable, serial, text, integer, timestamp, boolean, varchar } from 'drizzle-orm/pg-core';

// Quests table
export const quests = pgTable('quests', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  difficulty: varchar('difficulty', { length: 50 }).notNull(), // beginner, intermediate, advanced
  xpReward: integer('xp_reward').notNull().default(100),
  steps: text('steps').notNull(), // JSON array of step strings
  whyItMatters: text('why_it_matters'),
  safetyNotes: text('safety_notes'),
  evidenceExamples: text('evidence_examples'), // JSON array of example strings
  prerequisites: text('prerequisites'), // JSON array of quest IDs
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quest progress for the mentee
export const questProgress = pgTable('quest_progress', {
  id: serial('id').primaryKey(),
  questId: integer('quest_id').notNull().references(() => quests.id),
  status: varchar('status', { length: 50 }).notNull().default('available'), // available, in_progress, submitted, approved, rejected, completed
  evidenceLinks: text('evidence_links'), // JSON array of URLs
  reflection: text('reflection'),
  mentorFeedback: text('mentor_feedback'),
  startedAt: timestamp('started_at'),
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Mentee stats (single row for the one mentee)
export const menteeStats = pgTable('mentee_stats', {
  id: serial('id').primaryKey(),
  totalXp: integer('total_xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  questsCompleted: integer('quests_completed').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActivityAt: timestamp('last_activity_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Badges/achievements
export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 50 }).notNull(), // emoji or icon name
  requirement: text('requirement').notNull(), // JSON describing how to earn
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Earned badges
export const earnedBadges = pgTable('earned_badges', {
  id: serial('id').primaryKey(),
  badgeId: integer('badge_id').notNull().references(() => badges.id),
  earnedAt: timestamp('earned_at').notNull().defaultNow(),
});

// Activity log (simple, for recent activity display)
export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  action: varchar('action', { length: 100 }).notNull(), // quest_started, quest_submitted, quest_approved, etc.
  questId: integer('quest_id').references(() => quests.id),
  details: text('details'), // JSON with additional info
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Types for TypeScript
export type Quest = typeof quests.$inferSelect;
export type NewQuest = typeof quests.$inferInsert;
export type QuestProgress = typeof questProgress.$inferSelect;
export type NewQuestProgress = typeof questProgress.$inferInsert;
export type MenteeStats = typeof menteeStats.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type EarnedBadge = typeof earnedBadges.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
