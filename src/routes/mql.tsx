import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGES, fetchLeads, initials, pct } from "@/lib/crm";

export const Route = createFileRoute("/mql")({
  head: () => ({
    meta: [
      { title: "MQL — Leads Qualificados | CRM Real Assessoria" },
      {
        name: "description",
        content:
          "Lista de leads qualificados da Real Assessoria com BANT completo: orçamento, decisor, dor principal e prazo para começar.",
      },
      { property: "og:title", content: "MQL — Leads Qualificados | CRM Real Assessoria" },
      {
        property: "og:description",
        content: "Todos os leads qualificados com BANT e taxas de conversão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MqlPage,
});

function MqlPage() {
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });

  const monthFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const mqls = leads.filter((l) => l.is_mql);
  const mqlsMes = mqls.filter((l) => new Date(l.mql_at ?? l.created_at) >= monthFrom);
  const leadsMes = leads.filter((l) => new Date(l.created_at) >= monthFrom);
  const vendasMql = mqls.filter((l) => l.stage === "venda").length;

  return (
    <AppShell
      title="MQL — Leads Qualificados"
      subtitle="Classificação, não movimentação: o lead continua na coluna dele no pipeline."
    >
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">MQLs do mês</p>
          <p className="mt-1 text-2xl font-bold">{mqlsMes.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Taxa de MQL sobre leads
          </p>
          <p className="mt-1 text-2xl font-bold">{pct(mqlsMes.length, leadsMes.length)}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Conversão MQL → venda
          </p>
          <p className="mt-1 text-2xl font-bold text-success">{pct(vendasMql, mqls.length)}%</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mqls.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-center gap-3">
              {l.photo_url ? (
                <img src={l.photo_url} alt={l.name} className="size-10 rounded-full object-cover" />
              ) : (
                <span className="grid size-10 place-items-center rounded-full bg-secondary text-xs font-bold">
                  {initials(l.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.phone ?? "sem telefone"} · {l.segment ?? "sem segmento"}
                </p>
              </div>
              <Badge>{STAGES.find((s) => s.id === l.stage)?.label}</Badge>
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              {[
                { t: "Budget", v: l.bant_budget },
                { t: "Authority", v: l.bant_authority },
                { t: "Need", v: l.bant_need },
                { t: "Timeline", v: l.bant_timeline },
              ].map(({ t, v }) => (
                <div key={t} className="rounded-md bg-secondary p-2">
                  <dt className="font-bold">{t}</dt>
                  <dd className="text-muted-foreground">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
        {mqls.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            Nenhum lead qualificado ainda. Use o botão MQL no card do pipeline.
          </Card>
        )}
      </div>
    </AppShell>
  );
}
