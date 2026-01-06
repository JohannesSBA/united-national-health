"use client";

import { useActionState } from "react";

import {
  ActionResult,
  upsertInventoryAction,
} from "@/app/hospitaladmin/(portal)/actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { inventoryStatusEnum } from "@/lib/validation/hospital-admin";

const initialState: ActionResult | undefined = undefined;

export function InventoryForm() {
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(upsertInventoryAction, initialState);

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
        <Input name="name" required placeholder="Sterile gloves" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Category</label>
          <Input name="category" placeholder="PPE" />
        </div>
        <div>
          <label className="text-sm font-medium">Unit</label>
          <Input name="unit" placeholder="boxes" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Quantity</label>
          <Input type="number" name="quantity" min={0} required />
        </div>
        <div>
          <label className="text-sm font-medium">Threshold</label>
          <Input type="number" name="threshold" min={0} required />
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select name="status" defaultValue={inventoryStatusEnum.options[0]}>
            {inventoryStatusEnum.options.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save item</Button>
      </div>
    </form>
  );
}
