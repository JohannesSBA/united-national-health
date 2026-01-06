import {
  ReceptionistHeader,
  receptionistNavItems,
} from "@/app/components/receptionist/receptionist-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { SettingsForms } from "@/app/receptionist/settings/SettingsForms";
import { requireReceptionistHospitalContext } from "@/lib/receptionist/guards";
import { getReceptionistSettings } from "@/lib/settings/receptionistSettings";
import { db } from "@/lib/db";
import { User } from "@/generated/prisma/client";
import { Badge } from "@/app/components/ui/badge";
import { WorkspaceNav } from "@/app/components/receptionist/workspace-nav";

export default async function ReceptionistSettingsPage() {
  const { session, hospitalId, hospitalName, staffRole } =
    await requireReceptionistHospitalContext();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return null;
  }

  const hospital = await db.hospital.findUnique({
    where: { id: hospitalId },
    select: {
      name: true,
      code: true,
      region: true,
      contactEmail: true,
      contactPhone: true,
      description: true,
      status: true,
    },
  });

  const credentialAccount = await db.account.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ providerId: "credential" }, { password: { not: null } }],
    },
    select: { password: true },
  });
  const hasPassword = Boolean(credentialAccount?.password);

  const settings = await getReceptionistSettings(hospitalId);

  return (
    <div className="space-y-6 p-6">
      <ReceptionistHeader user={session.user as User} />
      <WorkspaceNav
        badge={<Badge variant="outline">Settings overview</Badge>}
        items={receptionistNavItems as any}
      />
      <Card className="border border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Receptionist settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForms
            user={{ name: user.name, email: user.email }}
            hospital={{
              name: hospital?.name || hospitalName || "Hospital",
              code: hospital?.code,
              region: hospital?.region,
              contactEmail: hospital?.contactEmail,
              contactPhone: hospital?.contactPhone,
              description: hospital?.description,
              status: hospital?.status,
            }}
            staffRole={staffRole}
            settings={settings}
            hasPassword={hasPassword}
          />
        </CardContent>
      </Card>
    </div>
  );
}
