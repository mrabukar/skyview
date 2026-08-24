import type { Metadata } from "next";
import {
  Great_Vibes,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-great-vibes",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bubble Tea Palace",
    template: "%s · Bubble Tea Palace",
  },
  description: "Skyview Coffee Ltd — multi-branch café management system (demo)",
  icons: {
    icon: "/skyview-logo-small.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans",
        plusJakarta.variable,
        jetbrainsMono.variable,
        greatVibes.variable,
      )}
    >
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
