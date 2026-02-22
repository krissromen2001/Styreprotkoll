"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_FIRST_AGENDA_ITEM,
  DEFAULT_OPTIONAL_BOARD_AGENDA_ITEMS,
  DEFAULT_GENERAL_ASSEMBLY_ITEMS,
  DEFAULT_EXTRAORDINARY_ASSEMBLY_ITEMS,
  MEETING_TYPE_LABELS,
} from "@/lib/constants";
import { formatAgendaNumber } from "@/lib/utils";
import { createNewMeeting } from "@/lib/actions/meetings";

interface AgendaItem {
  id: string;
  title: string;
  description: string;
}

let nextId = 1;
function genId() {
  return String(nextId++);
}

function isCoAddress(address: string) {
  return /^\s*c\/?o\b/i.test(address.trim());
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [meetingType, setMeetingType] = useState<
    "board_meeting" | "general_assembly" | "extraordinary_general_assembly"
  >("board_meeting");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [baseOffset, setBaseOffset] = useState(0);
  const [meetingMode, setMeetingMode] = useState<"physical" | "digital">("physical");
  const [prefilledAddress, setPrefilledAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [room, setRoom] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invitationAttachments, setInvitationAttachments] = useState<File[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    { id: genId(), title: DEFAULT_FIRST_AGENDA_ITEM.title, description: DEFAULT_FIRST_AGENDA_ITEM.description },
  ]);

  const buildDefaultAgenda = (
    type: "board_meeting" | "general_assembly" | "extraordinary_general_assembly"
  ) => {
    const baseItems = [
      { id: genId(), title: DEFAULT_FIRST_AGENDA_ITEM.title, description: DEFAULT_FIRST_AGENDA_ITEM.description },
    ];

    if (type === "general_assembly") {
      DEFAULT_GENERAL_ASSEMBLY_ITEMS.forEach((item) => {
        baseItems.push({ id: genId(), title: item.title, description: item.description });
      });
    }

    if (type === "extraordinary_general_assembly") {
      DEFAULT_EXTRAORDINARY_ASSEMBLY_ITEMS.forEach((item) => {
        baseItems.push({ id: genId(), title: item.title, description: item.description });
      });
    }

    return baseItems;
  };

  const addItem = () => {
    setAgendaItems([...agendaItems, { id: genId(), title: "", description: "" }]);
  };

  const addOptionalStandardItem = (title: string, description: string) => {
    const exists = agendaItems.some(
      (item) => item.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (exists) return;
    setAgendaItems([...agendaItems, { id: genId(), title, description }]);
  };

  const removeItem = (id: string) => {
    setAgendaItems(agendaItems.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: "title" | "description", value: string) => {
    setAgendaItems(
      agendaItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...agendaItems];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setAgendaItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value || submitter?.getAttribute("data-intent") || "draft";

    const activeCompanyId = companyId;
    if (!activeCompanyId) {
      setError("Du må registrere et selskap først.");
      setSubmitting(false);
      router.push("/companies/connect");
      return;
    }

    const formData = new FormData();
    formData.set("companyId", activeCompanyId);
    formData.set("meetingMode", meetingMode);
    formData.set("meetingLink", meetingLink);
    formData.set("address", address);
    formData.set("room", room);
    formData.set("date", date);
    formData.set("time", time);
    formData.set("type", meetingType);
    formData.set("intent", intent);
    formData.set("agendaItems", JSON.stringify(agendaItems.map((item) => ({
      title: item.title,
      description: item.description,
    }))));
    invitationAttachments.forEach((file) => {
      formData.append("invitationAttachments", file);
    });

    const result = await createNewMeeting(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
  };

  useEffect(() => {
    const loadCompany = async () => {
      const companiesRes = await fetch("/api/company");
      const companiesData = await companiesRes.json();
      if (companiesData?.id) {
        setCompanyId(companiesData.id);
        if (!prefilledAddress && companiesData.address && isCoAddress(companiesData.address)) {
          setAddress(companiesData.address);
          setPrefilledAddress(true);
        }
      }
    };
    loadCompany();
  }, [prefilledAddress]);

  useEffect(() => {
    const loadBase = async () => {
      if (!companyId || !date) {
        setBaseOffset(0);
        return;
      }
      const res = await fetch("/api/agenda-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, date }),
      });
      const data = await res.json();
      setBaseOffset(typeof data.base === "number" ? data.base : 0);
    };
    loadBase();
  }, [companyId, date]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Nytt møte</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mt-2 font-display">
          Opprett innkalling
        </h1>
        <p className="text-slate-600 mt-2">
          Fyll inn møtedetaljer og dagsorden. Du kan lagre et utkast eller sende innkalling direkte.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/80 border border-black/5 rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Møtedetaljer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Møtetype</label>
              <select
                value={meetingType}
                onChange={(e) => {
                  const type = e.target.value as typeof meetingType;
                  setMeetingType(type);
                  setAgendaItems(buildDefaultAgenda(type));
                }}
                className="w-full px-3 py-2.5 border border-black/10 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="board_meeting">{MEETING_TYPE_LABELS.board_meeting}</option>
                <option value="general_assembly">{MEETING_TYPE_LABELS.general_assembly}</option>
                <option value="extraordinary_general_assembly">
                  {MEETING_TYPE_LABELS.extraordinary_general_assembly}
                </option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Møteform</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMeetingMode("physical")}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    meetingMode === "physical"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white border-black/10 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Fysisk møte
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingMode("digital")}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    meetingMode === "digital"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white border-black/10 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Digitalt møte
                </button>
              </div>
            </div>
            {meetingMode === "digital" ? (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Møtelenke</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="Valgfritt (Google Meet kan opprettes automatisk ved utsending)"
                  className="w-full px-3 py-2.5 border border-black/10 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Hvis du er koblet til Google Kalender, kan appen opprette Google Meet automatisk når du sender innkallingen.
                </p>
              </div>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="F.eks. Sem Sælands vei 1, 7034 Trondheim"
                    className="w-full px-3 py-2.5 border border-black/10 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rom</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="F.eks. Store Møterom, FRAM"
                    className="w-full px-3 py-2.5 border border-black/10 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dato</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-black/10 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Klokkeslett</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-black/10 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 border border-black/5 rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Dagsorden</h2>
            <button type="button" onClick={addItem} className="text-sm text-slate-700 hover:text-slate-900 font-medium">
              + Legg til sak
            </button>
          </div>

          <div className="space-y-3">
            {agendaItems.map((item, index) => {
              const isFirst = index === 0;
              const isFixed = isFirst;

              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-4 ${isFixed ? "bg-slate-50 border-slate-200" : "border-black/10 bg-white"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-slate-400 mt-2 w-10">
                      {formatAgendaNumber(baseOffset + index + 1, date)}
                    </span>
                    <div className="flex-1 space-y-2">
                      {isFixed ? (
                        <>
                          <p className="font-medium text-sm text-slate-700 py-2">{item.title}</p>
                          {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            required
                            placeholder="Tittel på sak"
                            value={item.title}
                            onChange={(e) => updateItem(item.id, "title", e.target.value)}
                            className="w-full px-3 py-2.5 border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                          />
                          <textarea
                            placeholder="Beskrivelse (valgfritt)"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2.5 border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 resize-none"
                          />
                        </>
                      )}
                    </div>
                    {!isFixed && (
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => moveItem(index, "up")} disabled={index <= 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs p-1" title="Flytt opp">&#9650;</button>
                        <button type="button" onClick={() => moveItem(index, "down")} disabled={index >= agendaItems.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs p-1" title="Flytt ned">&#9660;</button>
                        <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-xs p-1" title="Fjern">&#10005;</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {meetingType === "board_meeting" && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Valgfrie standardsaker
              </p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_OPTIONAL_BOARD_AGENDA_ITEMS.map((item) => {
                  const exists = agendaItems.some(
                    (agendaItem) =>
                      agendaItem.title.trim().toLowerCase() === item.title.trim().toLowerCase()
                  );
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => addOptionalStandardItem(item.title, item.description)}
                      disabled={exists}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exists ? "Lagt til:" : "+ "} {item.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/80 border border-black/5 rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
          <div>
            <h2 className="font-semibold text-slate-900">Vedlegg til innkalling</h2>
            <p className="text-sm text-slate-600 mt-1">
              Last opp dokumenter til orientering, for eksempel budsjett eller portefølje.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dokumenter</label>
            <input
              type="file"
              multiple
              onChange={(e) => setInvitationAttachments(Array.from(e.target.files || []))}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black"
            />
            <p className="mt-2 text-xs text-slate-500">
              Maks 8 filer. Maks 15 MB per fil (40 MB totalt).
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ved sending av innkalling blir filer lagt ved i e-post når størrelse tillater det. Store vedlegg
              sendes som lenker.
            </p>
          </div>

          {invitationAttachments.length > 0 && (
            <div className="rounded-xl border border-black/5 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Valgte vedlegg</p>
              <ul className="space-y-1.5">
                {invitationAttachments.map((file) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between gap-3 text-sm text-slate-700"
                  >
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="text-sm text-slate-500">
          &quot;Eventuelt&quot; legges ikke lenger automatisk til i innkallingen, men kan legges til
          senere i protokollen ved behov.
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            value="draft"
            disabled={submitting}
            className="px-6 py-2.5 rounded-full border border-black/10 hover:bg-white disabled:opacity-50 transition-colors font-medium"
          >
            {submitting ? "Lagrer..." : "Lagre utkast"}
          </button>
          <button
            type="submit"
            value="send"
            disabled={submitting}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-black disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            {submitting ? "Sender..." : "Send innkalling"}
          </button>
        </div>
      </form>
    </div>
  );
}
