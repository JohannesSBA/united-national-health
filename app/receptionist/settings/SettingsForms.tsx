"use client";

import { useTransition } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import {
  changePasswordAction,
  updateProfileAction,
  upsertReceptionistSettingsAction,
} from "./actions";

type SettingsProps = {
  user: {
    name: string;
    email: string;
  };
  hospital: {
    name: string;
    code?: string | null;
    region?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    description?: string | null;
    status?: string | null;
  };
  staffRole?: string | null;
  settings: {
    slotLengthMinutes: number;
    bufferMinutes: number;
    checkInEarlyMinutes: number;
    allowWalkIns: boolean;
    allowDoubleBooking: boolean;
    defaultNewAppointmentStatus: "SCHEDULED";
    showFrequentCancellationsAlert: boolean;
    frequentCancellationThreshold: number;
    frequentCancellationWindowDays: number;
  };
  hasPassword: boolean;
};

export function SettingsForms({ user, hospital, staffRole, settings, hasPassword }: SettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [settingsPending, startSettingsTransition] = useTransition();

  const handlePassword = (formData: FormData) => {
    startTransition(async () => {
      const res = await changePasswordAction(formData);
      const messageEl = document.getElementById("password-message");
      if (messageEl) {
        messageEl.textContent = res?.error
          ? res.error.formErrors?.[0] || "Unable to update password."
          : "Password updated.";
        messageEl.className = res?.error
          ? "text-sm text-destructive"
          : "text-sm text-emerald-600";
      }
      if (!res?.error) {
        (document.getElementById("password-form") as HTMLFormElement)?.reset();
      }
    });
  };

  const handleProfile = (formData: FormData) => {
    startTransition(async () => {
      const res = await updateProfileAction(formData);
      const messageEl = document.getElementById("profile-message");
      if (messageEl) {
        messageEl.textContent = res?.error
          ? res.error.formErrors?.[0] || "Unable to update profile."
          : "Profile updated.";
        messageEl.className = res?.error
          ? "text-sm text-destructive"
          : "text-sm text-emerald-600";
      }
    });
  };

  const handleSettings = (formData: FormData) => {
    startSettingsTransition(async () => {
      const res = await upsertReceptionistSettingsAction(formData);
      const messageEl = document.getElementById("workflow-message");
      if (messageEl) {
        messageEl.textContent = res?.error
          ? res.error.formErrors?.[0] || "Unable to save settings."
          : "Settings saved.";
        messageEl.className = res?.error
          ? "text-sm text-destructive"
          : "text-sm text-emerald-600";
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Account</h2>
            <p className="text-sm text-muted-foreground">Change your password.</p>
          </div>
          {!hasPassword ? (
            <Badge variant="warning">No password set</Badge>
          ) : null}
        </div>
        <form
          id="password-form"
          action={handlePassword}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          {hasPassword ? (
            <Input name="currentPassword" type="password" placeholder="Current password" required />
          ) : null}
          <Input name="newPassword" type="password" placeholder="New password" required />
          <Input
            name="confirmNewPassword"
            type="password"
            placeholder="Confirm new password"
            required
          />
          <div className="sm:col-span-3 flex items-center justify-between">
            <div id="password-message" className="text-sm text-muted-foreground" />
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving..." : hasPassword ? "Change password" : "Set password"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">My profile</h2>
            <p className="text-sm text-muted-foreground">Update your name.</p>
          </div>
          <Badge variant="outline">{staffRole || "Receptionist"}</Badge>
        </div>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" action={handleProfile}>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Name</label>
            <Input name="name" defaultValue={user.name} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Email</label>
            <Input value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Hospital</label>
            <Input value={hospital.name} disabled />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Hospital contact</label>
            <Input
              value={hospital.contactEmail || hospital.contactPhone || "—"}
              disabled
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between">
            <div id="profile-message" className="text-sm text-muted-foreground" />
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving..." : "Update profile"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Front desk workflow defaults</h2>
            <p className="text-sm text-muted-foreground">
              Hospital-scoped receptionist settings.
            </p>
          </div>
        </div>
        <form className="mt-4 space-y-4" action={handleSettings}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Slot length (minutes)</label>
              <Select name="slotLengthMinutes" defaultValue={String(settings.slotLengthMinutes)}>
                {[10, 15, 20, 30, 45, 60].map((v) => (
                  <option key={v} value={v}>
                    {v} min
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Buffer (minutes)</label>
              <Input
                name="bufferMinutes"
                type="number"
                min={0}
                max={30}
                defaultValue={settings.bufferMinutes}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Allow check-in up to (minutes early)</label>
              <Input
                name="checkInEarlyMinutes"
                type="number"
                min={0}
                max={240}
                defaultValue={settings.checkInEarlyMinutes}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Allow walk-ins</label>
              <Select name="allowWalkIns" defaultValue={String(settings.allowWalkIns)}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Allow double booking</label>
              <Select name="allowDoubleBooking" defaultValue={String(settings.allowDoubleBooking)}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Default new appointment status</label>
              <Select
                name="defaultNewAppointmentStatus"
                defaultValue={settings.defaultNewAppointmentStatus}
              >
                <option value="SCHEDULED">Scheduled</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Frequent cancellations alert</label>
              <Select
                name="showFrequentCancellationsAlert"
                defaultValue={String(settings.showFrequentCancellationsAlert)}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Cancellation threshold</label>
              <Input
                name="frequentCancellationThreshold"
                type="number"
                min={0}
                max={20}
                defaultValue={settings.frequentCancellationThreshold}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Window (days)</label>
              <Input
                name="frequentCancellationWindowDays"
                type="number"
                min={1}
                max={365}
                defaultValue={settings.frequentCancellationWindowDays}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div id="workflow-message" className="text-sm text-muted-foreground" />
            <Button type="submit" disabled={settingsPending}>
              {settingsPending ? "Saving..." : "Save defaults"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
