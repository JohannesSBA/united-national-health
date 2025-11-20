"use client";

import { useActionState } from "react";

import {
  ActionResult,
  createDepartmentAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

const initialState: ActionResult | undefined = undefined;

type DepartmentCreateFormProps = {
  staffOptions: Array<{ id: string; name: string }>;
};

export function DepartmentCreateForm({
  staffOptions,
}: DepartmentCreateFormProps) {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(createDepartmentAction, initialState);

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
        <Input name="name" required placeholder="Emergency" />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          name="description"
          placeholder="Critical care intake"
          rows={3}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Department lead</label>
        <Select name="headStaffId" defaultValue="">
          <option value="">Unassigned</option>
          {staffOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="submit">Create department</Button>
      </div>
    </form>
  );
}
