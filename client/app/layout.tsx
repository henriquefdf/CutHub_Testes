import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./_contexts/AuthContext";
import { Toaster } from "sonner";
import { Toaster as ToasterShad } from "./_components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CutHub",
  description: "Gerenciador de barbearias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} dark`}>
        <AuthProvider>
          {children}
          <ToasterShad />
          <Toaster />
        </AuthProvider>
        <div className="flex-1"></div>
      </body>
    </html>
  );
}
