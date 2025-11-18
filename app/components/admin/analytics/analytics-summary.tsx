type Summary = {
  hospitalCounts: { status: string; _count: number }[];
  onboardingCounts: { status: string; _count: number }[];
  hospitalAdminCount: number;
  activityCounts: { category: string; _count: number }[];
};

export function AnalyticsSummary({ summary }: { summary: Summary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4">
        <p className="text-sm font-semibold">Hospital status</p>
        <ul className="mt-3 space-y-1 text-sm">
          {summary.hospitalCounts.map((row) => (
            <li key={row.status} className="flex justify-between">
              <span className="uppercase text-muted-foreground">
                {row.status}
              </span>
              <span className="font-medium">{row._count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4">
        <p className="text-sm font-semibold">Onboarding queue</p>
        <ul className="mt-3 space-y-1 text-sm">
          {summary.onboardingCounts.map((row) => (
            <li key={row.status} className="flex justify-between">
              <span className="uppercase text-muted-foreground">
                {row.status}
              </span>
              <span className="font-medium">{row._count}</span>
            </li>
          ))}
          <li className="flex justify-between">
            <span className="text-muted-foreground">Hospital admins</span>
            <span className="font-medium">{summary.hospitalAdminCount}</span>
          </li>
        </ul>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 md:col-span-2">
        <p className="text-sm font-semibold">Activity categories</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {summary.activityCounts.map((row) => (
            <div
              key={row.category}
              className="rounded-xl bg-muted/50 px-3 py-2"
            >
              <p className="text-xs uppercase text-muted-foreground">
                {row.category}
              </p>
              <p className="text-lg font-semibold">{row._count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
