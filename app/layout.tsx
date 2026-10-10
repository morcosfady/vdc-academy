import type { Metadata } from "next";
import { Michroma, Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { site } from "@/config/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingOffer } from "@/components/layout/FloatingOffer";
import { MobileApplyBar } from "@/components/layout/MobileApplyBar";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { SceneHostLoader } from "@/components/three/SceneHostLoader";
import { UtmCapture } from "@/components/layout/UtmCapture";
import { JsonLd, orgLd } from "@/components/seo/JsonLd";
import { MotionProvider } from "@/components/layout/MotionProvider";
import "./globals.css";

// Two families: Poppins (body and headlines) and Michroma for small uppercase labels. Michroma stands in for the
// licensed Eurostile Extended used on baybimdesigns.com.
const display = Michroma({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const head = Poppins({ weight: ["600"], subsets: ["latin"], variable: "--font-head", display: "optional" });
const body = Poppins({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-body", display: "optional" });

export const metadata: Metadata = {
  title: { default: `${site.name} by ${site.parent}`, template: `%s | ${site.name}` },
  description:
    "Hands-on BIM and VDC training in Revit, Navisworks, clash detection and virtual construction, from the team at Bay BIM Designs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${head.variable} ${body.variable}`}>
      <body>
        <JsonLd data={orgLd} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <MotionProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <SmoothScroll />
          <SceneHostLoader />
          <UtmCapture />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <FloatingOffer />
          <MobileApplyBar />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
