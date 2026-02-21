"use client";

import { useState } from "react";
import { addBoardMember } from "@/lib/actions/board-members";

export function AddBoardMemberForm({ companyId }: { companyId: string }) {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    formData.set("companyId", companyId);
    await addBoardMember(formData);
    setShowForm(false);
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setShowForm(!showForm)}
        className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium mb-4"
      >
        {showForm ? "Avbryt" : "Legg til medlem"}
      </button>

      {showForm && (
        <form
          action={handleSubmit}
          className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
              <select
                name="role"
                defaultValue="styremedlem"
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
    </div>
  );
}
