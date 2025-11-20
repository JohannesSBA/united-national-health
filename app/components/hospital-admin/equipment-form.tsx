"use client";

import { useActionState } from "react";

import {
  ActionResult,
  upsertEquipmentAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { equipmentStatusEnum } from "@/lib/validation/hospital-admin";

const initialState: ActionResult | undefined = undefined;

type EquipmentFormProps = {
  rooms: Array<{ id: string; name: string }>;
};

export function EquipmentForm({ rooms }: EquipmentFormProps) {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(upsertEquipmentAction, initialState);

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
        <Input name="name" required placeholder="Ventilator" />
      </div>
      <div>
        <label className="text-sm font-medium">Type</label>
        <Input name="type" required placeholder="Respiratory" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Room</label>
          <Select name="roomId" defaultValue="">
            <option value="">Unassigned</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select name="status" defaultValue={equipmentStatusEnum.options[0]}>
            {equipmentStatusEnum.options.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Serial number</label>
        <Input name="serialNumber" placeholder="SN-001" />
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea name="notes" rows={3} />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save equipment</Button>
      </div>
    </form>
  );
}
