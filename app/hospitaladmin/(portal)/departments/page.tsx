import Link from "next/link";

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
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { listDepartments } from "@/lib/services/hospital-admin/departments";

export default async function DepartmentsPage() {
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const departments = await listDepartments(scope.hospitalId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Departments
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Department roster
          </h2>
          <p className="text-sm text-muted-foreground">
            Each department is scoped to this hospital only; PHI never appears
            here.
          </p>
        </div>
        <Button asChild>
          <Link href="/hospitaladmin/departments/new">Create department</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current departments</CardTitle>
          <CardDescription>
            Assign leads and manage staffing coverage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>Active assignments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No departments defined.
                  </TableCell>
                </TableRow>
              )}
              {departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell>
                    <div className="font-semibold">{department.name}</div>
                    {department.description && (
                      <p className="text-xs text-muted-foreground">
                        {department.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {department.head?.user?.name ?? "Unassigned"}
                  </TableCell>
                  <TableCell>{department._count.assignments}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        department.status === "ACTIVE" ? "success" : "outline"
                      }
                    >
                      {department.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/hospitaladmin/departments/${department.id}`}
                      >
                        Manage
                      </Link>
                    </Button>
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
