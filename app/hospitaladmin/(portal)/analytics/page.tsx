import Link from "next/link";

import { InventoryForm } from "@/app/components/hospital-admin/inventory-form";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  adjustInventoryQuantityAction,
  deleteInventoryAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { listInventory } from "@/lib/services/hospital-admin/inventory";
import { getHospitalAnalyticsSnapshot } from "@/lib/services/hospital-admin/analytics";

const STAFF_ROLE_ORDER = [
  "DOCTOR",
  "NURSE",
  "LAB_TECHNICIAN",
  "BILLING",
  "RECEPTIONIST",
  "CARE_COORDINATOR",
  "PHARMACIST",
  "ADMINISTRATOR",
] as const;

export default async function AnalyticsPage() {
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const [analytics, inventory] = await Promise.all([
    getHospitalAnalyticsSnapshot(scope.hospitalId),
    listInventory(scope.hospitalId),
  ]);

  const coverage = analytics.shiftCoverage.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Analytics
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Operational insights
          </h2>
          <p className="text-sm text-muted-foreground">
            Aggregate operational data only—zero PHI exposure.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/api/hospital-admin/analytics/export?format=csv">
              Export CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/api/hospital-admin/analytics/export?format=pdf">
              Export PDF
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {STAFF_ROLE_ORDER.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {role.replace(/_/g, " ")}
              </CardTitle>
              <CardDescription>Staff count</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {analytics.staffByRole[role] ?? 0}
            </CardContent>
          </Card>
        ))}
      </div>

      {analytics.patientFlow && (
        <Card>
          <CardHeader>
            <CardTitle>Patient flow snapshot</CardTitle>
            <CardDescription>
              Recorded on{" "}
              {new Date(analytics.patientFlow.recordedFor).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Patients</p>
              <p className="text-3xl font-semibold">
                {analytics.patientFlow.patientCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admissions</p>
              <p className="text-3xl font-semibold">
                {analytics.patientFlow.admissions}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Discharges</p>
              <p className="text-3xl font-semibold">
                {analytics.patientFlow.discharges}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bed occupancy</p>
              <p className="text-3xl font-semibold">
                {analytics.patientFlow.bedOccupancyPercent.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shift coverage</CardTitle>
          <CardDescription>Upcoming five-day view</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          {coverage.map((day) => (
            <div
              key={day.date}
              className="rounded-xl border border-border/60 bg-background/70 p-4 text-center text-sm"
            >
              <p className="text-muted-foreground">
                {new Date(day.date).toLocaleDateString()}
              </p>
              <p className="font-semibold">Doctors: {day.doctorShifts}</p>
              <p className="font-semibold">Nurses: {day.nurseShifts}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>
              Low stock alerts trigger notifications automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No supplies logged.
                    </TableCell>
                  </TableRow>
                )}
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold">{item.name}</div>
                      <p className="text-xs text-muted-foreground">
                        {item.category ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <form
                          action={adjustInventoryQuantityAction.bind(
                            null,
                            item.id,
                            -1,
                          )}
                        >
                          <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={item.quantity <= 0}
                          >
                            -
                          </Button>
                        </form>
                        <span className="min-w-[60px] text-center">
                          {item.quantity}
                        </span>
                        <form
                          action={adjustInventoryQuantityAction.bind(
                            null,
                            item.id,
                            1,
                          )}
                        >
                          <Button variant="outline" size="icon-sm">
                            +
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                    <TableCell>{item.threshold}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "NORMAL" ? "success" : "warning"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={deleteInventoryAction.bind(null, item.id)}>
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add supply item</CardTitle>
            <CardDescription>Scoped to your hospital only.</CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryForm />
          </CardContent>
        </Card>
      </div>

      {analytics.inventoryAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Low stock alerts</CardTitle>
            <CardDescription>
              Plan replenishment before shortages occur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.inventoryAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                {alert.name}: {alert.quantity}/{alert.threshold}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
