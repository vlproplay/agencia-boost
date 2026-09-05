import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Phone, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  LOST_REASONS,
  PLANS,
  STAGES,
  brl,
  elapsedLabel,
  fetchLeads,
  initials,
  minutesSince,
  moveLead,
  type Lead,
  type Stage,
} from "@/lib/crm";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline de Vendas — CRM Real Agência" },
      {
        name: "description",
        content:
          "Kanban comercial da Real Agência: do novo lead do Meta até a venda fechada, com BANT, calls, propostas e motivos de perda.",
      },
      { property: "og:title", content: "Pipeline de Vendas — CRM Real Agência" },
      {
        property: "og:description",
        content: "Kanban do time comercial com todas as etapas do lead até o fechamento.",
      },
    ],
  }),
  component: PipelinePage,
});

type MoveState = { lead: Lead; to: Stage } | null;

function LeadCard({
  lead,
  onMove,
}: {
  lead: Lead;
  onMove: (lead: Lead) => void;
}) {
  const late = lead.stage === "novo" && minutesSince(lead.stage_changed_at) >= 5;
  return (
    <Card
      className={`p-3 transition-shadow hover:shadow-md ${late ? "border-destructive bg-destructive/5" : ""}`}
    >
      <div className="flex items-start gap-2.5">
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
          <p className="truncate text-sm font-bold">{lead.name}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Phone className="size-3" />
            {lead.phone ?? "sem telefone"}
          </p>
        </div>
        <span
          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            late ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          <Clock className="size-3" />
          {elapsedLabel(lead.stage_changed_at)}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {lead.segment && <Badge variant="secondary">{lead.segment}</Badge>}
        {lead.market_time && <Badge variant="secondary">{lead.market_time}</Badge>}
        {lead.invests_traffic && (
          <Badge variant="secondary">Tráfego: {lead.invests_traffic}</Badge>
        )}
        {lead.revenue && <Badge variant="secondary">{lead.revenue}</Badge>}
      </div>

      {lead.stage === "mql" && lead.bant && (
        <p className="mt-2 rounded-md bg-secondary p-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">BANT:</span> {lead.bant}
        </p>
      )}
      {(lead.stage === "call_marcada" || lead.stage === "no_show") && lead.call_at && (
        <p className="mt-2 text-xs font-semibold">
          Call: {new Date(lead.call_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      )}
      {lead.stage === "venda" && (
        <p className="mt-2 text-xs font-bold text-success">
          {brl(lead.sale_value ?? 0)} · {lead.plan}
        </p>
      )}
      {lead.stage === "perdido" && lead.lost_reason && (
        <p className="mt-2 text-xs font-semibold text-destructive">
          Motivo: {LOST_REASONS.find((r) => r.id === lead.lost_reason)?.label ?? lead.lost_reason}
        </p>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-3 w-full justify-between"
        onClick={() => onMove(lead)}
      >
        Mover etapa
        <ArrowRight className="size-3.5" />
      </Button>
    </Card>
  );
}

function PipelinePage() {
  const qc = useQueryClient();
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
    refetchInterval: 30000,
  });
  const [moving, setMoving] = useState<MoveState>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const move = useMutation({
    mutationFn: async ({ lead, to }: { lead: Lead; to: Stage }) => {
      const patch: Partial<Lead> = {};
      if (to === "mql") {
        if (!form["bant"]?.trim()) throw new Error("Preencha o resultado do BANT para qualificar.");
        patch.bant = form["bant"];
      }
      if (to === "call_marcada") {
        if (!form["call_at"]) throw new Error("Informe data e hora da call.");
        patch.call_at = new Date(form["call_at"]).toISOString();
      }
      if (to === "venda") {
        if (!form["sale_value"] || Number(form["sale_value"]) <= 0)
          throw new Error("Informe o valor da venda.");
        if (!form["plan"]) throw new Error("Selecione o plano contratado.");
        patch.sale_value = Number(form["sale_value"]);
        patch.plan = form["plan"];
        patch.closer = form["closer"] || null;
      }
      if (to === "perdido") {
        if (!form["lost_reason"]) throw new Error("Selecione o motivo da perda.");
        patch.lost_reason = form["lost_reason"];
      }
      await moveLead(lead.id, to, patch);
      return to;
    },
    onSuccess: (to) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setMoving(null);
      setForm({});
      toast.success(
        to === "tentativa" || to === "no_show"
          ? "Lead movido e cadência de 14 dias iniciada."
          : "Lead movido com sucesso.",
      );
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

  const target = moving?.to;

  return (
    <AppShell
      title="Pipeline"
      subtitle="Arraste o lead pelas etapas. Cards ficam vermelhos após 5 minutos sem contato."
    >
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setForm({}); setNewOpen(true); }}>
          <Plus className="size-4" /> Novo lead
        </Button>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage.id);
          return (
            <div key={stage.id} className="w-[270px] shrink-0">
              <div className="mb-3 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{stage.label}</p>
                  <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {items.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{stage.hint}</p>
              </div>
              <div className="space-y-3">
                {items.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onMove={(l) => {
                      setForm({});
                      setMoving({ lead: l, to: l.stage });
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover {moving?.lead.name}</DialogTitle>
            <DialogDescription>Escolha a nova etapa do lead no funil.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nova etapa</Label>
              <Select
                value={target ?? "novo"}
                onValueChange={(v) =>
                  setMoving((m) => (m ? { ...m, to: v as Stage } : m))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {target === "mql" && (
              <div>
                <Label>Resultado do BANT (obrigatório)</Label>
                <Textarea
                  className="mt-1.5"
                  placeholder="Budget, autoridade, necessidade e timing"
                  value={form["bant"] ?? ""}
                  onChange={(e) => set("bant", e.target.value)}
                />
              </div>
            )}

            {target === "call_marcada" && (
              <div>
                <Label>Data e hora da call</Label>
                <Input
                  type="datetime-local"
                  className="mt-1.5"
                  value={form["call_at"] ?? ""}
                  onChange={(e) => set("call_at", e.target.value)}
                />
              </div>
            )}

            {target === "venda" && (
              <div className="space-y-3">
                <div>
                  <Label>Plano contratado</Label>
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
                  <Label>Closer</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Quem fechou"
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

            {(target === "tentativa" || target === "no_show") && (
              <p className="rounded-lg bg-accent p-3 text-xs font-medium">
                Ao confirmar, a cadência de follow up de 14 dias é criada automaticamente.
              </p>
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
              ["name", "Nome"],
              ["phone", "Telefone"],
              ["segment", "Segmento"],
              ["market_time", "Tempo de mercado"],
              ["invests_traffic", "Já investe em tráfego"],
              ["revenue", "Faturamento"],
            ].map(([k, label]) => (
              <div key={k as string}>
                <Label>{label}</Label>
                <Input
                  className="mt-1.5"
                  value={form[k as string] ?? ""}
                  onChange={(e) => set(k as string, e.target.value)}
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
