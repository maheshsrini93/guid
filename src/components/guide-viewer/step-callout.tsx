import { AlertTriangle, Info, Lightbulb } from "lucide-react";

interface StepCalloutProps {
  type: "tip" | "warning" | "info";
  children: React.ReactNode;
}

const config = {
  tip: {
    icon: Lightbulb,
    label: "Tip",
    bg: "bg-[oklch(0.85_0.15_85/0.15)]",
    border: "border-l-[oklch(0.85_0.15_85)]",
    darkBg: "dark:bg-[oklch(0.85_0.15_85/0.1)]",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    bg: "bg-[oklch(0.58_0.24_27/0.1)]",
    border: "border-l-[oklch(0.58_0.24_27)]",
    darkBg: "dark:bg-[oklch(0.58_0.24_27/0.08)]",
  },
  info: {
    icon: Info,
    label: "Info",
    bg: "bg-[oklch(0.65_0.15_250/0.1)]",
    border: "border-l-[oklch(0.65_0.15_250)]",
    darkBg: "dark:bg-[oklch(0.65_0.15_250/0.08)]",
  },
} as const;

export function StepCallout({ type, children }: StepCalloutProps) {
  const { icon: Icon, label, bg, border, darkBg } = config[type];

  return (
    <div
      className={`flex gap-3 rounded-lg border-l-[3px] p-4 ${bg} ${border} ${darkBg}`}
      role={type === "warning" ? "alert" : undefined}
    >
      <Icon
        className="mt-0.5 size-5 shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold mb-1">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
