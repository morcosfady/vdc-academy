import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { content, hasStudentWork } from "@/content/site";

export const metadata: Metadata = { title: "Student Work", robots: hasStudentWork() ? undefined : { index: false } };

export default function StudentWorkPage() {
  if (!hasStudentWork()) {
    return (
      <>
        <PageHero eyebrow="Student work" title={["Coming with", "our first cohort."]} subtitle="Student models and coordination projects will be shown here." />
        <div className="mx-auto max-w-[1280px] px-5 pb-32 md:px-10"><Button href="/apply" variant="glow">Apply now</Button></div>
      </>
    );
  }
  return (
    <>
      <PageHero eyebrow="Student work" title={["Models built", "by our students."]} />
      <ul className="mx-auto grid max-w-[1280px] gap-5 px-5 pb-32 sm:grid-cols-2 md:px-10 lg:grid-cols-3">
        {content.studentWork.map((w) => (
          <li key={w.title}>
            <Image src={w.image} alt={w.title} width={800} height={600} className="aspect-[4/3] w-full object-cover" />
            <p className="mt-3">{w.title}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
