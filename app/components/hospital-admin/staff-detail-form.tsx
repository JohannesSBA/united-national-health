"use client";

import { useActionState } from "react";

import {
  ActionResult,
  resetStaffCredentialsAction,
  setStaffStatusAction,
  updateStaffAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";

type StaffDetailFormProps = {
  staff: {
    id: string;
    phone?: string | null;
    specialization?: string | null;
    licenseNumber?: string | null;
    department?: string | null;
    level?: string | null;
    status: string;
  };
};

const initialState: ActionResult | undefined = undefined;

export function StaffDetailForm({ staff }: StaffDetailFormProps) {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(
    (prev, formData: FormData) => updateStaffAction(staff.id, formData),
    initialState,
  );
  const [resetState, resetAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(
    (prev, formData: FormData) =>
      resetStaffCredentialsAction(staff.id, formData),
    undefined,
  );
  const disable = setStaffStatusAction.bind(null, staff.id, "DISABLED");
  const activate = setStaffStatusAction.bind(null, staff.id, "ACTIVE");
  const onLeave = setStaffStatusAction.bind(null, staff.id, "INACTIVE");

  return (
    <div className="space-y-4">
      {state && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
        >
          {state.message}
        </div>
      )}
      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Phone</label>
          <Input name="phone" defaultValue={staff.phone ?? ""} />
        </div>
        <div>
          <label className="text-sm font-medium">Level / Band</label>
          <Input name="level" defaultValue={staff.level ?? ""} />
        </div>
        <div>
          <label className="text-sm font-medium">Specialization</label>
          <Input
            name="specialization"
            defaultValue={staff.specialization ?? ""}
          />
        </div>
        <div>
          <label className="text-sm font-medium">License number</label>
          <Input
            name="licenseNumber"
            defaultValue={staff.licenseNumber ?? ""}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Primary department</label>
          <Textarea
            name="department"
            rows={2}
            defaultValue={staff.department ?? ""}
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <p className="text-sm font-semibold">Account status</p>
        <p className="text-sm text-muted-foreground">Current: {staff.status}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={activate}>
            <Button type="submit" variant="secondary">
              Activate
            </Button>
          </form>
          <form action={onLeave}>
            <Button type="submit" variant="outline">
              Mark on leave
            </Button>
          </form>
          <form action={disable}>
            <Button type="submit" variant="destructive">
              Disable access
            </Button>
          </form>
          <form action={resetAction} className="flex flex-col gap-2">
            <Button type="submit" variant="outline">
              Reset credentials
            </Button>
            {resetState && (
              <p
                className={`text-xs ${resetState.ok ? "text-emerald-600" : "text-destructive"}`}
              >
                {resetState.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
