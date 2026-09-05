import { useDraggable } from "@dnd-kit/core";
import { Clock, GripVertical, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { elapsedLabel, initials, minutesSince, type Lead } from "@/lib/crm";

export function LeadCard({
  lead,
  alert,
  timeFrom,
  children,
}: {
  lead: Lead;
  alert?: boolean;
  timeFrom?: string;
  children?: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });
  const late = alert && minutesSince(lead.stage_changed_at) >= 5;
  const since = timeFrom ?? lead.stage_changed_at;

  return (
    <Card
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
          : undefined
      }
      className={`relative p-3 transition-shadow ${isDragging ? "shadow-lg" : "hover:shadow-md"} ${
        late ? "animate-pulse border-2 border-destructive bg-destructive/5" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          ref={undefined}
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label={`Arrastar ${lead.name}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" />
        </button>
        {lead.photo_url ? (
          <img
            src={lead.photo_url}
            alt={lead.name}
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
            {initials(lead.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            {lead.name}
            {lead.is_mql && (
              <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">
                MQL
              </span>
            )}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Phone className="size-3" />
            {lead.phone ?? "sem telefone"}
          </p>
        </div>
        <span
          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            late
              ? "bg-destructive text-destructive-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <Clock className="size-3" />
          {elapsedLabel(since)}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {lead.segment && <Badge variant="secondary">{lead.segment}</Badge>}
        {lead.market_time && <Badge variant="secondary">{lead.market_time}</Badge>}
        {lead.invests_traffic && <Badge variant="secondary">Tráfego: {lead.invests_traffic}</Badge>}
        {lead.revenue && <Badge variant="secondary">{lead.revenue}</Badge>}
        <Badge variant="outline">
          {lead.source === "organico" ? "Orgânico" : "Tráfego pago"}
        </Badge>
      </div>

      {children}
    </Card>
  );
}
