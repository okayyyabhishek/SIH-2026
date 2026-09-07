import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Ledger",
  description: "Cryptographically verifiable, tamper-evident audit ledger for early warnings and administrative actions.",
};

export default function LedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
