import { Button } from "@/components/ui/Button";

export function MobileApplyBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 p-3 backdrop-blur sm:hidden">
      <Button href="/apply" variant="glow" className="w-full">
        Apply Now
      </Button>
    </div>
  );
}
