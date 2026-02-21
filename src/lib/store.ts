import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agendaItems,
  boardMembers,
  companies,
  emailVerificationTokens,
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

export interface Meeting {
  id: string;
  companyId: string;
  title: string | null;
  address: string | null;
  room: string | null;
  date: string;
  time: string;
  type: "board_meeting" | "general_assembly" | "extraordinary_general_assembly";
  status: "draft" | "invitation_sent" | "protocol_draft" | "pending_signatures" | "signed";
  protocolStoragePath: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Signature {
  id: string;
  meetingId: string;
  boardMemberId: string;
  signedAt: Date | null;
  typedName: string | null;
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
