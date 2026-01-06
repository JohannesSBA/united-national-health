"use client";

import { useActionState } from "react";

import {
  ActionResult,
  createScheduleAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { scheduleTypeEnum } from "@/lib/validation/hospital-admin";

const initialState: ActionResult | undefined = undefined;

type Option = { id: string; name: string };

type ScheduleFormProps = {
  staffOptions: Option[];
  departmentOptions: Option[];
  roomOptions: Option[];
};

export function ScheduleForm({
  staffOptions,
  departmentOptions,
  roomOptions,
}: ScheduleFormProps) {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(createScheduleAction, initialState);

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
        <label className="text-sm font-medium">Title</label>
        <Input name="title" required placeholder="Night shift" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Type</label>
          <Select
            name="scheduleType"
            defaultValue={scheduleTypeEnum.options[0]}
          >
            {scheduleTypeEnum.options.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Staff (optional)</label>
          <Select name="staffId" defaultValue="">
            <option value="">Unassigned</option>
            {staffOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Department</label>
          <Select name="departmentId" defaultValue="">
            <option value="">Unassigned</option>
            {departmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Room</label>
          <Select name="roomId" defaultValue="">
            <option value="">Unassigned</option>
            {roomOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
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
          <Input type="datetime-local" name="endsAt" required />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Create schedule</Button>
      </div>
    </form>
  );
}
