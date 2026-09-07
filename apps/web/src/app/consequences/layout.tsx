import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Lifeline Consequence Engine & Cascading Infrastructure Risk",
  description:
    "Cross-sector cascading failure dependency analysis modeling hospital cutoffs, power grid vulnerability, fuel supply interruptions, and civic isolation risk across Northeast India.",
};

export default function ConsequencesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
