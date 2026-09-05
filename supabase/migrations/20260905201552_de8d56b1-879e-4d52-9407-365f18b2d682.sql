ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_mql boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mql_at timestamptz,
  ADD COLUMN IF NOT EXISTS bant_budget text,
  ADD COLUMN IF NOT EXISTS bant_authority text,
  ADD COLUMN IF NOT EXISTS bant_need text,
  ADD COLUMN IF NOT EXISTS bant_timeline text,
  ADD COLUMN IF NOT EXISTS first_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS cadence_day integer,
  ADD COLUMN IF NOT EXISTS cadence_status text,
  ADD COLUMN IF NOT EXISTS call_notes text,
  ADD COLUMN IF NOT EXISTS proposal_plan text,
  ADD COLUMN IF NOT EXISTS proposal_value numeric,
  ADD COLUMN IF NOT EXISTS contract_start date,
  ADD COLUMN IF NOT EXISTS contract_end date;

UPDATE public.leads
SET is_mql = true,
    mql_at = COALESCE(mql_at, stage_changed_at),
    bant_need = COALESCE(bant_need, bant),
    stage = 'tentativa',
    cadence_day = COALESCE(cadence_day, 1),
    cadence_status = COALESCE(cadence_status, 'ativa')
WHERE stage = 'mql';

UPDATE public.leads
SET cadence_day = COALESCE(cadence_day, 1),
    cadence_status = COALESCE(cadence_status, 'ativa')
WHERE stage IN ('tentativa', 'no_show');

UPDATE public.leads
SET first_contact_at = COALESCE(first_contact_at, stage_changed_at)
WHERE stage <> 'novo';

UPDATE public.leads
SET contract_start = COALESCE(contract_start, stage_changed_at::date),
    contract_end = COALESCE(contract_end, (stage_changed_at::date + INTERVAL '3 months')::date)
WHERE stage = 'venda';