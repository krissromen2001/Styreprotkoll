import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 52,
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
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  paragraph: {
    marginBottom: 7,
  },
  section: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  attendeeLine: {
    marginBottom: 2,
  },
  sakBlock: {
    marginTop: 10,
  },
  sakTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  vedtakLabel: {
    fontFamily: "Helvetica-Bold",
  },
  signatureBlock: {
    marginTop: 24,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  signaturePerson: {
    width: "47%",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#111",
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 10,
  },
  signatureRole: {
    fontSize: 10,
    color: "#444",
  },
  signatureSigned: {
    marginTop: 2,
    fontSize: 9,
    color: "#555",
  },
  footer: {
    position: "absolute",
    left: 54,
    right: 54,
    bottom: 22,
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
  decision?: string;
}

interface Signature {
  name: string;
  role: string;
  signedAt?: string;
}

interface Attendee {
  name: string;
  role: string;
  present: boolean;
}

interface ProtocolPDFProps {
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
  attendees?: Attendee[];
  signatures: Signature[];
  location?: string;
}

export function ProtocolPDF({
  companyName,
  orgNumber,
  address,
  room,
  meetingMode = "physical",
  date,
  time,
  meetingType = "board_meeting",
  agendaItems,
  attendees = [],
  signatures,
}: ProtocolPDFProps) {
  const formattedOrgNumber = formatOrgNumber(orgNumber);
  const formatSignedDate = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("nb-NO");
  };

  const meetingTitle =
    meetingType === "general_assembly"
      ? "GENERALFORSAMLINGSPROTOKOLL"
      : meetingType === "extraordinary_general_assembly"
        ? "PROTOKOLL FRA EKSTRAORDINÆR GENERALFORSAMLING"
        : "STYREMØTEPROTOKOLL";
  const meetingIntroTitle =
    meetingType === "board_meeting" ? "styremøte" : "møte";
  const locationLine =
    meetingMode === "digital"
      ? `digitalt møte${room?.trim() ? ` (${room})` : ""}`
      : `${address}${room?.trim() ? `, ${room}` : ""}`;
  const year = (() => {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) return String(d.getFullYear());
    const m = String(date).match(/\b(20\d{2})\b/);
    return m?.[1] ?? "20__";
  })();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.topNote}>
          Malen er utformet i samme stil som klassisk norsk styreprotokoll.
        </Text>

        <Text style={styles.title}>{meetingTitle}</Text>

        <Text style={styles.paragraph}>
          Det ble den {date} kl. {time} avholdt {meetingIntroTitle} i {companyName} (org.nr.{" "}
          {formattedOrgNumber}) {meetingMode === "digital" ? "som " : "i "} {locationLine}.
        </Text>

        {attendees.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>På møtet deltok:</Text>
            {attendees.filter((a) => a.present).map((a, idx) => (
              <Text key={`present-${idx}`} style={styles.attendeeLine}>
                {a.name} ({a.role})
              </Text>
            ))}
            <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Forfall:</Text>
            {attendees.filter((a) => !a.present).length === 0 ? (
              <Text style={styles.attendeeLine}>Ingen forfall.</Text>
            ) : (
              attendees.filter((a) => !a.present).map((a, idx) => (
                <Text key={`absent-${idx}`} style={styles.attendeeLine}>
                  {a.name} ({a.role})
                </Text>
              ))
            )}
          </View>
        )}

        <Text style={styles.paragraph}>Godkjenning av innkalling og dagsorden.</Text>

        {agendaItems.map((item, index) => (
          <View key={item.sortOrder} style={styles.sakBlock}>
            <Text style={styles.sakTitle}>
              Sak nr. {String(index + 1).padStart(2, "0")}/{year} {item.title}
            </Text>
            <Text>
              <Text style={styles.vedtakLabel}>Vedtak: </Text>
              {item.decision?.trim() || "Ingen vedtak ført i denne saken."}
            </Text>
            {item.decision?.trim() ? (
              <Text style={styles.paragraph}>Vedtaket var enstemmig.</Text>
            ) : null}
          </View>
        ))}

        <View style={styles.signatureBlock}>
          {Array.from({ length: Math.ceil(signatures.length / 2) }).map((_, rowIdx) => (
            <View key={rowIdx} style={styles.signatureRow}>
              {signatures.slice(rowIdx * 2, rowIdx * 2 + 2).map((sig, idx) => (
                <View key={idx} style={styles.signaturePerson}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureName}>Signatur: {sig.name}</Text>
                  <Text style={styles.signatureRole}>{sig.role}</Text>
                  {sig.signedAt ? (
                    <Text style={styles.signatureSigned}>
                      Digitalt signert {formatSignedDate(sig.signedAt)}
                    </Text>
                  ) : null}
                </View>
              ))}
              {signatures.slice(rowIdx * 2, rowIdx * 2 + 2).length === 1 && (
                <View style={styles.signaturePerson} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>Dato: {date}</Text>
          <Text>org.nr. {formattedOrgNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
