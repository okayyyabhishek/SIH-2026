import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operations Center",
  description: "Incident command, triage, and multi-agency emergency operations response dispatch.",
};

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
