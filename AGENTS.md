# AGENTS.md

## Project Overview
Styreprotokoll is a Next.js app for creating and managing board meeting invitations and protocols (styreprotokoller). The UI and user-facing content are in Norwegian, while code, comments, and technical documentation are in English.

## Stack
- Next.js 15 App Router with React 19.
- Tailwind CSS v4 for styling.
- NextAuth v5 beta with Resend email provider.
- Drizzle ORM targeting Vercel Postgres.
- @react-pdf/renderer for PDF generation.

## Architecture Notes
- App Router pages live in `src/app`.
- Server actions live in `src/lib/actions` and currently use an in-memory store.
- The in-memory store is in `src/lib/store.ts` and is used for all CRUD flows. It resets on each deployment.
- Database schema for Drizzle is in `src/lib/db/schema.ts`. Connection is in `src/lib/db/index.ts` but is not wired into the UI yet.
- API routes:
  - `src/app/api/brreg/route.ts` fetches company + board members from Brønnøysundregistrene.
  - `src/app/api/company/route.ts` returns the first company from the in-memory store.
  - `src/app/api/auth/[...nextauth]/route.ts` wires NextAuth handlers.
- PDF templates live in `src/components/pdf`.

## Conventions
- User-facing text and content: Norwegian.
- Code, comments, and technical docs: English.
- Keep the project structure flat unless complexity demands otherwise.

## Environment Variables
See `.env.example`:
- `POSTGRES_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `RESEND_API_KEY`

## Common Commands
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Key Files
- `src/app/page.tsx`: dashboard / landing flow.
- `src/app/meetings/*`: meeting detail, protocol, and signing flow.
- `src/app/companies/new/page.tsx`: company registration.
- `src/app/board-members/page.tsx`: board member management.
- `src/lib/store.ts`: in-memory data source used by server actions.
- `src/lib/constants.ts`: labels, colors, default agenda items.
- `src/lib/brreg.ts`: Brønnøysundregistrene lookup helpers.
- `src/components/pdf/*`: invitation and protocol PDF templates.
