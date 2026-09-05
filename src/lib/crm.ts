import { supabase } from "@/integrations/supabase/client";

export type Stage =
  | "novo"
  | "tentativa"
  | "mql"
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
  { id: "novo", label: "Novo Lead", hint: "Entrada automática do formulário" },
  { id: "tentativa", label: "Tentativa de Contato", hint: "Inicia cadência de 14 dias" },
  { id: "mql", label: "MQL — Lead Qualificado", hint: "Exige resultado do BANT" },
  { id: "call_marcada", label: "Call Marcada", hint: "Data e hora da reunião" },
  { id: "no_show", label: "No Show", hint: "Volta para cadência" },
  { id: "call_realizada", label: "Call Realizada", hint: "Closer assume" },
  { id: "proposta", label: "Proposta Enviada", hint: "PDF apresentado" },
  { id: "venda", label: "Venda Fechada", hint: "Exige valor e plano" },
  { id: "perdido", label: "Perdido", hint: "Exige motivo" },
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
];

export const CADENCE_STEPS = [
  { day: 1, action: "Ligação + áudio no WhatsApp" },
  { day: 2, action: "Mensagem de texto" },
  { day: 5, action: "Segunda ligação" },
  { day: 7, action: "Mensagem de reengajamento" },
  { day: 10, action: "Última tentativa de ligação" },
  { day: 14, action: "Mensagem final e arquiva" },
];

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

export async function startCadence(leadId: string) {
  await supabase.from("cadence_tasks").delete().eq("lead_id", leadId).eq("done", false);
  const base = new Date();
  const rows = CADENCE_STEPS.map((s) => {
    const d = new Date(base);
    d.setDate(d.getDate() + (s.day - 1));
    return {
      lead_id: leadId,
      day_offset: s.day,
      action: s.action,
      due_date: d.toISOString().slice(0, 10),
    };
  });
  const { error } = await supabase.from("cadence_tasks").insert(rows);
  if (error) throw error;
}

export async function updateLead(id: string, patch: Partial<Lead>) {
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) throw error;
}

export async function moveLead(id: string, stage: Stage, patch: Partial<Lead> = {}) {
  await updateLead(id, { stage, stage_changed_at: new Date().toISOString(), ...patch });
  if (stage === "tentativa" || stage === "no_show") await startCadence(id);
}
