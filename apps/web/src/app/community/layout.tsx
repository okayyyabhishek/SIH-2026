import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Crowdsourced Community Hazard Reports & Field Validation",
  description:
    "Citizen portal for submitting ground-truth landslide hazard reports, tension crack observations, and highway blockages to disaster authorities in Northeast India.",
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
