import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Interactive 3D GIS Terrain & Susceptibility Map",
  description:
    "Interactive 3D geospatial GIS terrain viewer displaying calibrated slope-unit landslide susceptibility models, satellite InSAR deformation, and real-time highway corridors across Northeast India.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
