import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Quantitative Risk Engine & Transparent Model Provenance",
  description:
    "Transparent machine learning risk forecasting engine detailing feature attribution, probability calibration, and hazard matrix predictions for Northeast India.",
};

export default function RiskLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
