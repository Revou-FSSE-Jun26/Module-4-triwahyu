import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AppHeader } from "@/components/layout/AppHeader";
import { AuthProvider } from "@/context/AuthContext";
import { getServerToken } from "@/lib/serverApi";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "RevoTask", template: "%s | RevoTask" },
  description:
    "Trello-like task management: boards, columns, cards, comments and notifications.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const initialToken = await getServerToken();
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable}`}>
      <body>
        <AuthProvider initialToken={initialToken}>
          <AppHeader />
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
            {children}
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { border: "3px solid #111111", borderRadius: 0 },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
