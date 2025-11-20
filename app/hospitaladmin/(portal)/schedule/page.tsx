import Link from "next/link";

import { ScheduleForm } from "@/app/components/hospital-admin/schedule-form";
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
import { deleteScheduleAction } from "@/app/hospitaladmin/(portal)/actions";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { listDepartments } from "@/lib/services/hospital-admin/departments";
import { listRooms } from "@/lib/services/hospital-admin/rooms";
import { listStaffMembers } from "@/lib/services/hospital-admin/staff";
import { listSchedule } from "@/lib/services/hospital-admin/schedule";
import { staffFiltersSchema } from "@/lib/validation/hospital-admin";

function parseDate(value: string | undefined) {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string>
    | Promise<Record<string, string | string[]>>;
}) {
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const start = parseDate(
    typeof resolvedSearchParams?.start === "string"
      ? resolvedSearchParams.start
      : undefined,
  );
  const end = new Date(start.getTime() + 7 * 86400000);
  const [schedule, staff, departments, rooms] = await Promise.all([
    listSchedule(scope.hospitalId, start, end),
    listStaffMembers(
      scope.hospitalId,
      staffFiltersSchema.parse({ hospitalId: scope.hospitalId }),
    ),
    listDepartments(scope.hospitalId),
    listRooms(scope.hospitalId),
  ]);

  const staffOptions = staff.map((member) => ({
    id: member.id,
    name: member.user.name,
  }));
  const departmentOptions = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
  }));
  const roomOptions = rooms.map((room) => ({ id: room.id, name: room.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Scheduling
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Duty roster</h2>
          <p className="text-sm text-muted-foreground">
            Operational scheduling only. No patient identifiers are used.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`?start=${new Date().toISOString()}`}>Jump to today</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create schedule</CardTitle>
          <CardDescription>
            Conflicts are blocked automatically per staff member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleForm
            staffOptions={staffOptions}
            departmentOptions={departmentOptions}
            roomOptions={roomOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This week</CardTitle>
          <CardDescription>
            Week of {start.toLocaleDateString()} · {schedule.length} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No shifts scheduled in this window.
                  </TableCell>
                </TableRow>
              )}
              {schedule.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-semibold">{entry.title}</div>
                    <p className="text-xs text-muted-foreground">
                      {entry.scheduleType.replace(/_/g, " ")}
                    </p>
                  </TableCell>
                  <TableCell>
                    {entry.staff?.user?.name ?? "Unassigned"}
                  </TableCell>
                  <TableCell>{entry.department?.name ?? "—"}</TableCell>
                  <TableCell>{entry.startsAt.toLocaleString()}</TableCell>
                  <TableCell>{entry.endsAt.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.status === "CONFIRMED" ? "success" : "outline"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={deleteScheduleAction.bind(null, entry.id)}>
                      <Button variant="ghost" size="sm">
                        Cancel
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
