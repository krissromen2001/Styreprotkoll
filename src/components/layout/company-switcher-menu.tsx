"use client";

import { useEffect, useState } from "react";
import { CompanySwitcher } from "@/components/companies/company-switcher";

export function CompanySwitcherMenu() {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [companiesRes, activeRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/company"),
      ]);
      const list = await companiesRes.json();
      const active = await activeRes.json();
      setCompanies(Array.isArray(list) ? list : []);
      setActiveId(active?.id ?? null);
    };
    load();
  }, []);

  if (!activeId || companies.length === 0) return null;

  return (
    <CompanySwitcher companies={companies} activeCompanyId={activeId} />
  );
}
