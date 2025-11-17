import { ReactNode } from "react";
import { AdminNav } from "./admin-nav";
import { NoPhiBanner } from "./no-phi-banner";

type AdminPageTemplateProps = {
  activeKey: string;
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
};

export function AdminPageTemplate({
  activeKey,
  eyebrow,
  title,
  description,
  badge,
  children,
}: AdminPageTemplateProps) {
  return (
    <div className="min-h-screen bg-muted/10">
      <NoPhiBanner />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:py-14">
        <AdminNav activeKey={activeKey} />
        <header className="rounded-3xl border border-border/70 bg-card/95 px-6 py-8 shadow-sm md:px-10">
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {badge ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-medium text-primary">
                {badge}
              </div>
            ) : null}
          </div>
        </header>
        <div className="flex flex-col gap-6">{children}</div>
        <footer className="border-t border-border/60 pt-6 text-xs text-muted-foreground">
          {/* TODO: Add links to compliance attestation + audit exports */}
          United National Health Platform Oversight &middot; Operated by Global
          Administration Office
        </footer>
      </div>
    </div>
  );
}
