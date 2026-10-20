import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplyFlow } from "@/components/apply/ApplyFlow";
import { NoScriptNote } from "@/components/ui/NoScript";
import { pageMeta } from "@/components/seo/meta";
import { JsonLd, breadcrumbLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = pageMeta({ title: "Apply to a BIM and VDC Program", description: "Apply to a VDC Academy BIM and VDC program in five short steps. We review applications within 1 to 2 business days, and you pay after acceptance.", path: "/apply/", og: "apply" });

export default function ApplyPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Apply", path: "/apply/" }])} />
      <Suspense
        fallback={
          <div className="min-h-[1700px] pt-[72px]">
            <div className="wrap pt-14 lg:pt-20">
              <NoScriptNote className="!mt-0" />
            </div>
          </div>
        }
      >
        <ApplyFlow />
      </Suspense>
    </>
  );
}
