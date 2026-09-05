import { supabase } from "@/integrations/supabase/client";

export type Stage =
  | "novo"
  | "tentativa"
  | "call_marcada"
  | "no_show"
  | "call_realizada"
  | "proposta"
  | "venda"
  | "perdido";

export type Lead = {
  id: string;
  name: string;
  phone: string | null;
  segment: string | null;
  market_time: string | null;
  invests_traffic: string | null;
  revenue: string | null;
  photo_url: string | null;
  stage: Stage;
  bant: string | null;
  is_mql: boolean;
  mql_at: string | null;
  bant_budget: string | null;
  bant_authority: string | null;
  bant_need: string | null;
  bant_timeline: string | null;
  first_contact_at: string | null;
  cadence_day: number | null;
  cadence_status: string | null;
  call_notes: string | null;
  proposal_plan: string | null;
  proposal_value: number | null;
  contract_start: string | null;
  contract_end: string | null;
  call_at: string | null;
  sale_value: number | null;
  plan: string | null;
  closer: string | null;
  source: string | null;
  lost_reason: string | null;
  notes: string | null;
  stage_changed_at: string;
  created_at: string;
  updated_at: string;
};

export type CadenceTask = {
  id: string;
  lead_id: string;
  day_offset: number;
  action: string;
  due_date: string;
  done: boolean;
  outcome: string | null;
  done_at: string | null;
};

export type Goals = {
  id: string;
  revenue_goal: number;
  sales_goal: number;
  mrr_goal: number;
  ad_spend: number;
};

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "novo", label: "Novo Lead", hint: "Entrada automática do formulário Meta" },
  { id: "tentativa", label: "Tentativa de Contato", hint: "Entra na cadência no Dia 1" },
  { id: "call_marcada", label: "Call Marcada", hint: "Exige data e hora — sai da cadência" },
  { id: "no_show", label: "No Show", hint: "Volta para a cadência" },
  { id: "call_realizada", label: "Call Realizada", hint: "Closer assume e registra observações" },
  { id: "proposta", label: "Proposta Enviada", hint: "Plano e valor apresentados" },
  { id: "venda", label: "Venda Fechada", hint: "Valor, plano e início do contrato" },
  { id: "perdido", label: "Perdido", hint: "Motivo obrigatório" },
];

export const PLANS = [
  { id: "Negócio", value: 2300 },
  { id: "Escala", value: 3200 },
  { id: "REAL", value: 5000 },
];

export const LOST_REASONS = [
  { id: "preco", label: "Preço" },
  { id: "timing", label: "Timing" },
  { id: "concorrente", label: "Concorrente" },
  { id: "nao_qualificado", label: "Não qualificado" },
  { id: "outro", label: "Outro" },
];

export const CONTACT_CHANNELS = ["Ligação", "WhatsApp", "Áudio"];

export const OUTCOMES = ["atendeu", "nao_atendeu", "caixa_postal", "bloqueou"] as const;

export const OUTCOME_LABEL: Record<string, string> = {
  atendeu: "Atendeu",
  nao_atendeu: "Não atendeu",
  caixa_postal: "Caixa postal",
  bloqueou: "Bloqueou",
};

export const CADENCE_DAYS = 14;

export const CADENCE_ACTIONS: Record<number, string> = {
  1: "Ligação + áudio WhatsApp 20s",
  2: "Mensagem de texto",
  3: "Segunda ligação",
  5: "Mensagem de reengajamento",
  7: "Terceira ligação",
  10: "Última tentativa de ligação",
  14: "Mensagem final — arquiva",
};

export const cadenceAction = (day: number) => CADENCE_ACTIONS[day] ?? "Aguardando resposta";

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function minutesSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export function elapsedLabel(iso: string) {
  const m = minutesSince(iso);
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function fetchTasks(): Promise<CadenceTask[]> {
  const { data, error } = await supabase
    .from("cadence_tasks")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CadenceTask[];
}

export async function fetchGoals(): Promise<Goals> {
  const { data, error } = await supabase.from("goals").select("*").limit(1).single();
  if (error) throw error;
  return data as Goals;
}

export async function updateLead(id: string, patch: Partial<Lead>) {
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) throw error;
}

/** Registra a execução de um dia da cadência. */
export async function logAttempt(leadId: string, day: number, outcome: string) {
  const { error } = await supabase.from("cadence_tasks").insert({
    lead_id: leadId,
    day_offset: day,
    action: cadenceAction(day),
    due_date: new Date().toISOString().slice(0, 10),
    done: true,
    done_at: new Date().toISOString(),
    outcome,
  });
  if (error) throw error;
}

export async function moveLead(lead: Lead, stage: Stage, patch: Partial<Lead> = {}) {
  const next: Partial<Lead> = { stage, stage_changed_at: new Date().toISOString(), ...patch };

  if (lead.stage === "novo" && stage !== "novo" && !lead.first_contact_at) {
    next.first_contact_at = new Date().toISOString();
  }
  if (stage === "tentativa") {
    next.cadence_day = lead.cadence_day ?? 1;
    next.cadence_status = "ativa";
  }
  if (stage === "no_show") {
    next.cadence_day = lead.cadence_day ?? 1;
    next.cadence_status = "ativa";
  }
  if (stage === "call_marcada" || stage === "venda" || stage === "perdido") {
    next.cadence_status = null;
    next.cadence_day = null;
  }
  await updateLead(lead.id, next);
}
