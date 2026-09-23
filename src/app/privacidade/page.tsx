import type { Metadata } from "next";
import { LegalPage } from "@/components/institutional";

export const metadata: Metadata = {
  title: "Política de Privacidade | ThorTk",
  description: "Política de Privacidade da plataforma ThorTk.",
};

export default function PrivacyPage() {
  return <LegalPage type="privacy" />;
}
