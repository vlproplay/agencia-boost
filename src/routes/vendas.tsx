import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { brl, fetchGoals, fetchLeads, pct } from "@/lib/crm";

export const Route = createFileRoute("/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas e MRR — CRM Real Agência" },
      {
        name: "description",
        content:
          "Histórico completo de vendas fechadas, planos contratados, closers, origem e painel de MRR da carteira da Real Agência.",
      },
      { property: "og:title", content: "Vendas e MRR — CRM Real Agência" },
      {
        property: "og:description",
        content: "Histórico de vendas, planos contratados e evolução do MRR da carteira.",
      },
    ],
  }),
  component: VendasPage,
});

function VendasPage() {
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });

  const vendas = leads
    .filter((l) => l.stage === "venda")
    .sort(
      (a, b) => new Date(b.stage_changed_at).getTime() - new Date(a.stage_changed_at).getTime(),
    );

  const mrr = vendas.reduce((s, l) => s + (l.sale_value ?? 0), 0);
  const mrrGoal = goals?.mrr_goal ?? 1;
  const progresso = Math.min(100, pct(mrr, mrrGoal));

  return (
    <AppShell title="Vendas" subtitle="Histórico de fechamentos e saúde da carteira">
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-base font-bold">MRR da carteira</h3>
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">MRR atual</p>
              <p className="text-3xl font-bold tabular-nums text-success">{brl(mrr)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Meta de MRR</p>
              <p className="text-3xl font-bold tabular-nums">{brl(mrrGoal)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Projeção do trimestre
              </p>
              <p className="text-3xl font-bold tabular-nums">{brl(mrr * 3)}</p>
            </div>
          </div>
          <Progress value={progresso} className="mt-5 h-4 bg-secondary" />
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            {progresso}% da meta de MRR
          </p>
        </Card>
        <Card className="p-5">
          <h3 className="text-base font-bold">Resumo</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total de vendas</dt>
              <dd className="font-bold tabular-nums">{vendas.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ticket médio</dt>
              <dd className="font-bold tabular-nums">
                {brl(vendas.length ? mrr / vendas.length : 0)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Via tráfego pago</dt>
              <dd className="font-bold tabular-nums">
                {vendas.filter((v) => v.source === "trafego_pago").length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Via orgânico</dt>
              <dd className="font-bold tabular-nums">
                {vendas.filter((v) => v.source === "organico").length}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Segmento</th>
              <th className="px-4 py-3 font-semibold">Plano</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Fechamento</th>
              <th className="px-4 py-3 font-semibold">Closer</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
              <th className="px-4 py-3 font-semibold">MRR</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold">{v.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.segment ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{v.plan ?? "—"}</Badge>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums">{brl(v.sale_value ?? 0)}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {new Date(v.stage_changed_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">{v.closer ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {v.source === "organico" ? "Orgânico" : "Tráfego pago"}
                </td>
                <td className="px-4 py-3 tabular-nums text-success">{brl(v.sale_value ?? 0)}</td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhuma venda registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
