import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CalendarCheck, Archive } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LeadCard } from "@/components/LeadCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CADENCE_DAYS,
  OUTCOMES,
  OUTCOME_LABEL,
  cadenceAction,
  fetchLeads,
  fetchTasks,
  logAttempt,
  moveLead,
  pct,
  updateLead,
  type Lead,
} from "@/lib/crm";

export const Route = createFileRoute("/cadencia")({
  head: () => ({
    meta: [
      { title: "Pipeline de Cadência — CRM Real Assessoria" },
      {
        name: "description",
        content:
          "Cadência de 14 dias da Real Assessoria: um dia por coluna, arraste o lead conforme executa ligações, áudios e mensagens de reengajamento.",
      },
      { property: "og:title", content: "Pipeline de Cadência — CRM Real Assessoria" },
      {
        property: "og:description",
        content: "Acompanhe cada lead dia a dia na cadência de follow up de 14 dias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CadenciaPage,
});

function DayColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[110px] space-y-3 rounded-xl p-1 transition-colors ${
        isOver ? "bg-primary/15 ring-2 ring-primary" : ""
      }`}
    >
      {children}
    </div>
  );
}

function CadenciaPage() {
  const qc = useQueryClient();
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const [drop, setDrop] = useState<{ lead: Lead; day: number } | null>(null);
  const [outcome, setOutcome] = useState("");
  const [meeting, setMeeting] = useState<Lead | null>(null);
  const [callAt, setCallAt] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const inCadence = leads.filter(
    (l) => l.cadence_status === "ativa" && (l.stage === "tentativa" || l.stage === "no_show"),
  );
  const closed = leads.filter((l) => l.cadence_status === "encerrada");

  const advance = useMutation({
    mutationFn: async () => {
      if (!drop) return;
      if (!outcome) throw new Error("Registre o resultado da tentativa.");
      const from = drop.lead.cadence_day ?? 1;
      await logAttempt(drop.lead.id, from, outcome);
      const archive = drop.day >= CADENCE_DAYS && outcome !== "atendeu";
      await updateLead(drop.lead.id, {
        cadence_day: drop.day,
        cadence_status: archive ? "encerrada" : "ativa",
      });
      return archive;
    },
    onSuccess: (archive) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setDrop(null);
      setOutcome("");
      toast.success(archive ? "Dia 14 sem resposta — cadência encerrada." : "Tentativa registrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const book = useMutation({
    mutationFn: async () => {
      if (!meeting) return;
      if (!callAt) throw new Error("Informe data e hora da call.");
      await moveLead(meeting, "call_marcada", { call_at: new Date(callAt).toISOString() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setMeeting(null);
      setCallAt("");
      toast.success("Call marcada — lead saiu da cadência.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onDragEnd = (e: DragEndEvent) => {
    const day = Number(String(e.over?.id ?? "").replace("dia-", ""));
    const lead = inCadence.find((l) => l.id === e.active.id);
    if (!lead || !day || lead.cadence_day === day) return;
    setOutcome("");
    setDrop({ lead, day });
  };

  const dayStats = Array.from({ length: CADENCE_DAYS }).map((_, i) => {
    const day = i + 1;
    const dayTasks = tasks.filter((t) => t.day_offset === day);
    const answered = dayTasks.filter((t) => t.outcome === "atendeu").length;
    return { day, total: dayTasks.length, answered, rate: pct(answered, dayTasks.length) };
  });
  const best = [...dayStats].sort((a, b) => b.rate - a.rate)[0];

  return (
    <AppShell
      title="Pipeline de Cadência"
      subtitle="14 dias, uma coluna por dia. Arraste o lead conforme executa cada tarefa."
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Em cadência</p>
          <p className="mt-1 text-2xl font-bold">{inCadence.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Tentativas registradas
          </p>
          <p className="mt-1 text-2xl font-bold">{tasks.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Melhor dia de reengajamento
          </p>
          <p className="mt-1 text-2xl font-bold text-success">
            {best && best.total ? `Dia ${best.day} · ${best.rate}%` : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Cadências encerradas
          </p>
          <p className="mt-1 text-2xl font-bold">{closed.length}</p>
        </Card>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {dayStats.map(({ day, total, rate }) => {
            const items = inCadence.filter((l) => (l.cadence_day ?? 1) === day);
            return (
              <div key={day} className="w-[262px] shrink-0">
                <div className="mb-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Dia {day}</p>
                    <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      {items.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{cadenceAction(day)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    Taxa de resposta: {total ? `${rate}%` : "—"}
                  </p>
                </div>
                <DayColumn id={`dia-${day}`}>
                  {items.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} timeFrom={lead.created_at}>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setCallAt("");
                            setMeeting(lead);
                          }}
                        >
                          <CalendarCheck className="size-3.5" /> Marcou reunião
                        </Button>
                      </div>
                    </LeadCard>
                  ))}
                  {items.length === 0 && (
                    <Card className="p-5 text-center text-xs text-muted-foreground">
                      Solte um lead aqui
                    </Card>
                  )}
                </DayColumn>
              </div>
            );
          })}
        </div>
      </DndContext>

      {closed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Archive className="size-4" /> Cadência encerrada
          </h2>
          <div className="flex flex-wrap gap-2">
            {closed.map((l) => (
              <Badge key={l.id} variant="secondary">
                {l.name}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <Dialog open={!!drop} onOpenChange={(o) => !o && setDrop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {drop?.lead.name} → Dia {drop?.day}
            </DialogTitle>
            <DialogDescription>
              Registre o resultado da tentativa do Dia {drop?.lead.cadence_day ?? 1}:{" "}
              {cadenceAction(drop?.lead.cadence_day ?? 1)}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Resultado</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Atendeu, não atendeu, caixa postal, bloqueou" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {OUTCOME_LABEL[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDrop(null)}>
              Cancelar
            </Button>
            <Button disabled={advance.isPending} onClick={() => advance.mutate()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!meeting} onOpenChange={(o) => !o && setMeeting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead respondeu — {meeting?.name}</DialogTitle>
            <DialogDescription>
              O lead volta para "Call Marcada" no pipeline e sai da cadência.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Data e hora da call</Label>
            <Input
              type="datetime-local"
              className="mt-1.5"
              value={callAt}
              onChange={(e) => setCallAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMeeting(null)}>
              Cancelar
            </Button>
            <Button disabled={book.isPending} onClick={() => book.mutate()}>
              Marcar call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
