import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import {
  getAgendaItems,
  getBoardMemberByEmail,
  getCompany,
  getMeeting,
} from "@/lib/store";
import { InvitationPDF } from "@/components/pdf/invitation-pdf";
import { MEETING_TYPE_LABELS } from "@/lib/constants";

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

  const pdfBuffer = await renderToBuffer(
    InvitationPDF({
      companyName: company?.name || "Selskapet",
      orgNumber: company?.orgNumber || "",
      address: meeting.address || "",
      room: meeting.room || "",
      date: meeting.date,
      time: meeting.time,
      meetingType: meeting.type,
      agendaItems: agendaItems.map((item) => ({
        sortOrder: item.sortOrder,
        title: item.title,
        description: item.description || "",
      })),
    })
  );

  const meetingTypeLabel = MEETING_TYPE_LABELS[meeting.type] || "Mote";
  const safeLabel = meetingTypeLabel.replace(/\s+/g, "_");

  return new NextResponse(pdfBuffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Innkalling_${safeLabel}_${meeting.date}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
