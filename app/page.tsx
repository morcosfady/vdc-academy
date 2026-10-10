import dynamic from "next/dynamic";
import { Hero } from "@/components/home/Hero";
import { ChapterIndicator } from "@/components/layout/ChapterIndicator";

// Below-the-fold chapters are separate chunks inside their own Suspense boundaries. They are still rendered to
// HTML on the server (good for search), but React hydrates them in small slices instead of one long task.
const Explorer = dynamic(() => import("@/components/home/Explorer").then((m) => m.Explorer));
const Why = dynamic(() => import("@/components/home/Why").then((m) => m.Why));
const FinderChapter = dynamic(() => import("@/components/home/FinderChapter").then((m) => m.FinderChapter));
const FreshGradChapter = dynamic(() => import("@/components/home/FreshGradChapter").then((m) => m.FreshGradChapter));
const Journey = dynamic(() => import("@/components/home/Journey").then((m) => m.Journey));
const Closing = dynamic(() => import("@/components/home/Closing").then((m) => m.Closing));

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
