import type { Metadata } from "next";
import { LegalPage } from "@/components/institutional";

export const metadata: Metadata = {
  title: "Privacy Policy | ThorTk",
  description: "Privacy Policy for the ThorTk platform.",
};

export default function PrivacyPage() {
  return <LegalPage type="privacy" />;
}
