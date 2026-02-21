import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { getBoardMembersByEmail, updateBoardMember } from "@/lib/store";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Resend({
      from: "Styreprotokoll <onboarding@resend.dev>",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/signin?verify=true",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const members = await getBoardMembersByEmail(user.email);
      if (members.length === 0) return false;

      await Promise.all(
        members.map((member) => updateBoardMember(member.id, { userId: user.id }))
      );
      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
