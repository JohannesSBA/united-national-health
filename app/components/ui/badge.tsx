import { cn } from "@/lib/utils";

const badgeVariants: Record<string, string> = {
  default:
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  outline: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs",
  success:
    "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700",
  warning:
    "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof badgeVariants;
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return <span className={cn(badgeVariants[variant], className)} {...props} />;
}
