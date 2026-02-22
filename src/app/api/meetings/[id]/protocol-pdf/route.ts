import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import {
  getAgendaItems,
  getBoardMemberByEmail,
  getBoardMembers,
  getCompany,
  getMeeting,
  getMeetingAttendees,
  getSignatures,
} from "@/lib/store";
import { ProtocolPDF } from "@/components/pdf/protocol-pdf";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const meeting = await getMeeting(id);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const member = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await getCompany(meeting.companyId);
  const agendaItems = await getAgendaItems(meeting.id);
  const members = await getBoardMembers(meeting.companyId);
  const attendance = await getMeetingAttendees(meeting.id);
  const signatures = await getSignatures(meeting.id);
  const attendanceMap = new Map(attendance.map((a) => [a.boardMemberId, a.present]));

  const signaturesForPdf =
    signatures.length > 0
      ? signatures.map((sig) => {
          const sigMember = members.find((m) => m.id === sig.boardMemberId);
          return {
            name: sigMember?.name || "Ukjent",
            role: sigMember?.role || "",
            signedAt: sig.signedAt ? sig.signedAt.toISOString() : undefined,
          };
        })
      : members
          .filter((m) => m.active)
          .map((m) => ({
            name: m.name,
            role: m.role,
          }));

  const pdfBuffer = await renderToBuffer(
    ProtocolPDF({
      companyName: company?.name || "Selskapet",
      orgNumber: company?.orgNumber || "",
      address: meeting.address || "",
      room: meeting.room || "",
      date: formatDate(meeting.date),
      time: meeting.time,
      meetingType: meeting.type,
      agendaItems: agendaItems.map((item) => ({
        sortOrder: item.sortOrder,
        title: item.title,
        decision: item.decision || "",
      })),
      attendees: members
        .filter((m) => m.active)
        .map((m) => ({
          name: m.name,
          role: m.role,
          present: attendanceMap.get(m.id) ?? true,
        })),
      signatures: signaturesForPdf,
    })
  );

  return new NextResponse(pdfBuffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Protokoll_${meeting.date}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
