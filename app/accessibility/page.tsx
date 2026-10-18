import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Accessibility" };

export default function Accessibility() {
  return (
    <LegalPage eyebrow="Legal" sheet="L-003" title={["Accessibility"]} updated="October 2026">
      <section>
        <h2>Our goal</h2>
        <p>We aim for WCAG 2.1 level AA on every page of this site.</p>
      </section>
      <section>
        <h2>What we do</h2>
        <ul>
          <li>Full keyboard use: menus, sliders, the program finder, form steps and dialogs.</li>
          <li>Visible focus rings, a skip link, and one main heading per page.</li>
          <li>Text and background colors that meet AA contrast, on paper and on ink sections.</li>
          <li>3D scenes are decorative. Every scene has a text description and button controls as an alternative to dragging.</li>
          <li>Reduced motion: we follow your system setting, and the footer has a Reduce motion switch that stops smooth scrolling, rotation and animations.</li>
          <li>Form errors are announced to screen readers.</li>
        </ul>
      </section>
      <section>
        <h2>Tell us about a problem</h2>
        <p>If something is hard to use, <Link prefetch={false} href="/contact">contact us</Link> and describe the page and what happened. We will fix it.</p>
      </section>
    </LegalPage>
  );
}
