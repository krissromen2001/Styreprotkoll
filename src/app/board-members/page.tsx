"use client";

import { useState } from "react";
import { ROLE_LABELS } from "@/lib/constants";

interface BoardMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

// Placeholder data from the reference PDF
const placeholderMembers: BoardMember[] = [
  { id: "1", name: "Kristian Romen", email: "", role: "styreleder", active: true },
  { id: "2", name: "Oscar Lae", email: "", role: "styremedlem", active: true },
  { id: "3", name: "Daniel Kjøle Skogland", email: "", role: "styremedlem", active: true },
  { id: "4", name: "Ingeborg Sofie Bogen", email: "", role: "styremedlem", active: true },
  { id: "5", name: "Celine Rønquist Slåttelia", email: "", role: "styremedlem", active: true },
];

export default function BoardMembersPage() {
  const [members] = useState<BoardMember[]>(placeholderMembers);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("styremedlem");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    // Will connect to server action later
    setShowForm(false);
    setFormName("");
    setFormEmail("");
    setFormRole("styremedlem");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Styremedlemmer</h1>
          <p className="text-gray-600 mt-1">Administrer styrets medlemmer</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          {showForm ? "Avbryt" : "Legg til medlem"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Navn
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-post
              </label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rolle
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="styreleder">Styreleder</option>
                <option value="nestleder">Nestleder</option>
                <option value="styremedlem">Styremedlem</option>
                <option value="varamedlem">Varamedlem</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm"
          >
            Legg til
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">
                Navn
              </th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">
                E-post
              </th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">
                Rolle
              </th>
              <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium text-gray-900">
                  {member.name}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {member.email || "—"}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {ROLE_LABELS[member.role]}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      member.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {member.active ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
