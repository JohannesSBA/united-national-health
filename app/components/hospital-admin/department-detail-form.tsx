"use client";

import { useActionState } from "react";

import {
  ActionResult,
  updateDepartmentAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

type DepartmentDetailFormProps = {
  departmentId: string;
  department: {
    name: string;
    description?: string | null;
    headStaffId?: string | null;
  };
  staffOptions: Array<{ id: string; name: string }>;
};

const initialState: ActionResult | undefined = undefined;

export function DepartmentDetailForm({
  departmentId,
  department,
  staffOptions,
}: DepartmentDetailFormProps) {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(
    (prev, formData: FormData) =>
      updateDepartmentAction(departmentId, formData),
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
        <label className="text-sm font-medium">Name</label>
        <Input name="name" required defaultValue={department.name} />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          name="description"
          rows={3}
          defaultValue={department.description ?? ""}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Department head</label>
        <Select name="headStaffId" defaultValue={department.headStaffId ?? ""}>
          <option value="">Unassigned</option>
          {staffOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
