import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { content, hasInstructors } from "@/content/site";

export const metadata: Metadata = { title: "Instructors", robots: hasInstructors() ? undefined : { index: false } };

export default function InstructorsPage() {
  if (!hasInstructors()) {
    return (
      <>
        <PageHero eyebrow="Instructors" title={["Coming with", "our first cohort."]} subtitle="Meet the working BIM professionals who teach each program." />
        <div className="mx-auto max-w-[1280px] px-5 pb-32 md:px-10"><Button href="/apply" variant="glow">Apply now</Button></div>
      </>
    );
  }
  return (
    <>
      <PageHero eyebrow="Instructors" title={["Learn from", "working professionals."]} />
      <ul className="mx-auto grid max-w-[1280px] gap-5 px-5 pb-32 md:grid-cols-3 md:px-10">
        {content.instructors.map((i) => (
          <li key={i.name} className="glass p-6">
            {i.photo && <Image src={i.photo} alt="" width={400} height={400} className="mb-5 aspect-square w-full object-cover" />}
            <p className="display-md !text-xl">{i.name}</p>
            <p className="meta mt-2">{i.role}{i.years ? ` · ${i.years} years` : ""}</p>
            {i.bio && <p className="mt-4 text-muted">{i.bio}</p>}
            {i.linkedin && <p className="mt-4"><a href={i.linkedin} className="text-accent-text underline underline-offset-4">LinkedIn</a></p>}
          </li>
        ))}
      </ul>
    </>
  );
}
