import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatAgendaNumber } from "@/lib/utils";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 54,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.45,
    color: "#111",
  },
  topNote: {
    fontSize: 9,
    color: "#666",
    marginBottom: 14,
  },
  recipientLine: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
  },
  paragraph: {
    marginBottom: 8,
  },
  metaBlock: {
    marginBottom: 10,
  },
  metaLine: {
    marginBottom: 2,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  agendaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  agendaNumber: {
    width: 44,
  },
  agendaContent: {
    flex: 1,
  },
  agendaMainLine: {
    marginBottom: 2,
  },
  agendaDescription: {
    color: "#333",
  },
  divider: {
    marginTop: 8,
    marginBottom: 8,
  },
  closing: {
    marginTop: 14,
  },
  signatureLine: {
    marginTop: 20,
    width: 220,
    borderTopWidth: 1,
    borderTopColor: "#111",
    paddingTop: 4,
  },
  attachmentTitle: {
    marginTop: 14,
    fontFamily: "Helvetica-Bold",
  },
  attachmentItem: {
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    left: 54,
    right: 54,
    bottom: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#666",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 6,
  },
});

function formatOrgNumber(orgNumber: string) {
  const digits = (orgNumber || "").replace(/\s+/g, "");
  return digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}

interface AgendaItem {
  sortOrder: number;
  title: string;
  description?: string;
}

interface InvitationPDFProps {
  companyName: string;
  orgNumber: string;
  address: string;
  room: string;
  meetingMode?: "physical" | "digital";
  meetingLink?: string;
  date: string;
  time: string;
  meetingType?: "board_meeting" | "general_assembly" | "extraordinary_general_assembly";
  agendaItems: AgendaItem[];
  attachmentNames?: string[];
}

export function InvitationPDF({
  companyName,
  orgNumber,
  address,
  room,
  meetingMode = "physical",
  meetingLink = "",
  date,
  time,
  meetingType = "board_meeting",
  agendaItems,
  attachmentNames = [],
}: InvitationPDFProps) {
  const formattedOrgNumber = formatOrgNumber(orgNumber);
  const meetingTitle =
    meetingType === "general_assembly"
      ? "ordinær generalforsamling"
      : meetingType === "extraordinary_general_assembly"
        ? "ekstraordinær generalforsamling"
        : "styremøte";
  const recipientLabel =
    meetingType === "board_meeting" ? "Til styremedlemmer i" : "Til aksjeeiere i";
  const introText =
    meetingType === "board_meeting"
      ? `Det innkalles herved til ${meetingTitle}.`
      : `Aksjeeierne i ${companyName} innkalles til ${meetingTitle}.`;
  const placeLine =
    meetingMode === "digital"
      ? `Møteform: Digitalt møte${meetingLink ? ` (${meetingLink})` : ""}`
      : `Møtested: ${address}${room?.trim() ? `, ${room}` : ""}`;
  const closingRole =
    meetingType === "board_meeting" ? "styreleder" : "for styret";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.topNote}>
          Malen er utformet i samme stil som klassisk norsk styreprotokoll.
        </Text>

        <Text style={styles.recipientLine}>
          {recipientLabel} &quot;{companyName}&quot; (org.nr. {formattedOrgNumber})
        </Text>

        <Text style={styles.title}>
          Innkalling til {meetingTitle} i {companyName}
        </Text>

        <Text style={styles.paragraph}>{introText}</Text>

        <View style={styles.metaBlock}>
          <Text style={styles.metaLine}>Dato: {date}</Text>
          <Text style={styles.metaLine}>Tidspunkt: kl. {time}</Text>
          <Text style={styles.metaLine}>{placeLine}</Text>
        </View>

        <Text style={styles.sectionTitle}>Dagsorden:</Text>

        {agendaItems.map((item, index) => (
          <View key={item.sortOrder} style={styles.agendaRow}>
            <Text style={styles.agendaNumber}>{index + 1}.</Text>
            <View style={styles.agendaContent}>
              <Text style={styles.agendaMainLine}>
                {formatAgendaNumber(item.sortOrder, date)} {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.agendaDescription}>{item.description}</Text>
              ) : null}
            </View>
          </View>
        ))}

        <View style={styles.divider}>
          <Text>---</Text>
        </View>

        <Text style={styles.paragraph}>
          Eventuelle vedlegg og relevant dokumentasjon følger innkallingen.
        </Text>

        <Text style={styles.paragraph}>
          Med vennlig hilsen
        </Text>

        <View style={styles.closing}>
          <Text>For {companyName}</Text>
          <Text style={styles.signatureLine}>{closingRole}</Text>
        </View>

        {attachmentNames.length > 0 && (
          <View>
            <Text style={styles.attachmentTitle}>Vedlegg</Text>
            {attachmentNames.map((name, index) => (
              <Text key={`${name}-${index}`} style={styles.attachmentItem}>
                {index + 1}. {name}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text>Dato: {date}</Text>
          <Text>org.nr. {formattedOrgNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
