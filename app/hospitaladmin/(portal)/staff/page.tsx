import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
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
import { listStaffMembers } from "@/lib/services/hospital-admin/staff";
import {
  staffFiltersSchema,
  staffRoleEnum,
} from "@/lib/validation/hospital-admin";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DISABLED", label: "Disabled" },
];

export default async function StaffPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[]>
    | Promise<Record<string, string | string[]>>;
}) {
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = staffFiltersSchema.parse({
    hospitalId: scope.hospitalId,
    search:
      typeof resolvedSearchParams?.search === "string"
        ? resolvedSearchParams?.search
        : undefined,
    role:
      typeof resolvedSearchParams?.role === "string" &&
      resolvedSearchParams.role !== ""
        ? (resolvedSearchParams.role as any)
        : undefined,
    status:
      typeof resolvedSearchParams?.status === "string" &&
      resolvedSearchParams.status !== ""
        ? (resolvedSearchParams.status as any)
        : undefined,
  });

  const staff = await listStaffMembers(scope.hospitalId, filters);
  const active = staff.filter((member) => member.status === "ACTIVE").length;
  const onLeave = staff.filter((member) => member.status === "INACTIVE").length;
  const disabled = staff.filter(
    (member) => member.status === "DISABLED",
  ).length;
  const roleBreakdown = staffRoleEnum.options.map((role) => ({
    role,
    count: staff.filter((member) => member.role === role).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Workforce
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Staff Directory
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage doctors, nurses, technicians, and administrative staff for
            your hospital.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/hospitaladmin/staff/new">Register staff</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/hospitaladmin/departments">Department roster</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total staff</CardTitle>
            <CardDescription>
              Accounts assigned to this hospital
            </CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {staff.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active</CardTitle>
            <CardDescription>Available to be scheduled</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{active}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>On leave / disabled</CardTitle>
            <CardDescription>Requires follow-up</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {onLeave + disabled}
          </CardContent>
        </Card>
      </div>

      <form
        className="flex flex-wrap gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4"
        method="get"
      >
        <Input
          name="search"
          placeholder="Search by name, email, or phone"
          defaultValue={filters.search ?? ""}
          className="w-full min-w-[200px] flex-1"
        />
        <Select name="role" defaultValue={filters.role ?? ""}>
          <option value="">All roles</option>
          {staffRoleEnum.options.map((role) => (
            <option key={role} value={role}>
              {role.replace("_", " ")}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={filters.status ?? ""}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button type="submit">Apply filters</Button>
      </form>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Team roster</CardTitle>
          <CardDescription>
            Only staff within your hospital boundary are visible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No staff found.
                  </TableCell>
                </TableRow>
              )}
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-semibold">{member.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.user.email}
                    </div>
                    {member.phone && (
                      <div className="text-xs text-muted-foreground">
                        {member.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">
                    {member.role.replace("_", " ").toLowerCase()}
                  </TableCell>
                  <TableCell>
                    {member.assignments[0]?.department?.name ??
                      member.department ??
                      "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.status === "ACTIVE"
                          ? "success"
                          : member.status === "INACTIVE"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/hospitaladmin/staff/${member.id}`}>
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

      <Card>
        <CardHeader>
          <CardTitle>Role distribution</CardTitle>
          <CardDescription>
            Quick breakdown of staffing coverage
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          {roleBreakdown.map((item) => (
            <div
              key={item.role}
              className="rounded-xl border border-border/60 bg-background/70 p-4 text-center"
            >
              <p className="text-sm text-muted-foreground">
                {item.role.replace("_", " ")}
              </p>
              <p className="text-2xl font-semibold">{item.count}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
