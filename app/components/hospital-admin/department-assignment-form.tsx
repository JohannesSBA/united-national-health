"use client";

import { useActionState } from "react";

import {
  ActionResult,
  assignStaffAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { staffRoleEnum } from "@/lib/validation/hospital-admin";

type DepartmentAssignmentFormProps = {
  departmentId: string;
  staffOptions: Array<{ id: string; name: string }>;
};

const initialState: ActionResult | undefined = undefined;

export function DepartmentAssignmentForm({
  departmentId,
  staffOptions,
}: DepartmentAssignmentFormProps) {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(
    (prev, formData: FormData) => assignStaffAction(departmentId, formData),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
        >
          {state.message}
        </div>
      )}
      <div>
        <label className="text-sm font-medium">Staff member</label>
        <Select name="staffId" required defaultValue="">
          <option value="">Select staff</option>
          {staffOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Role</label>
          <Select name="role" required defaultValue={staffRoleEnum.options[0]}>
            {staffRoleEnum.options.map((role) => (
              <option key={role} value={role}>
                {role.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Is lead</label>
          <Select name="isLead" defaultValue="false">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Starts</label>
          <Input type="datetime-local" name="startsAt" required />
        </div>
        <div>
          <label className="text-sm font-medium">Ends</label>
          <Input type="datetime-local" name="endsAt" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea name="notes" rows={3} />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Assign staff</Button>
      </div>
    </form>
  );
}
