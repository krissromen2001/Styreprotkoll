export const MEETING_STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  invitation_sent: "Innkalling sendt",
  protocol_draft: "Protokoll under arbeid",
  pending_signatures: "Venter på signaturer",
  signed: "Signert",
};

export const MEETING_TYPE_LABELS: Record<string, string> = {
  board_meeting: "Styremøte",
  general_assembly: "Generalforsamling",
  extraordinary_general_assembly: "Ekstraordinær generalforsamling",
};

export const MEETING_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  invitation_sent: "bg-blue-100 text-blue-700",
  protocol_draft: "bg-yellow-100 text-yellow-700",
  pending_signatures: "bg-orange-100 text-orange-700",
  signed: "bg-green-100 text-green-700",
};

export const ROLE_LABELS: Record<string, string> = {
  styreleder: "Styreleder",
  nestleder: "Nestleder",
  styremedlem: "Styremedlem",
  varamedlem: "Varamedlem",
};

export const DEFAULT_FIRST_AGENDA_ITEM = {
  title: "Godkjennelse av innkalling og dagsorden",
  description: "Styret går igjennom innkalling og dagsorden for møtet",
};

export const DEFAULT_LAST_AGENDA_ITEM = {
  title: "Eventuelt",
  description: "",
};

export const DEFAULT_GENERAL_ASSEMBLY_ITEMS = [
  { title: "Valg av møteleder", description: "" },
  { title: "Valg av referent", description: "" },
  { title: "Godkjenning av årsregnskap og årsberetning", description: "" },
  { title: "Gjennomgang av budsjett", description: "" },
  { title: "Valg av styremedlemmer", description: "" },
  { title: "Valg av styreleder", description: "" },
];

export const DEFAULT_EXTRAORDINARY_ASSEMBLY_ITEMS = [
  { title: "Valg av møteleder", description: "" },
  { title: "Valg av referent", description: "" },
  { title: "Saker til ekstraordinær behandling", description: "" },
];
