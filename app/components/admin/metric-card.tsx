import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  footer?: ReactNode;
};

export function MetricCard({
  title,
  value,
  icon,
  description,
  footer,
}: MetricCardProps) {
  return (
    <Card className="h-full border border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-semibold">{value}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
        {footer}
      </CardContent>
    </Card>
  );
}
