import { Hero } from "@/components/home/Hero";
import { Stats } from "@/components/home/Stats";
import { ScrollStory } from "@/components/home/ScrollStory";
import { Features } from "@/components/home/Features";
import { SoftwareMarquee } from "@/components/home/SoftwareMarquee";
import { ProgramsPreview } from "@/components/home/ProgramsPreview";
import { LearningPath } from "@/components/home/LearningPath";
import { FreshGrad } from "@/components/home/FreshGrad";
import { GalleryPreview } from "@/components/home/GalleryPreview";
import { Instructors } from "@/components/home/Instructors";
import { Testimonials } from "@/components/home/Testimonials";
import { PricingTeaser } from "@/components/home/PricingTeaser";
import { FaqPreview } from "@/components/home/FaqPreview";
import { FinalCta } from "@/components/home/FinalCta";

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <ScrollStory />
      <Features />
      <SoftwareMarquee />
      <ProgramsPreview />
      <LearningPath />
      <FreshGrad />
      <GalleryPreview />
      <Instructors />
      <Testimonials />
      <PricingTeaser />
      <FaqPreview />
      <FinalCta />
    </>
  );
}
