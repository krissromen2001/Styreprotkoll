"use client";

import { useRouter } from "next/navigation";
import { setActiveCompany } from "@/lib/actions/companies";

export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: { id: string; name: string }[];
  activeCompanyId: string;
}) {
  const router = useRouter();

  const handleChange = (value: string) => {
    if (value === "__add__") {
      router.push("/companies/connect");
      return;
    }
    const form = document.getElementById("company-switcher-form") as HTMLFormElement | null;
    if (form) form.requestSubmit();
  };

  return (
    <form id="company-switcher-form" action={setActiveCompany} className="flex items-center gap-2">
      <label className="text-xs uppercase tracking-wide text-slate-500 hidden sm:block">
        Representerer
      </label>
      <div className="relative">
        <select
          name="companyId"
          defaultValue={activeCompanyId}
          onChange={(e) => handleChange(e.target.value)}
          className="appearance-none pr-10 pl-4 py-2 rounded-full text-sm bg-white border border-black/10 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
          <option value="__add__">+ Legg til selskap</option>
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
          ▾
        </span>
      </div>
    </form>
  );
}
