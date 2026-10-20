import { Button } from "@/components/ui/Button";
import { profileCompleteness, type Application, type Profile } from "@/lib/db";
import { account } from "@/content/copy-account";

const c = account.dashboard.steps;

type Step = { key: keyof typeof c; href: string };

// One recommended action, by rule: no application > start; draft > continue; submitted with a pending discount and
// no proof > upload proof; profile under 80% > complete it; otherwise nothing to do.
export function nextStep(apps: Application[], profile: Profile | null): Step {
  const latest = apps[0];
  if (!latest) return { key: "start", href: "/apply/" };
  if (latest.status === "draft") return { key: "continue", href: "/apply/" };
  if (latest.discount_type && latest.discount_status === "pending" && !latest.proof_file_path) return { key: "proof", href: "#documents" };
  if (profileCompleteness(profile).percent < 80) return { key: "profile", href: "/account/profile/" };
  return { key: "wait", href: "" };
}

export function NextSteps({ apps, profile, className }: { apps: Application[]; profile: Profile | null; className?: string }) {
  const s = nextStep(apps, profile);
  const t = c[s.key];
  return (
    <div className={className}>
      <p className="mono">{account.dashboard.next}</p>
      <h3 className="mt-3 !text-[1.375rem]">{t.title}</h3>
      <p className="t-small mt-2 text-muted">{t.text}</p>
      {t.cta && (
        <div className="mt-6">
          <Button href={s.href} className="!h-12 !px-6">
            {t.cta}
          </Button>
        </div>
      )}
    </div>
  );
}
