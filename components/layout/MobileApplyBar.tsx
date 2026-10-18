import { Button } from "@/components/ui/Button";

export function MobileApplyBar() {
  return (
    <div className="theme-light glass-blur fixed inset-x-0 bottom-0 z-40 border-t bg-paper/90 p-3 sm:hidden" style={{ borderColor: "var(--rule)" }}>
      <Button href="/apply" className="w-full">
        Apply now
      </Button>
    </div>
  );
}
