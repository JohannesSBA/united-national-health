"use client";

import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  ActionResult,
  createStaffAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { staffRoleEnum } from "@/lib/validation/hospital-admin";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

const initialState: ActionResult | undefined = undefined;

type StaffCreateFormProps = {
  departments: Array<{ id: string; name: string }>;
};

type StaffRoleValue =
  | "DOCTOR"
  | "NURSE"
  | "LAB_TECHNICIAN"
  | "BILLING"
  | "RECEPTIONIST"
  | "CARE_COORDINATOR"
  | "PHARMACIST"
  | "ADMINISTRATOR";

export function StaffCreateForm({ departments }: StaffCreateFormProps) {
  const defaultRole: StaffRoleValue =
    departments.length === 0 ? "NURSE" : "DOCTOR";
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(createStaffAction, initialState);
  const [selectedRole, setSelectedRole] = useState<StaffRoleValue>(defaultRole);
  const requiresDepartment = selectedRole === "DOCTOR";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register new staff</CardTitle>
        <CardDescription>
          New accounts are scoped to this hospital automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
          >
            {state.message}
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Full name</label>
              <Input name="name" required placeholder="Dr. Lensa Kebede" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                type="email"
                required
                placeholder="lensa@example.com"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input name="phone" placeholder="+2519..." />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select
                name="role"
                defaultValue={defaultRole}
                required
                onChange={(event) =>
                  setSelectedRole(event.target.value as StaffRoleValue)
                }
              >
                {staffRoleEnum.options.map((role) => (
                  <option
                    key={role}
                    value={role}
                    disabled={role === "DOCTOR" && departments.length === 0}
                  >
                    {role.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {requiresDepartment && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Department (required for doctors)
                </label>
                <Select
                  name="departmentId"
                  defaultValue=""
                  required
                  disabled={departments.length === 0}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
                {departments.length === 0 ? (
                  <p className="mt-2 flex items-center gap-2 text-xs font-medium text-destructive">
                    <AlertCircle className="size-3" />
                    Create a department before registering doctors.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Specialization</label>
                  <Input
                    name="specialization"
                    placeholder="Cardiology"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">License number</label>
                  <Input
                    name="licenseNumber"
                    placeholder="HCP-123456"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Level / Band</label>
                <Input name="level" placeholder="Level III" required />
              </div>
            </div>
          )}
          {!requiresDepartment && (
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              These profile fields (department, specialization, license, level)
              are only collected for doctors. Other roles inherit operational
              permissions automatically.
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="submit">Create account</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
