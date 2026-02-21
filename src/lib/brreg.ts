export interface BrregCompany {
  organisasjonsnummer: string;
  navn: string;
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
  };
}

export interface BrregPerson {
  fornavn: string;
  mellomnavn?: string;
  etternavn: string;
}

export interface BrregRole {
  type: { kode: string; beskrivelse: string };
  person: {
    fodselsdato: string;
    navn: BrregPerson;
    erDoed: boolean;
  };
  fratraadt: boolean;
}

export interface BrregRoleGroup {
  type: { kode: string; beskrivelse: string };
  roller: BrregRole[];
}

export interface BrregBoardMember {
  name: string;
  role: "styreleder" | "nestleder" | "styremedlem" | "varamedlem";
}

const ROLE_MAP: Record<string, BrregBoardMember["role"]> = {
  LEDE: "styreleder",
  NEST: "nestleder",
  MEDL: "styremedlem",
  VARA: "varamedlem",
};

export async function lookupCompany(orgNumber: string): Promise<BrregCompany | null> {
  const cleaned = orgNumber.replace(/\s/g, "");
  const res = await fetch(
    `https://data.brreg.no/enhetsregisteret/api/enheter/${cleaned}`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function lookupBoardMembers(orgNumber: string): Promise<BrregBoardMember[]> {
  const cleaned = orgNumber.replace(/\s/g, "");
  const res = await fetch(
    `https://data.brreg.no/enhetsregisteret/api/enheter/${cleaned}/roller`
  );
  if (!res.ok) return [];

  const data = await res.json();
  const boardGroup = (data.rollegrupper as BrregRoleGroup[])?.find(
    (g) => g.type.kode === "STYR"
  );
  if (!boardGroup) return [];

  return boardGroup.roller
    .filter((r) => !r.fratraadt)
    .map((r) => {
      const { fornavn, mellomnavn, etternavn } = r.person.navn;
      const nameParts = [fornavn, mellomnavn, etternavn].filter(Boolean);
      return {
        name: nameParts.join(" "),
        role: ROLE_MAP[r.type.kode] || "styremedlem",
      };
    });
}
