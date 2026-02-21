import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("board_role", ["styreleder", "nestleder", "styremedlem", "varamedlem"]);

export const meetingStatusEnum = pgEnum("meeting_status", [
  "draft",
  "invitation_sent",
  "protocol_draft",
  "pending_signatures",
  "signed",
]);

// Users — login identity, shared across companies
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Companies — each company has its own board and meetings
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  orgNumber: varchar("org_number", { length: 20 }).notNull().unique(),
  address: text("address"),
  postalCode: varchar("postal_code", { length: 10 }),
  city: varchar("city", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Board members — links user to company with role
export const boardMembers = pgTable("board_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  userId: uuid("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  role: roleEnum("role").notNull().default("styremedlem"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Meetings — linked to company
export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  title: varchar("title", { length: 500 }),
  address: text("address"),
  room: varchar("room", { length: 255 }),
  date: varchar("date", { length: 20 }).notNull(),
  time: varchar("time", { length: 10 }).notNull(),
  status: meetingStatusEnum("status").notNull().default("draft"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agenda items — linked to meeting
export const agendaItems = pgTable("agenda_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  decision: text("decision"),
});

// Signatures — links board member to meeting
export const signatures = pgTable("signatures", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id),
  boardMemberId: uuid("board_member_id")
    .notNull()
    .references(() => boardMembers.id),
  signedAt: timestamp("signed_at"),
  typedName: varchar("typed_name", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

// One-time signing links for email-based signing
export const signingTokens = pgTable("signing_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  boardMemberId: uuid("board_member_id")
    .notNull()
    .references(() => boardMembers.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit log — tracks events
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  meetingId: uuid("meeting_id").references(() => meetings.id),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NextAuth required tables
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  idToken: text("id_token"),
  sessionState: varchar("session_state", { length: 255 }),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires").notNull(),
});
