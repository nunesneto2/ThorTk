import type { Metadata } from "next";
import { LegalPage } from "@/components/institutional";

export const metadata: Metadata = {
  title: "Termos de Uso | ThorTk",
  description: "Termos de Uso da plataforma ThorTk.",
};

export default function TermsPage() {
  return <LegalPage type="terms" />;
}
