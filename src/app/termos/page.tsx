import type { Metadata } from "next";
import { LegalPage } from "@/components/institutional";

export const metadata: Metadata = {
  title: "Terms of Use | ThorTk",
  description: "Terms of Use for the ThorTk platform.",
};

export default function TermsPage() {
  return <LegalPage type="terms" />;
}
