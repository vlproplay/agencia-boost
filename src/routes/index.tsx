import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { brl, fetchGoals, fetchLeads, pct, type Lead } from "@/lib/crm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Comercial — CRM Real Agência" },
      {
        name: "description",
        content:
          "Métricas semanais e mensais do time comercial da Real Agência: leads, MQLs, calls, vendas, faturamento, CPL, CAC e ticket médio.",
      },
      { property: "og:title", content: "Dashboard Comercial — CRM Real Agência" },
      {
        property: "og:description",
        content: "Acompanhe leads, calls, vendas e metas de faturamento em tempo real.",
      },
    ],
  }),
  component: Dashboard,
});

const MOVED_STAGES = {
  mql: ["mql", "call_marcada", "no_show", "call_realizada", "proposta", "venda"],
  callMarcada: ["call_marcada", "no_show", "call_realizada", "proposta", "venda"],
  callFeita: ["call_realizada", "proposta", "venda"],
};

function inRange(iso: string, from: Date) {
  return new Date(iso) >= from;
}

function metrics(leads: Lead[], from: Date) {
  const period = leads.filter((l) => inRange(l.created_at, from));
  const total = period.length;
  const mqls = period.filter((l) => MOVED_STAGES.mql.includes(l.stage)).length;
  const callsMarcadas = period.filter((l) => MOVED_STAGES.callMarcada.includes(l.stage)).length;
  const noShows = period.filter((l) => l.stage === "no_show").length;
  const callsFeitas = period.filter((l) => MOVED_STAGES.callFeita.includes(l.stage)).length;
  const vendasList = period.filter((l) => l.stage === "venda");
  const faturamento = vendasList.reduce((s, l) => s + (l.sale_value ?? 0), 0);
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
  };
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums ${tone === "green" ? "text-success" : ""}`}
      >
        {value}
      </p>
    </Card>
  );
}

function GoalBar({ label, current, goal, money }: { label: string; current: number; goal: number; money?: boolean }) {
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
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });

  const now = new Date();
  const weekFrom = new Date(now.getTime() - 7 * 86400000);
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1);

  const week = metrics(leads, weekFrom);
  const month = metrics(leads, monthFrom);

  const adSpend = goals?.ad_spend ?? 0;
  const cpl = month.total ? adSpend / month.total : 0;
  const cac = month.vendas ? adSpend / month.vendas : 0;

  const leadsPorDia = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(now.getTime() - (13 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return {
      dia: `${d.getDate()}/${d.getMonth() + 1}`,
      leads: leads.filter((l) => l.created_at.slice(0, 10) === key).length,
    };
  });

  const vendasPorSemana = Array.from({ length: 4 }).map((_, i) => {
    const start = new Date(now.getTime() - (4 - i) * 7 * 86400000);
    const end = new Date(now.getTime() - (3 - i) * 7 * 86400000);
    const v = leads.filter(
      (l) =>
        l.stage === "venda" &&
        new Date(l.stage_changed_at) >= start &&
        new Date(l.stage_changed_at) < end,
    );
    return {
      semana: `Sem ${i + 1}`,
      vendas: v.length,
      faturamento: v.reduce((s, l) => s + (l.sale_value ?? 0), 0),
    };
  });

  return (
    <AppShell title="Dashboard" subtitle="Resultados do time comercial em tempo real">
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Visão semanal — últimos 7 dias
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Metric label="Leads recebidos" value={String(week.total)} />
          <Metric label="MQLs" value={String(week.mqls)} />
          <Metric label="Calls marcadas" value={String(week.callsMarcadas)} />
          <Metric label="No shows" value={String(week.noShows)} />
          <Metric label="Calls realizadas" value={String(week.callsFeitas)} />
          <Metric label="Vendas fechadas" value={String(week.vendas)} tone="green" />
          <Metric label="Faturamento" value={brl(week.faturamento)} tone="green" />
          <Metric label="Lead → Call" value={`${week.convLeadCall}%`} />
          <Metric label="Call → Venda" value={`${week.convCallVenda}%`} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Visão mensal — mês atual
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Leads recebidos" value={String(month.total)} />
          <Metric label="MQLs" value={String(month.mqls)} />
          <Metric label="Calls marcadas" value={String(month.callsMarcadas)} />
          <Metric label="No shows" value={String(month.noShows)} />
          <Metric label="Calls realizadas" value={String(month.callsFeitas)} />
          <Metric label="Vendas fechadas" value={String(month.vendas)} tone="green" />
          <Metric label="Faturamento" value={brl(month.faturamento)} tone="green" />
          <Metric label="Lead → Call" value={`${month.convLeadCall}%`} />
          <Metric label="Call → Venda" value={`${month.convCallVenda}%`} />
          <Metric label="CPL médio" value={brl(cpl)} />
          <Metric label="CAC médio" value={brl(cac)} />
          <Metric label="Ticket médio" value={brl(month.ticket)} />
        </div>
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
          <h3 className="text-base font-bold">Leads por dia</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card className="p-5">
        <h3 className="text-base font-bold">Vendas por semana</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendasPorSemana}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip />
              <Bar dataKey="vendas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AppShell>
  );
}
