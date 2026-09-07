import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "In-Situ Geotechnical Sensor Network & WSN Mesh",
  description:
    "Real-time geotechnical sensor network monitoring borehole piezometers, tiltmeters, wire extensometers, and tipping-bucket rain gauges across critical Northeast transport corridors.",
};

export default function SensorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
