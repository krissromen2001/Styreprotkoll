import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agendaItems,
  boardMembers,
  companies,
  emailVerificationTokens,
  meetingAttachments,
  meetings,
  meetingAttendees,
  signatures,
  signingTokens,
  users,
} from "@/lib/db/schema";

export interface Company {
  id: string;
  name: string;
  orgNumber: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
  createdAt: Date;
}

export interface BoardMember {
  id: string;
  companyId: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: "styreleder" | "nestleder" | "styremedlem" | "varamedlem";
  active: boolean;
  createdAt: Date;
}

export interface AgendaItem {
  id: string;
  meetingId: string;
  sortOrder: number;
  title: string;
  description: string | null;
  decision: string | null;
}

export interface MeetingAttachment {
  id: string;
  meetingId: string;
  fileName: string;
  storagePath: string;
  contentType: string | null;
  fileSize: number | null;
  createdAt: Date;
}

export interface Meeting {
  id: string;
  companyId: string;
  title: string | null;
  meetingMode?: "physical" | "digital" | null;
  meetingLink?: string | null;
  address: string | null;
  room: string | null;
  date: string;
  time: string;
  type: "board_meeting" | "general_assembly" | "extraordinary_general_assembly";
  status: "draft" | "invitation_sent" | "protocol_draft" | "pending_signatures" | "signed";
  protocolStoragePath: string | null;
  signedProtocolStoragePath?: string | null;
  signingProvider?: string | null;
  signingMethod?: string | null;
  signingProviderSessionId?: string | null;
  signatureLevel?: string | null;
  signingCompletedAt?: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Signature {
  id: string;
  meetingId: string;
  boardMemberId: string;
  signedAt: Date | null;
  signedAtProvider?: Date | null;
  typedName: string | null;
  provider?: string | null;
  providerSignerId?: string | null;
  providerStatus?: string | null;
  signatureLevel?: string | null;
  evidenceStoragePath?: string | null;
  rawProviderMeta?: string | null;
}

export interface MeetingAttendee {
  id: string;
  meetingId: string;
  boardMemberId: string;
  present: boolean;
}

export interface SigningToken {
  id: string;
  meetingId: string;
  boardMemberId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  emailVerified: Date | null;
  googleCalendarAccessToken?: string | null;
  googleCalendarRefreshToken?: string | null;
  googleCalendarTokenExpiresAt?: Date | null;
  createdAt: Date;
}

// --- Companies ---
// --- Users ---
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0];
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const rows = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return rows[0] ?? null;
}

// --- Companies ---
export async function getCompanies(): Promise<Company[]> {
  return db.select().from(companies).orderBy(asc(companies.createdAt));
}

export async function getCompaniesForUser(email: string): Promise<Company[]> {
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      orgNumber: companies.orgNumber,
      address: companies.address,
      postalCode: companies.postalCode,
      city: companies.city,
      stripeCustomerId: companies.stripeCustomerId,
      stripeSubscriptionId: companies.stripeSubscriptionId,
      stripeSubscriptionStatus: companies.stripeSubscriptionStatus,
      stripePriceId: companies.stripePriceId,
      stripeCurrentPeriodEnd: companies.stripeCurrentPeriodEnd,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .innerJoin(boardMembers, eq(boardMembers.companyId, companies.id))
    .where(eq(boardMembers.email, email))
    .orderBy(asc(companies.createdAt));

  return rows;
}

export async function getCompany(id: string): Promise<Company | undefined> {
  const rows = await db.select().from(companies).where(eq(companies.id, id));
  return rows[0];
}

export async function getCompanyByOrg(orgNumber: string): Promise<Company | undefined> {
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.orgNumber, orgNumber));
  return rows[0];
}

export async function createCompany(data: Omit<Company, "id" | "createdAt">): Promise<Company> {
  const rows = await db.insert(companies).values(data).returning();
  return rows[0];
}

export async function updateCompany(
  id: string,
  data: Partial<Company>
): Promise<Company | null> {
  const rows = await db
    .update(companies)
    .set(data)
    .where(eq(companies.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getCompanyByStripeCustomerId(
  stripeCustomerId: string
): Promise<Company | undefined> {
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return rows[0];
}

export async function getCompanyByStripeSubscriptionId(
  stripeSubscriptionId: string
): Promise<Company | undefined> {
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  return rows[0];
}

// --- Board Members ---
export async function getBoardMembers(companyId: string): Promise<BoardMember[]> {
  return db
    .select()
    .from(boardMembers)
    .where(eq(boardMembers.companyId, companyId))
    .orderBy(asc(boardMembers.createdAt));
}

export async function getBoardMember(id: string): Promise<BoardMember | undefined> {
  const rows = await db
    .select()
    .from(boardMembers)
    .where(eq(boardMembers.id, id));
  return rows[0];
}

export async function getBoardMemberByNameRole(
  companyId: string,
  name: string,
  role: BoardMember["role"]
): Promise<BoardMember | undefined> {
  const rows = await db
    .select()
    .from(boardMembers)
    .where(
      and(
        eq(boardMembers.companyId, companyId),
        eq(boardMembers.name, name),
        eq(boardMembers.role, role)
      )
    );
  return rows[0];
}

export async function getBoardMemberByEmail(
  companyId: string,
  email: string
): Promise<BoardMember | undefined> {
  const rows = await db
    .select()
    .from(boardMembers)
    .where(and(eq(boardMembers.companyId, companyId), eq(boardMembers.email, email)));
  return rows[0];
}

export async function getBoardMembersByEmail(email: string): Promise<BoardMember[]> {
  return db
    .select()
    .from(boardMembers)
    .where(eq(boardMembers.email, email));
}

export async function createBoardMember(
  data: Omit<BoardMember, "id" | "createdAt">
): Promise<BoardMember> {
  const rows = await db.insert(boardMembers).values(data).returning();
  return rows[0];
}

export async function updateBoardMember(
  id: string,
  data: Partial<BoardMember>
): Promise<BoardMember | null> {
  const rows = await db
    .update(boardMembers)
    .set(data)
    .where(eq(boardMembers.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteBoardMember(id: string): Promise<boolean> {
  const rows = await db
    .delete(boardMembers)
    .where(eq(boardMembers.id, id))
    .returning({ id: boardMembers.id });
  return rows.length > 0;
}

// --- Meetings ---
export async function getMeetings(companyId: string): Promise<Meeting[]> {
  return db
    .select()
    .from(meetings)
    .where(eq(meetings.companyId, companyId))
    .orderBy(desc(meetings.createdAt));
}

export async function getAllMeetings(): Promise<Meeting[]> {
  return db.select().from(meetings).orderBy(desc(meetings.createdAt));
}

export async function getMeetingsForCompanies(companyIds: string[]): Promise<Meeting[]> {
  if (companyIds.length === 0) return [];
  return db
    .select()
    .from(meetings)
    .where(inArray(meetings.companyId, companyIds))
    .orderBy(desc(meetings.createdAt));
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const rows = await db.select().from(meetings).where(eq(meetings.id, id));
  return rows[0];
}

export async function getMeetingBySigningProviderSessionId(
  providerSessionId: string
): Promise<Meeting | undefined> {
  const rows = await db
    .select()
    .from(meetings)
    .where(eq(meetings.signingProviderSessionId, providerSessionId));
  return rows[0];
}

export async function getMeetingByProviderSignerSessionId(
  providerSignerSessionId: string
): Promise<Meeting | undefined> {
  const rows = await db
    .select({
      id: meetings.id,
      companyId: meetings.companyId,
      title: meetings.title,
      meetingMode: meetings.meetingMode,
      meetingLink: meetings.meetingLink,
      address: meetings.address,
      room: meetings.room,
      date: meetings.date,
      time: meetings.time,
      type: meetings.type,
      status: meetings.status,
      protocolStoragePath: meetings.protocolStoragePath,
      signedProtocolStoragePath: meetings.signedProtocolStoragePath,
      signingProvider: meetings.signingProvider,
      signingMethod: meetings.signingMethod,
      signingProviderSessionId: meetings.signingProviderSessionId,
      signatureLevel: meetings.signatureLevel,
      signingCompletedAt: meetings.signingCompletedAt,
      createdById: meetings.createdById,
      createdAt: meetings.createdAt,
      updatedAt: meetings.updatedAt,
    })
    .from(meetings)
    .innerJoin(signatures, eq(signatures.meetingId, meetings.id))
    .where(eq(signatures.providerSignerId, providerSignerSessionId))
    .limit(1);

  return rows[0];
}

export async function createMeeting(
  data: Omit<Meeting, "id" | "createdAt" | "updatedAt">
): Promise<Meeting> {
  const rows = await db
    .insert(meetings)
    .values({ ...data, updatedAt: new Date() })
    .returning();
  return rows[0];
}

export async function updateMeeting(
  id: string,
  data: Partial<Meeting>
): Promise<Meeting | null> {
  const rows = await db
    .update(meetings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(meetings.id, id))
    .returning();
  return rows[0] ?? null;
}

// --- Email verification ---
export async function createEmailVerificationToken(data: {
  userId: string;
  token: string;
  expiresAt: Date;
}): Promise<EmailVerificationToken> {
  const rows = await db.insert(emailVerificationTokens).values(data).returning();
  return rows[0];
}

export async function getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
  const rows = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.token, token));
  return rows[0];
}

export async function markEmailVerificationTokenUsed(id: string): Promise<void> {
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, id));
}

export async function markUserEmailVerified(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, userId));
}

// --- Agenda Items ---
export async function getAgendaItems(meetingId: string): Promise<AgendaItem[]> {
  return db
    .select()
    .from(agendaItems)
    .where(eq(agendaItems.meetingId, meetingId))
    .orderBy(asc(agendaItems.sortOrder));
}

// --- Meeting Attachments ---
export async function getMeetingAttachments(meetingId: string): Promise<MeetingAttachment[]> {
  return db
    .select()
    .from(meetingAttachments)
    .where(eq(meetingAttachments.meetingId, meetingId))
    .orderBy(asc(meetingAttachments.createdAt));
}

export async function getMeetingAttachment(id: string): Promise<MeetingAttachment | undefined> {
  const rows = await db
    .select()
    .from(meetingAttachments)
    .where(eq(meetingAttachments.id, id))
    .limit(1);
  return rows[0];
}

export async function createMeetingAttachment(
  data: Omit<MeetingAttachment, "id" | "createdAt">
): Promise<MeetingAttachment> {
  const rows = await db.insert(meetingAttachments).values(data).returning();
  return rows[0];
}

export async function deleteMeetingAttachment(id: string): Promise<void> {
  await db.delete(meetingAttachments).where(eq(meetingAttachments.id, id));
}

export async function getAgendaCountForCompanyYear(
  companyId: string,
  year: string
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(agendaItems)
    .innerJoin(meetings, eq(agendaItems.meetingId, meetings.id))
    .where(
      and(
        eq(meetings.companyId, companyId),
        sql`substring(${meetings.date}, 1, 4) = ${year}`
      )
    );
  return Number(rows[0]?.count ?? 0);
}

export async function createAgendaItem(
  data: Omit<AgendaItem, "id">
): Promise<AgendaItem> {
  const rows = await db.insert(agendaItems).values(data).returning();
  return rows[0];
}

export async function updateAgendaItem(
  id: string,
  data: Partial<AgendaItem>
): Promise<AgendaItem | null> {
  const rows = await db
    .update(agendaItems)
    .set(data)
    .where(eq(agendaItems.id, id))
    .returning();
  return rows[0] ?? null;
}

// --- Signatures ---
export async function getSignatures(meetingId: string): Promise<Signature[]> {
  return db
    .select()
    .from(signatures)
    .where(eq(signatures.meetingId, meetingId));
}

export async function getMeetingAttendees(meetingId: string): Promise<MeetingAttendee[]> {
  return db
    .select()
    .from(meetingAttendees)
    .where(eq(meetingAttendees.meetingId, meetingId));
}

export async function replaceMeetingAttendees(
  meetingId: string,
  attendees: { boardMemberId: string; present: boolean }[]
): Promise<void> {
  await db.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, meetingId));
  if (attendees.length === 0) return;
  await db.insert(meetingAttendees).values(
    attendees.map((a) => ({
      meetingId,
      boardMemberId: a.boardMemberId,
      present: a.present,
    }))
  );
}

export async function deleteSignaturesByMeeting(meetingId: string): Promise<void> {
  await db.delete(signatures).where(eq(signatures.meetingId, meetingId));
}

export async function createSignature(
  data: Omit<Signature, "id">
): Promise<Signature> {
  const rows = await db.insert(signatures).values(data).returning();
  return rows[0];
}

export async function updateSignature(
  id: string,
  data: Partial<Signature>
): Promise<Signature | null> {
  const rows = await db
    .update(signatures)
    .set(data)
    .where(eq(signatures.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteMeetingById(id: string): Promise<void> {
  await db.delete(meetings).where(eq(meetings.id, id));
}

export async function getSignatureByMember(
  meetingId: string,
  boardMemberId: string
): Promise<Signature | undefined> {
  const rows = await db
    .select()
    .from(signatures)
    .where(and(eq(signatures.meetingId, meetingId), eq(signatures.boardMemberId, boardMemberId)));
  return rows[0];
}

// --- Signing tokens ---
export async function createSigningToken(
  data: Omit<SigningToken, "id" | "createdAt" | "usedAt">
): Promise<SigningToken> {
  const rows = await db.insert(signingTokens).values(data).returning();
  return rows[0];
}

export async function getSigningTokenByToken(token: string): Promise<SigningToken | undefined> {
  const rows = await db
    .select()
    .from(signingTokens)
    .where(eq(signingTokens.token, token));
  return rows[0];
}

export async function markSigningTokenUsed(id: string): Promise<void> {
  await db
    .update(signingTokens)
    .set({ usedAt: new Date() })
    .where(eq(signingTokens.id, id));
}
