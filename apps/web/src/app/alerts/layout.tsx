import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Multi-Channel Emergency Alert Dispatch & CAP Broadcast",
  description:
    "Official Common Alerting Protocol (CAP), SMS gateway, siren activation, and Cell Broadcast dissemination hub for landslide emergency warnings.",
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
