import { cn } from "@/lib/utils";

const statusStyles = {
  planning: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
  needed: "bg-red-100 text-red-700",
  reserved: "bg-blue-100 text-blue-700",
  packed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-amber-100 text-amber-700",
  on_site: "bg-emerald-100 text-emerald-700",
  returned: "bg-slate-100 text-slate-600",
};

const labels = {
  planning: "Planning",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  needed: "Needed",
  reserved: "Reserved",
  packed: "Packed",
  shipped: "Shipped",
  on_site: "On Site",
  returned: "Returned",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      statusStyles[status] || "bg-muted text-muted-foreground"
    )}>
      {labels[status] || status}
    </span>
  );
}