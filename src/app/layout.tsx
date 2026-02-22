import type { Metadata } from "next";
import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Styreprotokoll",
  description: "Styreprotokoller og innkallinger for styremøter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className={`${manrope.variable} ${fraunces.variable} font-sans antialiased bg-[#f7f6f2] min-h-screen text-slate-900`}>
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
