"use client";

import { useActionState } from "react";

import {
  ActionResult,
  createRoomAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { roomTypeEnum, roomStatusEnum } from "@/lib/validation/hospital-admin";

const initialState: ActionResult | undefined = undefined;

export function RoomCreateForm() {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(createRoomAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
        >
          {state.message}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Name</label>
          <Input name="name" required placeholder="Ward 4A" />
        </div>
        <div>
          <label className="text-sm font-medium">Code</label>
          <Input name="code" placeholder="W4A" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Type</label>
          <Select name="type" required defaultValue={roomTypeEnum.options[0]}>
            {roomTypeEnum.options.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Capacity</label>
          <Input type="number" name="capacity" required min={1} />
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select name="status" defaultValue={roomStatusEnum.options[0]}>
            {roomStatusEnum.options.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea name="notes" rows={3} />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save room</Button>
      </div>
    </form>
  );
}
