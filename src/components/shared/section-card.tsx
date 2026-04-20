import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  children,
  rightSlot,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`rounded-[24px] border border-border bg-card p-5 shadow-[0_16px_40px_rgba(109,85,70,0.08)] backdrop-blur sm:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? <p className="text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
      {children}
    </section>
  );
}
