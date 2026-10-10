import { Hero } from "@/components/home/Hero";
import { Explorer } from "@/components/home/Explorer";
import { Why } from "@/components/home/Why";
import { FinderChapter } from "@/components/home/FinderChapter";
import { FreshGradChapter } from "@/components/home/FreshGradChapter";
import { Journey } from "@/components/home/Journey";
import { Closing } from "@/components/home/Closing";
import { ChapterIndicator } from "@/components/layout/ChapterIndicator";

const chapters = [
  { id: "ch-1", label: "Start" },
  { id: "ch-2", label: "Model" },
  { id: "ch-3", label: "Why" },
  { id: "ch-4", label: "Programs" },
  { id: "ch-5", label: "Fresh grads" },
  { id: "ch-6", label: "Path" },
];

export default function Home() {
  return (
    <>
      <ChapterIndicator items={chapters} />
      <Hero />
      <Explorer />
      <Why />
      <FinderChapter />
      <FreshGradChapter />
      <Journey />
      <Closing />
    </>
  );
}
