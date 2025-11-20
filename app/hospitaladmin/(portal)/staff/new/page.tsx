import Link from "next/link";

import { StaffCreateForm } from "@/app/components/hospital-admin/staff-create-form";
import { Button } from "@/app/components/ui/button";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { listDepartments } from "@/lib/services/hospital-admin/departments";

export default async function NewStaffPage() {
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const departments = await listDepartments(scope.hospitalId);
  const activeDepartments = departments
    .filter((department) => department.status === "ACTIVE")
    .map((department) => ({
      id: department.id,
      name: department.name,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Workforce
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Register staff account
          </h2>
          <p className="text-sm text-muted-foreground">
            Provide contact details and assign a role. Credentials are
            provisioned securely.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/hospitaladmin/staff">Back to list</Link>
        </Button>
      </div>

      <StaffCreateForm departments={activeDepartments} />
    </div>
  );
}
