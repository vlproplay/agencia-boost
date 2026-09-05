import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { brl, fetchGoals, fetchLeads, pct, type Lead } from "@/lib/crm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Comercial — CRM Real Assessoria" },
      {
        name: "description",
        content:
          "Métricas semanais e mensais do time comercial da Real Assessoria: leads, MQLs, calls, vendas, CPL, CAC, ticket médio e tempo de resposta do SDR.",
      },
      { property: "og:title", content: "Dashboard Comercial — CRM Real Assessoria" },
      {
        property: "og:description",
        content: "Leads, calls, vendas, metas e tempo de resposta do SDR em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const AFTER = {
  call: ["call_marcada", "no_show", "call_realizada", "proposta", "venda"],
  callFeita: ["call_realizada", "proposta", "venda"],
};

function metrics(leads: Lead[], from: Date) {
  const period = leads.filter((l) => new Date(l.created_at) >= from);
  const total = period.length;
  const mqls = period.filter((l) => l.is_mql).length;
  const callsMarcadas = period.filter((l) => AFTER.call.includes(l.stage)).length;
  const noShows = period.filter((l) => l.stage === "no_show").length;
  const callsFeitas = period.filter((l) => AFTER.callFeita.includes(l.stage)).length;
  const vendasList = period.filter((l) => l.stage === "venda");
  const faturamento = vendasList.reduce((s, l) => s + (l.sale_value ?? 0), 0);
  const responded = period.filter((l) => l.first_contact_at);
  const respostaMedia = responded.length
    ? Math.round(
        responded.reduce(
          (s, l) =>
            s + (new Date(l.first_contact_at!).getTime() - new Date(l.created_at).getTime()) / 60000,
          0,
        ) / responded.length,
      )
    : 0;
  return {
    total,
    mqls,
    callsMarcadas,
    noShows,
    callsFeitas,
    vendas: vendasList.length,
    faturamento,
    convLeadCall: pct(callsMarcadas, total),
    convCallVenda: pct(vendasList.length, callsFeitas),
    ticket: vendasList.length ? faturamento / vendasList.length : 0,
    respostaMedia,
  };
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums ${
          tone === "green" ? "text-success" : tone === "red" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </Card>
  );
}

function GoalBar({
  label,
  current,
  goal,
  money,
}: {
  label: string;
  current: number;
  goal: number;
  money?: boolean;
}) {
  const p = Math.min(100, pct(current, goal));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {money ? brl(current) : current} / {money ? brl(goal) : goal}
        </span>
      </div>
      <Progress value={p} className="mt-2 h-3 bg-secondary" />
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{p}% da meta</p>
    </div>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
  const [view, setView] = useState<"semana" | "mes">("semana");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const now = new Date();
  const weekFrom = new Date(now.getTime() - 7 * 86400000);
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = metrics(leads, monthFrom);
  const data = view === "semana" ? metrics(leads, weekFrom) : month;

  const adSpend = goals?.ad_spend ?? 0;
  const spend = view === "semana" ? adSpend / 4 : adSpend;
  const cpl = data.total ? spend / data.total : 0;
  const cac = data.vendas ? spend / data.vendas : 0;

  const leadsPorDia = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(now.getTime() - (13 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return {
      dia: `${d.getDate()}/${d.getMonth() + 1}`,
      leads: leads.filter((l) => l.created_at.slice(0, 10) === key).length,
    };
  });

  const vendasPorSemana = Array.from({ length: 6 }).map((_, i) => {
    const start = new Date(now.getTime() - (6 - i) * 7 * 86400000);
    const end = new Date(now.getTime() - (5 - i) * 7 * 86400000);
    const v = leads.filter(
      (l) =>
        l.stage === "venda" &&
        new Date(l.stage_changed_at) >= start &&
        new Date(l.stage_changed_at) < end,
    );
    return { semana: `Sem ${i + 1}`, vendas: v.length };
  });

  const funil = [
    { etapa: "Lead", qtd: data.total },
    { etapa: "MQL", qtd: data.mqls },
    { etapa: "Call", qtd: data.callsFeitas },
    { etapa: "Venda", qtd: data.vendas },
  ];

  const saveGoals = useMutation({
    mutationFn: async () => {
      if (!goals) return;
      const { error } = await supabase
        .from("goals")
        .update({
          revenue_goal: Number(form["revenue_goal"] ?? goals.revenue_goal),
          sales_goal: Number(form["sales_goal"] ?? goals.sales_goal),
          mrr_goal: Number(form["mrr_goal"] ?? goals.mrr_goal),
          ad_spend: Number(form["ad_spend"] ?? goals.ad_spend),
        })
        .eq("id", goals.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      setEditing(false);
      toast.success("Metas atualizadas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Dashboard"
      subtitle="Resultados do time comercial em tempo real"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-1">
            {(["semana", "mes"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {v === "semana" ? "Semanal" : "Mensal"}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setForm({});
              setEditing(true);
            }}
          >
            <Settings2 className="size-4" /> Metas
          </Button>
        </div>
      }
    >
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Leads recebidos" value={String(data.total)} />
          <Metric label="MQLs qualificados" value={String(data.mqls)} />
          <Metric label="Calls marcadas" value={String(data.callsMarcadas)} />
          <Metric label="No shows" value={String(data.noShows)} />
          <Metric label="Calls realizadas" value={String(data.callsFeitas)} />
          <Metric label="Vendas fechadas" value={String(data.vendas)} tone="green" />
          <Metric label="Faturamento" value={brl(data.faturamento)} tone="green" />
          <Metric label="Lead → Call" value={`${data.convLeadCall}%`} />
          <Metric label="Call → Venda" value={`${data.convCallVenda}%`} />
          <Metric label="CPL médio" value={brl(cpl)} />
          <Metric label="CAC médio" value={brl(cac)} />
          <Metric label="Ticket médio" value={brl(data.ticket)} />
          <Metric
            label="Tempo médio de resposta do SDR"
            value={`${data.respostaMedia} min`}
            tone={data.respostaMedia > 5 ? "red" : "green"}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Meta de resposta: abaixo de 5 minutos entre a entrada do lead e a primeira tentativa do
          SDR.
        </p>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card className="space-y-5 p-5">
          <h3 className="text-base font-bold">Metas do mês</h3>
          <GoalBar
            label="Faturamento"
            current={month.faturamento}
            goal={goals?.revenue_goal ?? 1}
            money
          />
          <GoalBar label="Vendas" current={month.vendas} goal={goals?.sales_goal ?? 1} />
        </Card>
        <Card className="p-5">
          <h3 className="text-base font-bold">Funil de conversão</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funil} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="etapa" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="qtd" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-base font-bold">Leads por dia</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-base font-bold">Vendas por semana</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vendasPorSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Metas do mês</DialogTitle>
            <DialogDescription>
              Defina as metas de faturamento, vendas, MRR e o investimento em tráfego.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { k: "revenue_goal", label: "Meta de faturamento (R$)", v: goals?.revenue_goal },
              { k: "sales_goal", label: "Meta de vendas", v: goals?.sales_goal },
              { k: "mrr_goal", label: "Meta de MRR (R$)", v: goals?.mrr_goal },
              { k: "ad_spend", label: "Investimento em tráfego (R$)", v: goals?.ad_spend },
            ].map(({ k, label, v }) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={form[k] ?? String(v ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button disabled={saveGoals.isPending} onClick={() => saveGoals.mutate()}>
              Salvar metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
