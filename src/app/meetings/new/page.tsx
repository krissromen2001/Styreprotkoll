"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_FIRST_AGENDA_ITEM, DEFAULT_LAST_AGENDA_ITEM } from "@/lib/constants";
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

export default function NewMeetingPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [room, setRoom] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    { id: genId(), title: DEFAULT_FIRST_AGENDA_ITEM.title, description: DEFAULT_FIRST_AGENDA_ITEM.description },
  ]);

  const addItem = () => {
    setAgendaItems([...agendaItems, { id: genId(), title: "", description: "" }]);
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

  const allItems = [
    ...agendaItems,
    { id: "eventuelt", title: DEFAULT_LAST_AGENDA_ITEM.title, description: DEFAULT_LAST_AGENDA_ITEM.description },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Get company ID from API
    const companiesRes = await fetch("/api/company");
    const companiesData = await companiesRes.json();
    if (!companiesData.id) {
      setError("Du må registrere et selskap først.");
      setSubmitting(false);
      router.push("/companies/new");
      return;
    }

    const formData = new FormData();
    formData.set("companyId", companiesData.id);
    formData.set("address", address);
    formData.set("room", room);
    formData.set("date", date);
    formData.set("time", time);
    formData.set("agendaItems", JSON.stringify(allItems.map((item) => ({
      title: item.title,
      description: item.description,
    }))));

    const result = await createNewMeeting(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nytt styremøte</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Møtedetaljer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="F.eks. Sem Sælands vei 1, 7034 Trondheim"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rom</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="F.eks. Store Møterom, FRAM"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dato</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Klokkeslett</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Dagsorden</h2>
            <button type="button" onClick={addItem} className="text-sm text-black hover:text-gray-700 font-medium">
              + Legg til sak
            </button>
          </div>

          <div className="space-y-3">
            {allItems.map((item, index) => {
              const isFirst = index === 0;
              const isLast = item.id === "eventuelt";
              const isFixed = isFirst || isLast;

              return (
                <div
                  key={item.id}
                  className={`border rounded-md p-4 ${isFixed ? "bg-gray-50 border-gray-200" : "border-gray-200"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-gray-400 mt-2 w-6">{index + 1}.</span>
                    <div className="flex-1 space-y-2">
                      {isFixed ? (
                        <>
                          <p className="font-medium text-sm text-gray-700 py-2">{item.title}</p>
                          {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            required
                            placeholder="Tittel på sak"
                            value={item.title}
                            onChange={(e) => updateItem(item.id, "title", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                          />
                          <textarea
                            placeholder="Beskrivelse (valgfritt)"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                          />
                        </>
                      )}
                    </div>
                    {!isFixed && (
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => moveItem(index, "up")} disabled={index <= 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs p-1" title="Flytt opp">&#9650;</button>
                        <button type="button" onClick={() => moveItem(index, "down")} disabled={index >= allItems.length - 2} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs p-1" title="Flytt ned">&#9660;</button>
                        <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-xs p-1" title="Fjern">&#10005;</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-6 py-2.5 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium"
          >
            {submitting ? "Oppretter..." : "Opprett møte"}
          </button>
        </div>
      </form>
    </div>
  );
}
