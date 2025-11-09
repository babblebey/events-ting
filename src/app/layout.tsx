import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast-provider";
import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "Events-Ting | All-in-One Event Management",
  description: "Create, manage, and scale your events with ease. Ticketing, registration, schedules, CFP, and more.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="bg-white dark:bg-gray-900">
        <TRPCReactProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
