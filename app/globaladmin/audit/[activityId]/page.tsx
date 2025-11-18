import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireGlobalAdmin } from "@/lib/require-global-admin";
import { AdminPageTemplate } from "@/app/components/admin/admin-page-template";
import { extractEmailLogId, stripEmailLogTag } from "@/lib/email-log-tag";
import {
  decryptEmailBody,
  isEmailEncryptionEnabled,
} from "@/lib/email-encryption";

type AuditDetailPageProps = {
  params: {
    activityId: string;
  };
};

type DecryptedEmailLog = {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: Date;
};

export default async function AuditDetailPage({
  params,
}: AuditDetailPageProps) {
  await requireGlobalAdmin();
  const { activityId } = await params;
  const activity = await db.adminActivity.findUnique({
    where: { id: activityId },
  });

  if (!activity) {
    notFound();
  }

  const actorUser =
    (await db.user.findUnique({
      where: { id: activity.actor },
      include: {
        roles: { include: { role: true } },
        hospitalMemberships: { include: { hospital: true } },
      },
    })) ??
    (await db.user.findUnique({
      where: { email: activity.actor },
      include: {
        roles: { include: { role: true } },
        hospitalMemberships: { include: { hospital: true } },
      },
    })) ??
    (await db.user.findFirst({
      where: { name: activity.actor },
      include: {
        roles: { include: { role: true } },
        hospitalMemberships: { include: { hospital: true } },
      },
    }));

  const cleanAction = stripEmailLogTag(activity.action);
  const metadataEmailLogId =
    activity.metadata &&
    typeof activity.metadata === "object" &&
    (activity.metadata as { emailLogId?: string }).emailLogId
      ? (activity.metadata as { emailLogId?: string }).emailLogId
      : null;
  const emailLogId = metadataEmailLogId ?? extractEmailLogId(activity.action);
  let emailLog: DecryptedEmailLog | null = null;

  if (emailLogId && isEmailEncryptionEnabled()) {
    const record = await db.emailLog.findUnique({
      where: { id: emailLogId },
    });
    if (record) {
      try {
        emailLog = {
          id: record.id,
          to: record.to,
          subject: record.subject,
          createdAt: record.createdAt,
          body: decryptEmailBody(record.bodyCiphertext),
        };
      } catch (error) {
        emailLog = {
          id: record.id,
          to: record.to,
          subject: record.subject,
          createdAt: record.createdAt,
          body: `<p style="color:#dc2626;">Unable to decrypt email. Verify EMAIL_LOG_SECRET.</p>`,
        };
      }
    }
  }

  return (
    <AdminPageTemplate
      activeKey="security"
      eyebrow="Audit Detail"
      title="Administrative Activity Detail"
      description="Review a single governance event, confirm actor metadata, and export any related notifications."
      badge="Scope: Global Admin"
    >
      <section className="space-y-4 rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{cleanAction}</h2>
            <p className="text-sm text-muted-foreground">
              Recorded {activity.createdAt.toLocaleString()}
            </p>
          </div>
          <Link
            href="/globaladmin/security"
            className="text-sm font-medium text-primary hover:underline"
          >
            &larr; Back to Security
          </Link>
        </div>
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Actor</dt>
            <dd className="font-medium">
              {actorUser
                ? `${actorUser.name} (${actorUser.email})`
                : activity.actor}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Scope</dt>
            <dd className="font-medium">{activity.scope}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium">{activity.category}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Activity ID</dt>
            <dd className="font-mono text-xs">{activity.id}</dd>
          </div>
        </dl>
        {actorUser ? (
          <div className="rounded-xl border border-border/50 bg-muted/40 p-4 text-sm">
            <p className="text-sm font-semibold">Matched Operator</p>
            <p>{actorUser.name}</p>
            <p className="text-muted-foreground">{actorUser.email}</p>
            <p className="text-muted-foreground">
              Status: {actorUser.status} &middot; Roles:{" "}
              {actorUser.roles.map((r) => r.role.name).join(", ")}
            </p>
            {actorUser.hospitalMemberships.length ? (
              <p className="text-muted-foreground">
                Hospitals:{" "}
                {actorUser.hospitalMemberships
                  .map((membership) => membership.hospital.name)
                  .join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {emailLog ? (
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Email Notification</h2>
              <p className="text-sm text-muted-foreground">
                Sent to {emailLog.to} on {emailLog.createdAt.toLocaleString()}.
              </p>
            </div>
            <a
              href={`/api/globaladmin/email-logs/${emailLog.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Download original email
            </a>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="text-sm font-semibold">{emailLog.subject}</p>
            <div
              className="mt-3 text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: emailLog.body }}
            />
          </div>
        </section>
      ) : null}
    </AdminPageTemplate>
  );
}
