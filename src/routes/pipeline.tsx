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
import { BadgeCheck, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LeadCard } from "@/components/LeadCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  CONTACT_CHANNELS,
  LOST_REASONS,
  PLANS,
  STAGES,
  addMonths,
  brl,
  fetchLeads,
  moveLead,
  updateLead,
  type Lead,
  type Stage,
} from "@/lib/crm";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline de Vendas — CRM Real Assessoria" },
      {
        name: "description",
        content:
          "Kanban comercial da Real Assessoria com arrastar e soltar: do novo lead do Meta até a venda fechada, com calls, propostas e motivos de perda.",
      },
      { property: "og:title", content: "Pipeline de Vendas — CRM Real Assessoria" },
      {
        property: "og:description",
        content: "Kanban do time comercial com todas as etapas do lead até o fechamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PipelinePage,
});

function Column({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] space-y-3 rounded-xl p-1 transition-colors ${
        isOver ? "bg-primary/15 ring-2 ring-primary" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function PipelinePage() {
  const qc = useQueryClient();
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
    refetchInterval: 30000,
  });
  const [moving, setMoving] = useState<{ lead: Lead; to: Stage } | null>(null);
  const [mqlLead, setMqlLead] = useState<Lead | null>(null);
  const [attempt, setAttempt] = useState<Lead | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const needsForm = (to: Stage) =>
    to === "call_marcada" || to === "call_realizada" || to === "proposta" || to === "venda" || to === "perdido";

  const move = useMutation({
    mutationFn: async ({ lead, to }: { lead: Lead; to: Stage }) => {
      const patch: Partial<Lead> = {};
      if (to === "call_marcada") {
        if (!form["call_at"]) throw new Error("Informe data e hora da call.");
        patch.call_at = new Date(form["call_at"]).toISOString();
      }
      if (to === "call_realizada") patch.call_notes = form["call_notes"] || null;
      if (to === "proposta") {
        patch.proposal_plan = form["proposal_plan"] || null;
        patch.proposal_value = form["proposal_value"] ? Number(form["proposal_value"]) : null;
      }
      if (to === "venda") {
        if (!form["plan"]) throw new Error("Selecione o plano contratado.");
        if (!form["sale_value"] || Number(form["sale_value"]) <= 0)
          throw new Error("Informe o valor da venda.");
        if (!form["contract_start"]) throw new Error("Informe a data de início do contrato.");
        patch.plan = form["plan"];
        patch.sale_value = Number(form["sale_value"]);
        patch.closer = form["closer"] || null;
        patch.contract_start = form["contract_start"];
        patch.contract_end = addMonths(new Date(`${form["contract_start"]}T12:00`), 3)
          .toISOString()
          .slice(0, 10);
      }
      if (to === "perdido") {
        if (!form["lost_reason"]) throw new Error("Selecione o motivo da perda.");
        patch.lost_reason = form["lost_reason"];
      }
      await moveLead(lead, to, patch);
      return to;
    },
    onSuccess: (to) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setMoving(null);
      setForm({});
      toast.success(
        to === "tentativa" || to === "no_show"
          ? "Lead movido e cadência iniciada."
          : to === "call_marcada"
            ? "Call marcada — lead saiu da cadência."
            : "Lead movido com sucesso.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMql = useMutation({
    mutationFn: async () => {
      if (!mqlLead) return;
      const required = ["bant_budget", "bant_authority", "bant_need", "bant_timeline"];
      if (required.some((k) => !form[k]?.trim()))
        throw new Error("Preencha os quatro campos do BANT para qualificar o lead.");
      await updateLead(mqlLead.id, {
        is_mql: true,
        mql_at: new Date().toISOString(),
        bant_budget: form["bant_budget"] ?? "",
        bant_authority: form["bant_authority"] ?? "",
        bant_need: form["bant_need"] ?? "",
        bant_timeline: form["bant_timeline"] ?? "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setMqlLead(null);
      setForm({});
      toast.success("Lead classificado como MQL.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAttempt = useMutation({
    mutationFn: async () => {
      if (!attempt) return;
      if (!form["channel"]) throw new Error("Selecione o canal do contato.");
      const line = `${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · ${form["channel"]}${form["note"] ? ` — ${form["note"]}` : ""}`;
      await updateLead(attempt.id, {
        notes: attempt.notes ? `${attempt.notes}\n${line}` : line,
        first_contact_at: attempt.first_contact_at ?? new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setAttempt(null);
      setForm({});
      toast.success("Tentativa registrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form["name"]?.trim()) throw new Error("Informe o nome do lead.");
      const { error } = await supabase.from("leads").insert({
        name: form["name"],
        phone: form["phone"] ?? null,
        segment: form["segment"] ?? null,
        market_time: form["market_time"] ?? null,
        invests_traffic: form["invests_traffic"] ?? null,
        revenue: form["revenue"] ?? null,
        source: form["source"] ?? "trafego_pago",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setNewOpen(false);
      setForm({});
      toast.success("Lead criado — SDR notificado no WhatsApp.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onDragEnd = (e: DragEndEvent) => {
    const to = e.over?.id as Stage | undefined;
    const lead = leads.find((l) => l.id === e.active.id);
    if (!to || !lead || lead.stage === to) return;
    setForm({});
    if (needsForm(to)) setMoving({ lead, to });
    else move.mutate({ lead, to });
  };

  const target = moving?.to;

  return (
    <AppShell
      title="Pipeline"
      subtitle="Arraste os cards entre as colunas. Novo lead pisca em vermelho após 5 minutos sem contato."
      actions={
        <Button
          onClick={() => {
            setForm({});
            setNewOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo lead
        </Button>
      }
    >
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {STAGES.map((stage) => {
            const items = leads.filter((l) => l.stage === stage.id);
            return (
              <div key={stage.id} className="w-[272px] shrink-0">
                <div className="mb-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{stage.label}</p>
                    <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      {items.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{stage.hint}</p>
                </div>
                <Column id={stage.id}>
                  {items.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} alert={stage.id === "novo"}>
                      {lead.call_at && (stage.id === "call_marcada" || stage.id === "no_show") && (
                        <p className="mt-2 text-xs font-semibold">
                          Call:{" "}
                          {new Date(lead.call_at).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      {stage.id === "call_realizada" && lead.call_notes && (
                        <p className="mt-2 rounded-md bg-secondary p-2 text-xs text-muted-foreground">
                          {lead.call_notes}
                        </p>
                      )}
                      {stage.id === "proposta" && lead.proposal_plan && (
                        <p className="mt-2 text-xs font-semibold">
                          {lead.proposal_plan} · {brl(lead.proposal_value ?? 0)}
                        </p>
                      )}
                      {stage.id === "venda" && (
                        <p className="mt-2 text-xs font-bold text-success">
                          {brl(lead.sale_value ?? 0)} · {lead.plan}
                        </p>
                      )}
                      {stage.id === "perdido" && lead.lost_reason && (
                        <p className="mt-2 text-xs font-semibold text-destructive">
                          Motivo:{" "}
                          {LOST_REASONS.find((r) => r.id === lead.lost_reason)?.label ??
                            lead.lost_reason}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        {!lead.is_mql && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                              setForm({});
                              setMqlLead(lead);
                            }}
                          >
                            <BadgeCheck className="size-3.5" /> MQL
                          </Button>
                        )}
                        {stage.id === "tentativa" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                              setForm({});
                              setAttempt(lead);
                            }}
                          >
                            Registrar tentativa
                          </Button>
                        )}
                      </div>
                    </LeadCard>
                  ))}
                  {items.length === 0 && (
                    <Card className="p-6 text-center text-xs text-muted-foreground">
                      Solte um lead aqui
                    </Card>
                  )}
                </Column>
              </div>
            );
          })}
        </div>
      </DndContext>

      <Dialog open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moving?.lead.name} → {STAGES.find((s) => s.id === target)?.label}
            </DialogTitle>
            <DialogDescription>Complete as informações da etapa.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {target === "call_marcada" && (
              <div>
                <Label>Data e hora da call (obrigatório)</Label>
                <Input
                  type="datetime-local"
                  className="mt-1.5"
                  value={form["call_at"] ?? ""}
                  onChange={(e) => set("call_at", e.target.value)}
                />
              </div>
            )}

            {target === "call_realizada" && (
              <div>
                <Label>Observações da call</Label>
                <Textarea
                  className="mt-1.5"
                  value={form["call_notes"] ?? ""}
                  onChange={(e) => set("call_notes", e.target.value)}
                />
              </div>
            )}

            {target === "proposta" && (
              <div className="space-y-3">
                <div>
                  <Label>Plano apresentado</Label>
                  <Select
                    value={form["proposal_plan"] ?? ""}
                    onValueChange={(v) => {
                      set("proposal_plan", v);
                      set("proposal_value", String(PLANS.find((p) => p.id === v)?.value ?? ""));
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.id} — {brl(p.value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor apresentado</Label>
                  <Input
                    type="number"
                    className="mt-1.5"
                    value={form["proposal_value"] ?? ""}
                    onChange={(e) => set("proposal_value", e.target.value)}
                  />
                </div>
              </div>
            )}

            {target === "venda" && (
              <div className="space-y-3">
                <div>
                  <Label>Plano contratado (obrigatório)</Label>
                  <Select
                    value={form["plan"] ?? ""}
                    onValueChange={(v) => {
                      set("plan", v);
                      set("sale_value", String(PLANS.find((p) => p.id === v)?.value ?? ""));
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.id} — {brl(p.value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor da venda (obrigatório)</Label>
                  <Input
                    type="number"
                    className="mt-1.5"
                    value={form["sale_value"] ?? ""}
                    onChange={(e) => set("sale_value", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Início do contrato (obrigatório)</Label>
                  <Input
                    type="date"
                    className="mt-1.5"
                    value={form["contract_start"] ?? ""}
                    onChange={(e) => set("contract_start", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    O fim do contrato é calculado automaticamente em 3 meses.
                  </p>
                </div>
                <div>
                  <Label>Closer</Label>
                  <Input
                    className="mt-1.5"
                    value={form["closer"] ?? ""}
                    onChange={(e) => set("closer", e.target.value)}
                  />
                </div>
              </div>
            )}

            {target === "perdido" && (
              <div>
                <Label>Motivo da perda (obrigatório)</Label>
                <Select
                  value={form["lost_reason"] ?? ""}
                  onValueChange={(v) => set("lost_reason", v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOST_REASONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setMoving(null)}>
              Cancelar
            </Button>
            <Button
              disabled={move.isPending}
              onClick={() => moving && move.mutate({ lead: moving.lead, to: moving.to })}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mqlLead} onOpenChange={(o) => !o && setMqlLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Qualificar {mqlLead?.name} como MQL</DialogTitle>
            <DialogDescription>
              O BANT completo é obrigatório. O lead continua na coluna atual do pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { k: "bant_budget", label: "Budget — quanto está disposto a investir" },
              { k: "bant_authority", label: "Authority — é o decisor?" },
              { k: "bant_need", label: "Need — qual a dor principal" },
              { k: "bant_timeline", label: "Timeline — quando quer começar" },
            ].map(({ k, label }) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input
                  className="mt-1.5"
                  value={form[k] ?? ""}
                  onChange={(e) => set(k, e.target.value)}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMqlLead(null)}>
              Cancelar
            </Button>
            <Button disabled={saveMql.isPending} onClick={() => saveMql.mutate()}>
              Salvar classificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!attempt} onOpenChange={(o) => !o && setAttempt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar tentativa — {attempt?.name}</DialogTitle>
            <DialogDescription>Data e hora são registradas automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Canal</Label>
              <Select value={form["channel"] ?? ""} onValueChange={(v) => set("channel", v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Ligação, WhatsApp ou áudio" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>O que aconteceu</Label>
              <Textarea
                className="mt-1.5"
                value={form["note"] ?? ""}
                onChange={(e) => set("note", e.target.value)}
              />
            </div>
            {attempt?.notes && (
              <div className="max-h-32 overflow-y-auto whitespace-pre-line rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                {attempt.notes}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAttempt(null)}>
              Cancelar
            </Button>
            <Button disabled={saveAttempt.isPending} onClick={() => saveAttempt.mutate()}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
            <DialogDescription>
              Mesmos campos do formulário do Meta. Leads da integração entram aqui automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { k: "name", label: "Nome" },
              { k: "phone", label: "Telefone" },
              { k: "segment", label: "Segmento" },
              { k: "market_time", label: "Tempo de mercado" },
              { k: "invests_traffic", label: "Já investe em tráfego" },
              { k: "revenue", label: "Faturamento mensal" },
            ].map(({ k, label }) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input
                  className="mt-1.5"
                  value={form[k] ?? ""}
                  onChange={(e) => set(k, e.target.value)}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              Criar lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
