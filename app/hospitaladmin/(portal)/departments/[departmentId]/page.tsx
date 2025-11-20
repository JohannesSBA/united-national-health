import Link from "next/link";

import { DepartmentAssignmentForm } from "@/app/components/hospital-admin/department-assignment-form";
import { DepartmentDetailForm } from "@/app/components/hospital-admin/department-detail-form";
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
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { getDepartmentDetail } from "@/lib/services/hospital-admin/departments";
import { listStaffMembers } from "@/lib/services/hospital-admin/staff";
import { staffFiltersSchema } from "@/lib/validation/hospital-admin";

function formatDate(value: Date | null | undefined) {
  if (!value) return "Present";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    value,
  );
}

export default async function DepartmentDetailPage({
  params,
}: {
  params: { departmentId: string };
}) {
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const [department, staff] = await Promise.all([
    getDepartmentDetail(scope.hospitalId, params.departmentId),
    listStaffMembers(
      scope.hospitalId,
      staffFiltersSchema.parse({ hospitalId: scope.hospitalId }),
    ),
  ]);

  if (!department) {
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold">Department not found</p>
        <Button asChild variant="ghost">
          <Link href="/hospitaladmin/departments">Back to departments</Link>
        </Button>
      </div>
    );
  }

  const staffOptions = staff.map((member) => ({
    id: member.id,
    name: member.user.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Departments
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {department.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {department.description ?? "No description"}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/hospitaladmin/departments">Back</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Department settings</CardTitle>
            <CardDescription>
              Update lead assignments and description.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentDetailForm
              departmentId={department.id}
              department={department}
              staffOptions={staffOptions}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Single hospital scope only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={department.status === "ACTIVE" ? "success" : "outline"}
              >
                {department.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Head of department</span>
              <span className="font-semibold">
                {department.head?.user?.name ?? "Unassigned"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Roster count</span>
              <span className="font-semibold">
                {department.assignments.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign staff</CardTitle>
          <CardDescription>
            Assignments here are logged to the audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentAssignmentForm
            departmentId={department.id}
            staffOptions={staffOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent assignments</CardTitle>
          <CardDescription>Operational view only—never PHI.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {department.assignments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No roster entries yet.
                  </TableCell>
                </TableRow>
              )}
              {department.assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    {assignment.staff.user?.name ?? assignment.staffId}
                  </TableCell>
                  <TableCell>{assignment.role.replace(/_/g, " ")}</TableCell>
                  <TableCell>{assignment.isLead ? "Yes" : "No"}</TableCell>
                  <TableCell>{formatDate(assignment.startsAt)}</TableCell>
                  <TableCell>{formatDate(assignment.endsAt ?? null)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
