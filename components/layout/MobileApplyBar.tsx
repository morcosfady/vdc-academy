import { Button } from "@/components/ui/Button";

export function MobileApplyBar() {
  return (
    <div className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 p-3 sm:hidden">
      <Button href="/apply" variant="glow" className="w-full !py-3">
        Apply now
      </Button>
    </div>
  );
}
