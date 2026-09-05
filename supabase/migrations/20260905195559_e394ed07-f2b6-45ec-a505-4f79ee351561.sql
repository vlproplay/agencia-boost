CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  segment text,
  market_time text,
  invests_traffic text,
  revenue text,
  photo_url text,
  stage text NOT NULL DEFAULT 'novo',
  bant text,
  call_at timestamptz,
  sale_value numeric,
  plan text,
  closer text,
  source text DEFAULT 'trafego_pago',
  lost_reason text,
  notes text,
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_public_all" ON public.leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cadence_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  day_offset int NOT NULL,
  action text NOT NULL,
  due_date date NOT NULL,
  done boolean NOT NULL DEFAULT false,
  outcome text,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadence_tasks TO anon, authenticated;
GRANT ALL ON public.cadence_tasks TO service_role;
ALTER TABLE public.cadence_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cadence_public_all" ON public.cadence_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_goal numeric NOT NULL DEFAULT 100000,
  sales_goal int NOT NULL DEFAULT 30,
  mrr_goal numeric NOT NULL DEFAULT 150000,
  ad_spend numeric NOT NULL DEFAULT 20000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO anon, authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_public_all" ON public.goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
INSERT INTO public.goals (revenue_goal, sales_goal, mrr_goal, ad_spend) VALUES (100000, 30, 150000, 20000);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER leads_touch BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.leads (name, phone, segment, market_time, invests_traffic, revenue, stage, bant, call_at, sale_value, plan, closer, source, created_at, stage_changed_at) VALUES
('Marina Costa','(85) 99811-2233','Estética','3 anos','Sim','R$ 50k/mês','venda','Orçamento ok, decisor, dor clara','2026-08-28 15:00-03',3200,'Escala','Rafael','trafego_pago',now() - interval '20 days', now() - interval '18 days'),
('Bruno Almeida','(11) 98822-4411','Odontologia','6 anos','Não','R$ 120k/mês','venda','Decisor único, quer escalar','2026-08-30 10:00-03',5000,'REAL','Camila','trafego_pago',now() - interval '15 days', now() - interval '12 days'),
('Juliana Reis','(21) 99733-8890','Moda','1 ano','Sim','R$ 20k/mês','venda','Budget apertado mas aprovou','2026-09-02 14:00-03',2300,'Negócio','Rafael','organico',now() - interval '8 days', now() - interval '3 days'),
('Carlos Meireles','(85) 99655-1122','Academia','4 anos','Sim','R$ 70k/mês','proposta',null,'2026-09-08 11:00-03',null,null,'Camila','trafego_pago',now() - interval '5 days', now() - interval '1 day'),
('Patrícia Nunes','(31) 99544-7788','Imobiliária','10 anos','Não','R$ 300k/mês','call_realizada','Autoridade confirmada','2026-09-04 16:00-03',null,null,null,'trafego_pago',now() - interval '6 days', now() - interval '2 days'),
('Diego Farias','(85) 99433-6655','Restaurante','2 anos','Sim','R$ 40k/mês','call_marcada','Necessidade validada','2026-09-09 09:30-03',null,null,null,'trafego_pago',now() - interval '2 days', now() - interval '1 day'),
('Aline Souza','(62) 99322-1199','Pet Shop','5 anos','Não','R$ 35k/mês','mql','Budget R$3k/mês, decisora','2026-09-10 17:00-03',null,null,null,'organico',now() - interval '3 days', now() - interval '1 day'),
('Rodrigo Lima','(11) 99211-3344','Advocacia','8 anos','Não','R$ 90k/mês','no_show',null,'2026-09-03 13:00-03',null,null,null,'trafego_pago',now() - interval '7 days', now() - interval '2 days'),
('Fernanda Braga','(85) 99100-5566','Estética','1 ano','Sim','R$ 15k/mês','tentativa',null,null,null,null,null,'trafego_pago',now() - interval '4 days', now() - interval '4 days'),
('Thiago Moura','(48) 99077-2211','E-commerce','3 anos','Sim','R$ 60k/mês','novo',null,null,null,null,null,'trafego_pago',now() - interval '40 minutes', now() - interval '40 minutes'),
('Larissa Pinto','(85) 98866-9900','Clínica','2 anos','Não','R$ 25k/mês','novo',null,null,null,null,null,'organico',now() - interval '3 minutes', now() - interval '3 minutes'),
('Vinícius Rocha','(71) 98755-4433','Construção','12 anos','Sim','R$ 200k/mês','perdido',null,null,null,null,null,'trafego_pago',now() - interval '25 days', now() - interval '10 days');

UPDATE public.leads SET lost_reason = 'preco' WHERE stage = 'perdido';

INSERT INTO public.cadence_tasks (lead_id, day_offset, action, due_date, done)
SELECT l.id, d.day_offset, d.action, (l.stage_changed_at + (d.day_offset - 1) * interval '1 day')::date, false
FROM public.leads l
CROSS JOIN (VALUES
  (1,'Ligação + áudio no WhatsApp'),
  (2,'Mensagem de texto'),
  (5,'Segunda ligação'),
  (7,'Mensagem de reengajamento'),
  (10,'Última tentativa de ligação'),
  (14,'Mensagem final e arquiva')
) AS d(day_offset, action)
WHERE l.stage IN ('tentativa','no_show');