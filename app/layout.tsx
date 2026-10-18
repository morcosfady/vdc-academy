import type { Metadata } from "next";
import { IBM_Plex_Mono, Michroma, Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { site } from "@/config/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GridOverlay } from "@/components/ds/GridOverlay";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { SceneHostLoader } from "@/components/three/SceneHostLoader";
import { UtmCapture } from "@/components/layout/UtmCapture";
import { JsonLd, orgLd } from "@/components/seo/JsonLd";
import { MotionProvider } from "@/components/layout/MotionProvider";
import { PageTransition } from "@/components/layout/PageTransition";
import "./globals.css";

// Two families: Poppins (display and UI) and IBM Plex Mono (technical voice: sheet numbers, dimensions, LOD).
// Michroma is a stand-in for the licensed Eurostile Extended and is used for the logo wordmark only.
const body = Poppins({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-body", display: "optional" });
const mono = IBM_Plex_Mono({ weight: ["400"], subsets: ["latin"], variable: "--font-mono", display: "optional" });
const logo = Michroma({ weight: "400", subsets: ["latin"], variable: "--font-logo", display: "optional", preload: false });

export const metadata: Metadata = {
  title: { default: `${site.name} by ${site.parent}`, template: `%s | ${site.name}` },
  description:
    "Hands-on BIM and VDC training in Revit, Navisworks, clash detection and virtual construction, from the team at Bay BIM Designs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${logo.variable} ${mono.variable} ${body.variable}`}>
      <body>
        <JsonLd data={orgLd} />
        <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('vdc-intro'))document.documentElement.classList.add('intro-seen')}catch(e){}" }} />
        <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
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
          <GridOverlay />
          <PageTransition />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
