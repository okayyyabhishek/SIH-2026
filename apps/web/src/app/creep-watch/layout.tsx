import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "InSAR Satellite Creep Watch & Interferometric Surface Radar",
  description:
    "Copernicus Sentinel-1 InSAR interferometric line-of-sight surface displacement radar monitoring millimeter-scale slope creep across critical infrastructure sectors.",
};

export default function CreepWatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
