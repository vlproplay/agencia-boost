import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Phone, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import {
  STAGES,
  fetchLeads,
  fetchTasks,
  initials,
  moveLead,
  type CadenceTask,
  type Stage,
} from "@/lib/crm";

export const Route = createFileRoute("/cadencia")({
  head: () => ({
    meta: [
      { title: "Cadência de Follow Up — CRM Real Agência" },
      {
        name: "description",
        content:
          "Sequência automática de 14 dias para leads que não atenderam: ligações, áudios e mensagens com registro de cada tentativa.",
      },
      { property: "og:title", content: "Cadência de Follow Up — CRM Real Agência" },
      {
        property: "og:description",
        content: "Tarefas diárias de follow up para o SDR reativar leads que não atenderam.",
      },
    ],
  }),
  component: CadenciaPage,
});

function CadenciaPage() {
  const qc = useQueryClient();
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const [doing, setDoing] = useState<CadenceTask | null>(null);
  const [outcome, setOutcome] = useState("");
  const [returning, setReturning] = useState<string | null>(null);
  const [returnStage, setReturnStage] = useState<Stage>("mql");

  const leadById = Object.fromEntries(leads.map((l) => [l.id, l]));
  const activeLeads = leads.filter((l) => l.stage === "tentativa" || l.stage === "no_show");

  const complete = useMutation({
    mutationFn: async () => {
      if (!doing) return;
      const { error } = await supabase
        .from("cadence_tasks")
        .update({ done: true, done_at: new Date().toISOString(), outcome })
        .eq("id", doing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setDoing(null);
      setOutcome("");
      toast.success("Tarefa concluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const back = useMutation({
    mutationFn: async () => {
      if (!returning) return;
      await moveLead(returning, returnStage);
      await supabase.from("cadence_tasks").delete().eq("lead_id", returning).eq("done", false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setReturning(null);
      toast.success("Lead devolvido ao pipeline.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const today = new Date().toISOString().slice(0, 10);
  const pending = tasks.filter((t) => !t.done && leadById[t.lead_id]);
  const dueToday = pending.filter((t) => t.due_date <= today);
  const upcoming = pending.filter((t) => t.due_date > today);

  const renderTask = (t: CadenceTask) => {
    const lead = leadById[t.lead_id];
    if (!lead) return null;
    const late = t.due_date < today;
    return (
      <Card key={t.id} className="flex flex-wrap items-center gap-3 p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
          {initials(lead.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{lead.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="size-3" /> {lead.phone ?? "sem telefone"}
          </p>
        </div>
        <div className="min-w-[190px] flex-1">
          <p className="text-sm font-medium">{t.action}</p>
          <p className="text-xs text-muted-foreground">
            Dia {t.day_offset} · {new Date(`${t.due_date}T12:00`).toLocaleDateString("pt-BR")}
          </p>
        </div>
        {late && <Badge variant="destructive">Atrasada</Badge>}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setOutcome(""); setDoing(t); }}>
            <CheckCircle2 className="size-4" /> Feito
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setReturnStage("mql"); setReturning(lead.id); }}
          >
            <Undo2 className="size-4" /> Respondeu
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <AppShell
      title="Cadência de Follow Up"
      subtitle="Sequência de 14 dias para leads que não atenderam"
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Leads em cadência</p>
          <p className="mt-1 text-2xl font-bold">{activeLeads.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Tarefas de hoje</p>
          <p className="mt-1 text-2xl font-bold">{dueToday.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Atrasadas</p>
          <p className="mt-1 text-2xl font-bold text-destructive">
            {pending.filter((t) => t.due_date < today).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Concluídas</p>
          <p className="mt-1 text-2xl font-bold text-success">
            {tasks.filter((t) => t.done).length}
          </p>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Para executar agora
      </h2>
      <div className="space-y-3">
        {dueToday.map(renderTask)}
        {dueToday.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma tarefa pendente para hoje.
          </Card>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Próximos dias
      </h2>
      <div className="space-y-3">
        {upcoming.map(renderTask)}
        {upcoming.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma tarefa agendada.
          </Card>
        )}
      </div>

      <Dialog open={!!doing} onOpenChange={(o) => !o && setDoing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar tentativa</DialogTitle>
            <DialogDescription>{doing?.action}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>O que aconteceu?</Label>
            <Textarea
              className="mt-1.5"
              placeholder="Ex: ligou, caiu na caixa postal, mandou áudio"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDoing(null)}>
              Cancelar
            </Button>
            <Button disabled={complete.isPending} onClick={() => complete.mutate()}>
              Marcar como feito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returning} onOpenChange={(o) => !o && setReturning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead respondeu</DialogTitle>
            <DialogDescription>
              Escolha para qual coluna do pipeline o lead volta. A cadência é encerrada.
            </DialogDescription>
          </DialogHeader>
          <Select value={returnStage} onValueChange={(v) => setReturnStage(v as Stage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.filter((s) => s.id !== "tentativa" && s.id !== "no_show").map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReturning(null)}>
              Cancelar
            </Button>
            <Button disabled={back.isPending} onClick={() => back.mutate()}>
              Devolver ao pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
