import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authorized Login",
  description: "Secure role-based authentication portal for NDRF, SDMA, and institutional operators.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
