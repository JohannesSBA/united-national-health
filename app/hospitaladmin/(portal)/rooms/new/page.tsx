import Link from "next/link";

import { RoomCreateForm } from "@/app/components/hospital-admin/room-form";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export default function NewRoomPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Facilities
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Add room</h2>
          <p className="text-sm text-muted-foreground">
            Operational data only. No patient info stored.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/hospitaladmin/rooms">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room metadata</CardTitle>
          <CardDescription>
            Define operational capacity and notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}
