import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { StaffDetailForm } from "@/app/components/hospital-admin/staff-detail-form";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { getStaffMember } from "@/lib/services/hospital-admin/staff";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function StaffDetailPage({
  params,
}: {
  params: { staffId: string };
}) {
  const resolvedParams = await params;
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const staff = await getStaffMember(scope.hospitalId, resolvedParams.staffId);
  console.log(staff);
  console.log(scope.hospitalId, resolvedParams.staffId);

  if (!staff) {
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold">Staff member not found</p>
        <Button asChild variant="ghost">
          <Link href="/hospitaladmin/staff">Back to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Workforce
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {staff.user.name}
          </h2>
          <p className="text-sm text-muted-foreground">{staff.user.email}</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/hospitaladmin/staff">Back to list</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Contact & permissions</CardTitle>
            <CardDescription>Non-clinical profile</CardDescription>
          </CardHeader>
          <CardContent>
            <StaffDetailForm staff={staff} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Role and latest assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-semibold">
                {staff.role.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={staff.status === "ACTIVE" ? "success" : "warning"}
              >
                {staff.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current dept.</span>
              <span className="font-semibold">
                {staff.assignments[0]?.department?.name ??
                  staff.department ??
                  "Unassigned"}
              </span>
            </div>
            {staff.assignments[0] && (
              <div>
                <p className="text-muted-foreground">Assignment notes</p>
                <p className="text-sm">{staff.assignments[0].notes ?? "—"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department rotations</CardTitle>
          <CardDescription>Audit trail of the last assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.assignments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No assignments recorded.
                  </TableCell>
                </TableRow>
              )}
              {staff.assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.department?.name ?? "—"}</TableCell>
                  <TableCell>{assignment.role}</TableCell>
                  <TableCell>{assignment.isLead ? "Yes" : "No"}</TableCell>
                  <TableCell>{formatDate(assignment.startsAt)}</TableCell>
                  <TableCell>
                    {assignment.endsAt
                      ? formatDate(assignment.endsAt)
                      : "Ongoing"}
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
