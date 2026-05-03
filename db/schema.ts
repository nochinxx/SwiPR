import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  vector,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- enums ----------

export const prStateEnum = pgEnum("pr_state", ["open", "closed", "merged"]);
export const fileStatusEnum = pgEnum("file_status", ["added", "modified", "removed", "renamed"]);
export const decisionActionEnum = pgEnum("decision_action", ["approve", "changes", "skip"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

// ---------- tables ----------

export const repos = pgTable(
  "repos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    defaultBranch: text("default_branch").notNull().default("main"),
    lastSynced: timestamp("last_synced"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    ownerNameIdx: index("repos_owner_name_idx").on(t.owner, t.name),
  })
);

export const prs = pgTable(
  "prs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    state: prStateEnum("state").notNull().default("open"),
    authorHandle: text("author_handle").notNull(),
    additions: integer("additions").notNull().default(0),
    deletions: integer("deletions").notNull().default(0),
    changedFiles: integer("changed_files").notNull().default(0),
    htmlUrl: text("html_url").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    prCreatedAt: timestamp("pr_created_at").notNull(),
    prUpdatedAt: timestamp("pr_updated_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    repoIdx: index("prs_repo_idx").on(t.repoId),
    stateIdx: index("prs_state_idx").on(t.state),
    authorIdx: index("prs_author_idx").on(t.authorHandle),
  })
);

export const prFiles = pgTable(
  "pr_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prId: uuid("pr_id")
      .notNull()
      .references(() => prs.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    status: fileStatusEnum("status").notNull(),
    additions: integer("additions").notNull().default(0),
    deletions: integer("deletions").notNull().default(0),
    patch: text("patch"),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    prIdx: index("pr_files_pr_idx").on(t.prId),
  })
);

export const contributors = pgTable(
  "contributors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    avatarUrl: text("avatar_url"),
    firstPrAt: timestamp("first_pr_at"),
    totalPrs: integer("total_prs").notNull().default(0),
    mergedPrs: integer("merged_prs").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    repoHandleIdx: index("contributors_repo_handle_idx").on(t.repoId, t.handle),
  })
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: uuid("repo_id").references(() => repos.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  decisionsCount: integer("decisions_count").notNull().default(0),
});

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    prId: uuid("pr_id")
      .notNull()
      .references(() => prs.id, { onDelete: "cascade" }),
    action: decisionActionEnum("action").notNull(),
    note: text("note"),
    decidedAt: timestamp("decided_at").notNull().defaultNow(),
  },
  (t) => ({
    sessionIdx: index("decisions_session_idx").on(t.sessionId),
    prIdx: index("decisions_pr_idx").on(t.prId),
  })
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    prId: uuid("pr_id").references(() => prs.id),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    sessionIdx: index("chat_messages_session_idx").on(t.sessionId),
  })
);

// ---------- relations ----------

export const reposRelations = relations(repos, ({ many }) => ({
  prs: many(prs),
  contributors: many(contributors),
  sessions: many(sessions),
}));

export const prsRelations = relations(prs, ({ one, many }) => ({
  repo: one(repos, { fields: [prs.repoId], references: [repos.id] }),
  files: many(prFiles),
  decisions: many(decisions),
}));

export const prFilesRelations = relations(prFiles, ({ one }) => ({
  pr: one(prs, { fields: [prFiles.prId], references: [prs.id] }),
}));

export const contributorsRelations = relations(contributors, ({ one }) => ({
  repo: one(repos, { fields: [contributors.repoId], references: [repos.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  repo: one(repos, { fields: [sessions.repoId], references: [repos.id] }),
  decisions: many(decisions),
  messages: many(chatMessages),
}));

export const decisionsRelations = relations(decisions, ({ one }) => ({
  session: one(sessions, { fields: [decisions.sessionId], references: [sessions.id] }),
  pr: one(prs, { fields: [decisions.prId], references: [prs.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(sessions, { fields: [chatMessages.sessionId], references: [sessions.id] }),
  pr: one(prs, { fields: [chatMessages.prId], references: [prs.id] }),
}));

// ---------- inferred types ----------

export type Repo = typeof repos.$inferSelect;
export type NewRepo = typeof repos.$inferInsert;
export type PR = typeof prs.$inferSelect;
export type NewPR = typeof prs.$inferInsert;
export type PRFile = typeof prFiles.$inferSelect;
export type NewPRFile = typeof prFiles.$inferInsert;
export type Contributor = typeof contributors.$inferSelect;
export type NewContributor = typeof contributors.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Decision = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
