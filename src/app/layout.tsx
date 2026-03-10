import type { Metadata } from "next";
import { Inter, Outfit, Prata } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter'
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-outfit'
});

const prata = Prata({
  weight: "400",
  subsets: ["latin"],
  variable: '--font-prata'
});

export const metadata: Metadata = {
  title: "RR Imobiliária Ltda.",
  description: "A plataforma definitiva para gestão de imóveis, contratos e clientes.",
  icons: {
    icon: "https://jkgkwzyxtmqmhaypobba.supabase.co/storage/v1/object/public/configuracoes/favicon-rr.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable} ${prata.variable}`} suppressHydrationWarning>
      <body className="font-inter bg-background text-foreground antialiased transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="fixed inset-0 elite-spotlight -z-10 dark:block hidden" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
