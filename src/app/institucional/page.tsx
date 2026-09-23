import type { Metadata } from "next";
import { InstitutionalHome } from "@/components/institutional";

export const metadata: Metadata = {
  title: "ThorTk — Operational platform for TikTok Ads",
  description: "ThorTk organizes assets and operational settings for catalog campaigns in TikTok Ads.",
};

export default function InstitutionalPage() {
  return <InstitutionalHome />;
}
