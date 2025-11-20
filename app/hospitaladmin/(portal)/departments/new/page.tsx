import Link from "next/link";

import { DepartmentCreateForm } from "@/app/components/hospital-admin/department-create-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { listStaffMembers } from "@/lib/services/hospital-admin/staff";
import { staffFiltersSchema } from "@/lib/validation/hospital-admin";

export default async function NewDepartmentPage() {
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const staff = await listStaffMembers(
    scope.hospitalId,
    staffFiltersSchema.parse({ hospitalId: scope.hospitalId }),
  );

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
            Create department
          </h2>
          <p className="text-sm text-muted-foreground">
            Department scopes stay within this facility only.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/hospitaladmin/departments">Back to list</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department details</CardTitle>
          <CardDescription>
            Assign a lead to maintain accountability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentCreateForm staffOptions={staffOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
