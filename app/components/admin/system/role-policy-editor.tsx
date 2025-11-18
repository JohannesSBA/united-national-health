"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";

type RolePolicy = { roleName: string; permissions: string[] };

export function RolePolicyEditor({ policies }: { policies: RolePolicy[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<RolePolicy | null>(
    policies[0] ?? null,
  );

  const updatePermission = (permission: string, enabled: boolean) => {
    if (!editing) return;
    setEditing({
      ...editing,
      permissions: enabled
        ? Array.from(new Set([...editing.permissions, permission]))
        : editing.permissions.filter((value) => value !== permission),
    });
  };

  const save = () => {
    if (!editing) return;
    startTransition(async () => {
      await fetch("/api/globaladmin/role-policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      router.refresh();
    });
  };

  const permissionCatalog = [
    "platform:create_hospital",
    "platform:manage_admins",
    "platform:toggle_maintenance",
    "security:configure_policies",
    "analytics:view",
  ];

  return (
    <div className="space-y-3">
      <select
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={editing?.roleName}
        onChange={(event) => {
          const next = policies.find(
            (policy) => policy.roleName === event.target.value,
          );
          if (next) setEditing(next);
        }}
      >
        {policies.map((policy) => (
          <option key={policy.roleName}>{policy.roleName}</option>
        ))}
      </select>
      {editing ? (
        <div className="space-y-2 text-sm">
          {permissionCatalog.map((permission) => (
            <label key={permission} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.permissions.includes(permission)}
                onChange={(event) =>
                  updatePermission(permission, event.target.checked)
                }
              />
              {permission}
            </label>
          ))}
        </div>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={isPending || !editing}
        onClick={save}
      >
        Save policy
      </Button>
    </div>
  );
}
