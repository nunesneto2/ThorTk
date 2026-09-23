import type { Metadata } from "next";
import { InstitutionalHome } from "@/components/institutional";

export const metadata: Metadata = {
  title: "ThorTk — Plataforma operacional para TikTok Ads",
  description: "ThorTk organiza ativos e configurações operacionais para campanhas de catálogo no TikTok Ads.",
};

export default function InstitutionalPage() {
  return <InstitutionalHome />;
}
