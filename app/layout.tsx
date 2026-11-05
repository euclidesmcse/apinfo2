import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "APinfo 2.0",
  description: "Conector simples Candidatos <-> Empresas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
