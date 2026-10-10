import type { Metadata } from "next";
import { Michroma, Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { site } from "@/config/site";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileApplyBar } from "@/components/layout/MobileApplyBar";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import "./globals.css";

// Michroma stands in for the licensed EurostileExtended used on baybimdesigns.com
const heading = Michroma({ weight: "400", subsets: ["latin"], variable: "--font-heading", display: "swap" });
const body = Poppins({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.name} by ${site.parent}`, template: `%s | ${site.name}` },
  description:
    "Hands-on BIM and VDC training in Revit, Navisworks, clash detection and virtual construction, taught by working professionals from Bay BIM Designs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${heading.variable} ${body.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <SmoothScroll />
          <AnnouncementBar />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <MobileApplyBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
