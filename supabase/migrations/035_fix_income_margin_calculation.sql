-- Fix margin calculation to account for markup
-- Margin = Usage Revenue (what users paid) - AI Costs (what we pay providers)

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
  total_revenue NUMERIC,
  usage_revenue NUMERIC,        -- NEW: what users paid for usage (with markup)
  cost_anthropic NUMERIC,
  cost_openai NUMERIC,
  cost_google NUMERIC,
  cost_mistral NUMERIC,
  total_cost NUMERIC,
  net_margin NUMERIC,           -- FIXED: usage_revenue - total_cost
  margin_percent NUMERIC        -- FIXED: based on usage revenue
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
    (COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0))::NUMERIC as total_revenue,
    -- Usage revenue = AI cost * (1 + markup/100)
    (COALESCE(tc.total_cost, 0) * (1 + v_markup / 100))::NUMERIC as usage_revenue,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Anthropic'), 0)::NUMERIC as cost_anthropic,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'OpenAI'), 0)::NUMERIC as cost_openai,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Google'), 0)::NUMERIC as cost_google,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Mistral'), 0)::NUMERIC as cost_mistral,
    COALESCE(tc.total_cost, 0)::NUMERIC as total_cost,
    -- Net margin = usage revenue - AI costs = (cost * (1 + markup/100)) - cost = cost * markup/100
    (COALESCE(tc.total_cost, 0) * v_markup / 100)::NUMERIC as net_margin,
    -- Margin percent = margin / usage_revenue * 100
    CASE
      WHEN COALESCE(tc.total_cost, 0) > 0
      THEN ((v_markup / 100) / (1 + v_markup / 100) * 100)::NUMERIC
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
