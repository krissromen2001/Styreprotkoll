import { getCompaniesForUser, getBoardMembers, getBoardMemberByEmail } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { BoardMemberActions } from "@/components/board-members/board-member-actions";
import { AddBoardMemberForm } from "@/components/board-members/add-member-form";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSelectedCompanyId } from "@/lib/company-selection";
import { BoardMemberEmail } from "@/components/board-members/board-member-email";

export const dynamic = "force-dynamic";

export default async function BoardMembersPage() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="text-4xl mb-4">&#128272;</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Logg inn for å fortsette</h2>
        <p className="text-gray-500 mb-6">
          Du må logge inn for å administrere styremedlemmer.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block bg-black text-white px-6 py-2.5 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          Logg inn
        </Link>
      </div>
    );
  }

  const companies = await getCompaniesForUser(session.user.email);

  if (companies.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="text-4xl mb-4">&#127970;</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Ingen selskap registrert</h2>
        <p className="text-gray-500 mb-6">
          Registrer et selskap først for å administrere styremedlemmer.
        </p>
        <Link
          href="/companies/connect"
          className="inline-block bg-black text-white px-6 py-2.5 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          Koble til selskap
        </Link>
      </div>
    );
  }

  const selectedId = (await getSelectedCompanyId()) ?? companies[0].id;
  const company = companies.find((c) => c.id === selectedId) ?? companies[0];
  const members = await getBoardMembers(company.id);
  const currentMember = await getBoardMemberByEmail(company.id, session.user.email);
  const canManage = currentMember?.role === "styreleder";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Styremedlemmer</h1>
          <p className="text-gray-600 mt-1">{company.name}</p>
        </div>
      </div>

      {canManage && <AddBoardMemberForm companyId={company.id} />}

      {members.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Navn</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">E-post</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Rolle</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    <BoardMemberEmail memberId={member.id} email={member.email} canManage={canManage} />
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{ROLE_LABELS[member.role]}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        member.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {member.active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <BoardMemberActions memberId={member.id} active={member.active} canManage={canManage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Ingen styremedlemmer lagt til ennå.</p>
        </div>
      )}
    </div>
  );
}
