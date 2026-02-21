import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.5 },
  title: { fontSize: 26, marginBottom: 20, fontFamily: "Helvetica" },
  subtitle: { fontSize: 11, marginBottom: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 12 },
  agendaTitle: { fontSize: 18, marginTop: 16, marginBottom: 6, fontFamily: "Helvetica" },
  agendaDescription: { fontSize: 11, marginBottom: 12 },
  metaLabel: { fontSize: 11 },
  separator: { marginTop: 20, marginBottom: 8 },
});

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
  date: string;
  time: string;
  agendaItems: AgendaItem[];
}

export function InvitationPDF({
  companyName,
  orgNumber,
  address,
  room,
  date,
  time,
  agendaItems,
}: InvitationPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Innkalling til styremøte</Text>

        <View style={styles.section}>
          <Text style={styles.subtitle}>
            Til alle styremedlemmer i {companyName}, organisasjonsnummer {orgNumber}
          </Text>
          <Text style={styles.subtitle}>
            (&quot;<Text style={styles.bold}>Selskapet</Text>&quot;).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Det innkalles herved til styremøte.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.metaLabel}>Adresse: {address}</Text>
          <Text style={styles.metaLabel}>Rom: {room}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.metaLabel}>Dato: {date}</Text>
          <Text style={styles.metaLabel}>Klokkeslett: {time}</Text>
        </View>

        <View style={styles.separator}>
          <Text>Følgende saker foreligger til behandling:</Text>
        </View>

        {agendaItems.map((item) => (
          <View key={item.sortOrder} style={{ marginBottom: 4 }}>
            <Text style={styles.agendaTitle}>
              {item.sortOrder}. {item.title}
            </Text>
            {item.description && (
              <Text style={styles.agendaDescription}>{item.description}</Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
