import Link from "next/link";

import { EquipmentForm } from "@/app/components/hospital-admin/equipment-form";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { requireHospitalAdmin } from "@/lib/require-hospital-admin";
import { getHospitalScope } from "@/lib/services/hospital-admin/access";
import { listEquipment, listRooms } from "@/lib/services/hospital-admin/rooms";
import { retireRoomAction } from "@/app/hospitaladmin/(portal)/actions";

export default async function RoomsPage() {
  const session = await requireHospitalAdmin();
  const scope = await getHospitalScope(session.user.id);
  const [rooms, equipment] = await Promise.all([
    listRooms(scope.hospitalId),
    listEquipment(scope.hospitalId),
  ]);
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const occupied = rooms.reduce(
    (sum, room) => sum + (room.occupiedBeds ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Facilities
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Rooms & equipment
          </h2>
          <p className="text-sm text-muted-foreground">
            Operational-only view. Patient-level data never appears.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/hospitaladmin/rooms/new">Add room</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total rooms</CardTitle>
            <CardDescription>Active inventory</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {rooms.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bed capacity</CardTitle>
            <CardDescription>Operational vs total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{occupied}</p>
            <p className="text-sm text-muted-foreground">
              of {totalCapacity} beds in use
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Equipment</CardTitle>
            <CardDescription>Tracked assets</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {equipment.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
          <CardDescription>Scope limited to this hospital</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No rooms configured.
                  </TableCell>
                </TableRow>
              )}
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    <div className="font-semibold">{room.name}</div>
                    {room.notes && (
                      <p className="text-xs text-muted-foreground">
                        {room.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{room.type.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    {room.occupiedBeds ?? 0}/{room.capacity}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={room.status === "ACTIVE" ? "success" : "outline"}
                    >
                      {room.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={retireRoomAction.bind(null, room.id)}>
                      <Button variant="ghost" size="sm">
                        Archive
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
          <CardDescription>Track non-PHI operational assets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Room</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No equipment tracked.
                  </TableCell>
                </TableRow>
              )}
              {equipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "AVAILABLE"
                          ? "success"
                          : item.status === "IN_USE"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.room?.name ?? "Unassigned"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add equipment</CardTitle>
          <CardDescription>
            Assets automatically inherit your hospital scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EquipmentForm
            rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
