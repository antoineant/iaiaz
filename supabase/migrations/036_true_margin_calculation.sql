-- Add true margin calculation (actual cash in - actual AI costs)
-- This accounts for free credits properly

DROP FUNCTION IF EXISTS get_admin_income_stats(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION get_admin_income_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_group_by TEXT DEFAULT 'day' -- 'day', 'week', 'month', 'year'
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  personal_purchases NUMERIC,
  org_purchases NUMERIC,
  subscription_revenue NUMERIC,
  total_revenue NUMERIC,           -- Cash in (actual money received)
  usage_revenue NUMERIC,           -- Value of credits consumed (with markup)
  cost_anthropic NUMERIC,
  cost_openai NUMERIC,
  cost_google NUMERIC,
  cost_mistral NUMERIC,
  total_cost NUMERIC,              -- AI costs (what we pay providers)
  theoretical_margin NUMERIC,      -- usage_revenue - total_cost (if all usage was paid)
  true_margin NUMERIC,             -- total_revenue - total_cost (actual profit/loss)
  credits_outstanding NUMERIC,     -- total_revenue - usage_revenue (prepaid not yet used)
  margin_percent NUMERIC           -- true_margin / total_revenue * 100
) AS $$
DECLARE
  v_markup NUMERIC;
BEGIN
  -- Get markup from app_settings (default 50 if not set)
  SELECT COALESCE((value->>'percentage')::NUMERIC, 50)
  INTO v_markup
  FROM app_settings
  WHERE key = 'markup';

  IF v_markup IS NULL THEN
    v_markup := 50;
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT
      date_trunc(p_group_by, dd)::date as p_start,
      (date_trunc(p_group_by, dd) + ('1 ' || p_group_by)::interval - interval '1 day')::date as p_end
    FROM generate_series(p_start_date::date, p_end_date::date, ('1 ' || p_group_by)::interval) dd
  ),
  personal_rev AS (
    SELECT
      date_trunc(p_group_by, created_at)::date as period,
      COALESCE(SUM(amount), 0) as total
    FROM credit_transactions
    WHERE type = 'purchase'
      AND created_at >= p_start_date
      AND created_at < p_end_date + interval '1 day'
    GROUP BY 1
  ),
  org_rev AS (
    SELECT
      date_trunc(p_group_by, created_at)::date as period,
      COALESCE(SUM(amount), 0) as total
    FROM organization_transactions
    WHERE type = 'purchase'
      AND created_at >= p_start_date
      AND created_at < p_end_date + interval '1 day'
    GROUP BY 1
  ),
  sub_rev AS (
    SELECT
      date_trunc(p_group_by, created_at)::date as period,
      COALESCE(SUM(amount), 0) as total
    FROM organization_subscription_events
    WHERE event_type = 'payment_succeeded'
      AND created_at >= p_start_date
      AND created_at < p_end_date + interval '1 day'
    GROUP BY 1
  ),
  costs_by_provider AS (
    SELECT
      date_trunc(p_group_by, created_at)::date as period,
      provider,
      COALESCE(SUM(cost_eur), 0) as total
    FROM api_usage
    WHERE created_at >= p_start_date
      AND created_at < p_end_date + interval '1 day'
    GROUP BY 1, 2
  ),
  total_costs AS (
    SELECT
      period,
      SUM(total) as total_cost
    FROM costs_by_provider
    GROUP BY period
  )
  SELECT
    ds.p_start as period_start,
    ds.p_end as period_end,
    COALESCE(pr.total, 0)::NUMERIC as personal_purchases,
    COALESCE(orr.total, 0)::NUMERIC as org_purchases,
    COALESCE(sr.total, 0)::NUMERIC as subscription_revenue,
    -- Cash in = actual money received
    (COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0))::NUMERIC as total_revenue,
    -- Usage revenue = AI cost * (1 + markup/100) = value of credits consumed
    (COALESCE(tc.total_cost, 0) * (1 + v_markup / 100))::NUMERIC as usage_revenue,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Anthropic'), 0)::NUMERIC as cost_anthropic,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'OpenAI'), 0)::NUMERIC as cost_openai,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Google'), 0)::NUMERIC as cost_google,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Mistral'), 0)::NUMERIC as cost_mistral,
    -- AI costs
    COALESCE(tc.total_cost, 0)::NUMERIC as total_cost,
    -- Theoretical margin = what we'd earn if all usage was paid (usage_revenue - AI costs)
    (COALESCE(tc.total_cost, 0) * v_markup / 100)::NUMERIC as theoretical_margin,
    -- True margin = actual cash in - actual AI costs
    (COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0) - COALESCE(tc.total_cost, 0))::NUMERIC as true_margin,
    -- Credits outstanding = cash received but not yet spent on AI
    (COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0) - COALESCE(tc.total_cost, 0) * (1 + v_markup / 100))::NUMERIC as credits_outstanding,
    -- Margin percent = true margin / cash in * 100
    CASE
      WHEN COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0) > 0
      THEN (((COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0) - COALESCE(tc.total_cost, 0))
            / (COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0))) * 100)::NUMERIC
      ELSE 0::NUMERIC
    END as margin_percent
  FROM date_series ds
  LEFT JOIN personal_rev pr ON pr.period = ds.p_start
  LEFT JOIN org_rev orr ON orr.period = ds.p_start
  LEFT JOIN sub_rev sr ON sr.period = ds.p_start
  LEFT JOIN total_costs tc ON tc.period = ds.p_start
  ORDER BY ds.p_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
