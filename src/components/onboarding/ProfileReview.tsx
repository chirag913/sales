import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SALES_OBJECTIVE_OPTIONS, TrainingProfile } from "@/lib/types";

interface ProfileReviewProps {
  profile: TrainingProfile;
  onStartOver: () => void;
}

const MARKET_LABEL: Record<string, string> = {
  US: "🇺🇸 United States",
  UK: "🇬🇧 United Kingdom",
  Canada: "🇨🇦 Canada",
  Australia: "🇦🇺 Australia",
  Other: "🌍 Other",
};

export function ProfileReview({ profile, onStartOver }: ProfileReviewProps) {
  const objectiveLabel = SALES_OBJECTIVE_OPTIONS.find((o) => o.value === profile.salesObjective)?.label;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Here&apos;s your training environment
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Review what I put together. Editing and refining come next.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card icon="🎯" title="Target Market" assumption={profile.assumptions.market}>
          <p className="text-lg text-zinc-900 dark:text-zinc-50">{MARKET_LABEL[profile.market] ?? profile.market}</p>
        </Card>

        <Card icon="🧰" title="Service" assumption={profile.assumptions.service}>
          <p className="text-lg text-zinc-900 dark:text-zinc-50">{profile.service}</p>
        </Card>

        <Card icon="👤" title="Recommended ICP" assumption={profile.assumptions.icpTitles}>
          <div className="flex flex-wrap gap-2">
            {profile.icpTitles.map((title) => (
              <Chip key={title}>{title}</Chip>
            ))}
          </div>
        </Card>

        <Card icon="🏢" title="Company Size" assumption={profile.assumptions.companySizeRange}>
          <p className="text-lg text-zinc-900 dark:text-zinc-50">{profile.companySizeRange}</p>
          {profile.additionalCriteria.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.additionalCriteria.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
          )}
        </Card>

        <Card icon="⚠️" title="Likely Pain Points" assumption={profile.assumptions.painPoints}>
          <div className="flex flex-wrap gap-2">
            {profile.painPoints.map((p) => (
              <Chip key={p}>{p}</Chip>
            ))}
          </div>
        </Card>

        <Card icon="🛑" title="Likely Objections" assumption={profile.assumptions.likelyObjections}>
          <div className="flex flex-wrap gap-2">
            {profile.likelyObjections.map((o) => (
              <Chip key={o}>{o}</Chip>
            ))}
          </div>
        </Card>

        <Card icon="🏁" title="Sales Objective" assumption={profile.assumptions.salesObjective}>
          <p className="text-lg text-zinc-900 dark:text-zinc-50">{objectiveLabel}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{profile.salesObjectiveDetail}</p>
        </Card>

        <Card icon="🧑‍💼" title="Typical Prospect" assumption={profile.assumptions.typicalProspect}>
          <p className="text-zinc-700 dark:text-zinc-300">{profile.typicalProspect}</p>
        </Card>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Link
          href="/profile"
          className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Add company details, proof &amp; credibility →
        </Link>
        <button
          type="button"
          onClick={onStartOver}
          className="text-sm text-zinc-400 underline-offset-4 hover:underline dark:text-zinc-500"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
