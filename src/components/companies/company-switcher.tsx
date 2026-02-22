"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? companies[0],
    [companies, activeCompanyId]
  );
  const orderedCompanies = useMemo(() => {
    if (!activeCompany) return companies;
    return [
      activeCompany,
      ...companies.filter((company) => company.id !== activeCompany.id),
    ];
  }, [companies, activeCompany]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelectCompany = (companyId: string) => {
    if (!activeCompany) return;
    if (companyId === activeCompany.id) {
      setOpen(false);
      return;
    }
    if (!formRef.current || !inputRef.current) return;
    inputRef.current.value = companyId;
    setSubmitting(true);
    setOpen(false);
    formRef.current.requestSubmit();
  };

  const handleNavigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!activeCompany) return null;

  return (
    <div ref={menuRef} className="flex items-center">
      <form ref={formRef} action={setActiveCompany}>
        <input ref={inputRef} type="hidden" name="companyId" defaultValue={activeCompany.id} />
      </form>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          disabled={submitting}
          className="inline-flex items-center gap-2 pr-3 pl-4 py-2 rounded-full text-sm bg-white border border-black/10 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-60"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="max-w-[14rem] truncate">{activeCompany.name}</span>
          <span className="text-slate-500 text-base leading-none">▾</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-black/10 bg-white shadow-lg p-2 z-30">
            <div className="max-h-64 overflow-auto p-1">
              {orderedCompanies.map((company) => {
                const isActive = company.id === activeCompany.id;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleSelectCompany(company.id)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-colors ${
                      isActive ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className={`truncate pr-2 ${isActive ? "font-semibold" : "font-medium"}`}>
                      {company.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleNavigate("/companies/connect")}
                className="w-full rounded-xl px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition-colors font-medium"
              >
                + Legg til selskap
              </button>
            </div>

            <div className="my-1 h-px bg-black/5" />

            <div className="p-1">
              <button
                type="button"
                onClick={() => handleNavigate("/board-members")}
                className="w-full rounded-xl px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Styremedlemmer
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("/feedback")}
                className="w-full rounded-xl px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Gi tilbakemelding
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
