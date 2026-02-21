import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.5 },
  title: { fontSize: 20, marginBottom: 16, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 11, marginBottom: 2 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 4 },
  sakTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4 },
  text: { fontSize: 11 },
  signatureBlock: { marginTop: 30 },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  signaturePerson: { width: "45%", borderTopWidth: 1, borderTopColor: "#000", paddingTop: 4 },
  signatureName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  signatureRole: { fontSize: 10 },
  signatureDate: { fontSize: 9, color: "#666", marginTop: 2 },
  footer: { position: "absolute", bottom: 40, left: 60, right: 60, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: "#666" },
});

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

interface ProtocolPDFProps {
  companyName: string;
  orgNumber: string;
  address: string;
  room: string;
  date: string;
  time: string;
  meetingType?: "board_meeting" | "general_assembly" | "extraordinary_general_assembly";
  agendaItems: AgendaItem[];
  signatures: Signature[];
  location?: string;
}

export function ProtocolPDF({
  companyName,
  orgNumber,
  address,
  room,
  date,
  time,
  meetingType = "board_meeting",
  agendaItems,
  signatures,
  location = "Trondheim, Norge",
}: ProtocolPDFProps) {
  const meetingTitle =
    meetingType === "general_assembly"
      ? "Generalforsamling"
      : meetingType === "extraordinary_general_assembly"
        ? "Ekstraordinær generalforsamling"
        : "Styremøte";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Protokoll til {meetingTitle.toLowerCase()} i {companyName} (org nr {orgNumber})
        </Text>

        <View style={styles.section}>
          <Text style={styles.meta}>Adresse: {address}</Text>
          <Text style={styles.meta}>Rom: {room}</Text>
          <Text style={styles.meta}>Tidspunkt: {date} kl {time}</Text>
        </View>

        <Text style={styles.sectionTitle}>Saker:</Text>

        {agendaItems.map((item) => (
          <View key={item.sortOrder}>
            <Text style={styles.sakTitle}>
              {item.sortOrder}. {item.title}
            </Text>
            {item.decision && <Text style={styles.text}>{item.decision}</Text>}
          </View>
        ))}

        {/* Signatures */}
        <View style={styles.signatureBlock}>
          {/* Render signatures in pairs */}
          {Array.from({ length: Math.ceil(signatures.length / 2) }).map((_, rowIdx) => (
            <View key={rowIdx} style={styles.signatureRow}>
              {signatures.slice(rowIdx * 2, rowIdx * 2 + 2).map((sig, idx) => (
                <View key={idx} style={styles.signaturePerson}>
                  <Text style={styles.signatureName}>{sig.name}</Text>
                  <Text style={styles.signatureRole}>{sig.role}</Text>
                  {sig.signedAt && (
                    <Text style={styles.signatureDate}>
                      [Digitalt signert {sig.signedAt}]
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{location}</Text>
          <Text>{date}</Text>
          <Text>org nr {orgNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}</Text>
        </View>
      </Page>
    </Document>
  );
}
