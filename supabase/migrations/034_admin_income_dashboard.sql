-- Admin Income Dashboard & AI Provider Management
-- Tables and functions for tracking revenue, costs, and provider budgets

-- ============================================================================
-- PROVIDER BUDGETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE, -- 'Anthropic', 'OpenAI', 'Google', 'Mistral'

  -- Monthly budget
  monthly_budget_eur NUMERIC(12,2),

  -- Alert thresholds (percentage of budget)
  alert_threshold_50 BOOLEAN DEFAULT true,
  alert_threshold_75 BOOLEAN DEFAULT true,
  alert_threshold_90 BOOLEAN DEFAULT true,
  alert_threshold_100 BOOLEAN DEFAULT true,

  -- Manual balance tracking (for providers without API)
  manual_balance_eur NUMERIC(12,2),
  manual_balance_updated_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default providers
INSERT INTO provider_budgets (provider) VALUES
  ('Anthropic'),
  ('OpenAI'),
  ('Google'),
  ('Mistral')
ON CONFLICT (provider) DO NOTHING;

-- ============================================================================
-- PROVIDER BUDGET ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_50', 'threshold_75', 'threshold_90', 'threshold_100', 'budget_exceeded')),
  month_year TEXT NOT NULL, -- '2025-01' format

  -- Amounts at time of alert
  spend_eur NUMERIC(12,2) NOT NULL,
  budget_eur NUMERIC(12,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,

  -- Status
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate alerts for same provider/type/month
  UNIQUE(provider, alert_type, month_year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_alerts_provider ON provider_budget_alerts(provider);
CREATE INDEX IF NOT EXISTS idx_provider_alerts_month ON provider_budget_alerts(month_year);
CREATE INDEX IF NOT EXISTS idx_provider_alerts_unacknowledged ON provider_budget_alerts(acknowledged) WHERE acknowledged = false;

-- ============================================================================
-- FUNCTION: Get Admin Income Stats
-- ============================================================================

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
  cost_anthropic NUMERIC,
  cost_openai NUMERIC,
  cost_google NUMERIC,
  cost_mistral NUMERIC,
  total_cost NUMERIC,
  net_margin NUMERIC,
  margin_percent NUMERIC
) AS $$
BEGIN
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
  )
  SELECT
    ds.p_start as period_start,
    ds.p_end as period_end,
    COALESCE(pr.total, 0)::NUMERIC as personal_purchases,
    COALESCE(orr.total, 0)::NUMERIC as org_purchases,
    COALESCE(sr.total, 0)::NUMERIC as subscription_revenue,
    (COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0))::NUMERIC as total_revenue,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Anthropic'), 0)::NUMERIC as cost_anthropic,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'OpenAI'), 0)::NUMERIC as cost_openai,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Google'), 0)::NUMERIC as cost_google,
    COALESCE((SELECT total FROM costs_by_provider c WHERE c.period = ds.p_start AND c.provider = 'Mistral'), 0)::NUMERIC as cost_mistral,
    COALESCE((SELECT SUM(total) FROM costs_by_provider c WHERE c.period = ds.p_start), 0)::NUMERIC as total_cost,
    (COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0) - COALESCE((SELECT SUM(total) FROM costs_by_provider c WHERE c.period = ds.p_start), 0))::NUMERIC as net_margin,
    CASE
      WHEN COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0) > 0
      THEN (((COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0) - COALESCE((SELECT SUM(total) FROM costs_by_provider c WHERE c.period = ds.p_start), 0))
            / (COALESCE(pr.total, 0) + COALESCE(orr.total, 0) + COALESCE(sr.total, 0))) * 100)::NUMERIC
      ELSE 0::NUMERIC
    END as margin_percent
  FROM date_series ds
  LEFT JOIN personal_rev pr ON pr.period = ds.p_start
  LEFT JOIN org_rev orr ON orr.period = ds.p_start
  LEFT JOIN sub_rev sr ON sr.period = ds.p_start
  ORDER BY ds.p_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get Provider Monthly Spend
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_monthly_spend(
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  p_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT
)
RETURNS TABLE (
  provider TEXT,
  spend_eur NUMERIC,
  message_count BIGINT,
  tokens_input BIGINT,
  tokens_output BIGINT,
  budget_eur NUMERIC,
  budget_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH provider_spend AS (
    SELECT
      au.provider as prov,
      COALESCE(SUM(au.cost_eur), 0) as spend,
      COUNT(*) as msg_count,
      COALESCE(SUM(au.tokens_input), 0) as tok_in,
      COALESCE(SUM(au.tokens_output), 0) as tok_out
    FROM api_usage au
    WHERE EXTRACT(YEAR FROM au.created_at) = p_year
      AND EXTRACT(MONTH FROM au.created_at) = p_month
    GROUP BY au.provider
  )
  SELECT
    pb.provider,
    COALESCE(ps.spend, 0)::NUMERIC as spend_eur,
    COALESCE(ps.msg_count, 0)::BIGINT as message_count,
    COALESCE(ps.tok_in, 0)::BIGINT as tokens_input,
    COALESCE(ps.tok_out, 0)::BIGINT as tokens_output,
    pb.monthly_budget_eur as budget_eur,
    CASE
      WHEN pb.monthly_budget_eur > 0
      THEN ((COALESCE(ps.spend, 0) / pb.monthly_budget_eur) * 100)::NUMERIC
      ELSE 0::NUMERIC
    END as budget_percent
  FROM provider_budgets pb
  LEFT JOIN provider_spend ps ON ps.prov = pb.provider
  ORDER BY COALESCE(ps.spend, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get Provider Spend History (last N months)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_spend_history(
  p_months INT DEFAULT 12
)
RETURNS TABLE (
  month_year TEXT,
  provider TEXT,
  spend_eur NUMERIC,
  message_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT
      to_char(date_trunc('month', CURRENT_DATE - (n || ' months')::interval), 'YYYY-MM') as my,
      date_trunc('month', CURRENT_DATE - (n || ' months')::interval) as month_start
    FROM generate_series(0, p_months - 1) n
  )
  SELECT
    m.my as month_year,
    pb.provider,
    COALESCE(SUM(au.cost_eur), 0)::NUMERIC as spend_eur,
    COUNT(au.id)::BIGINT as message_count
  FROM months m
  CROSS JOIN provider_budgets pb
  LEFT JOIN api_usage au ON au.provider = pb.provider
    AND date_trunc('month', au.created_at) = m.month_start
  GROUP BY m.my, pb.provider, m.month_start
  ORDER BY m.month_start DESC, pb.provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Check and Create Budget Alerts
-- ============================================================================

CREATE OR REPLACE FUNCTION check_provider_budget_alerts()
RETURNS TABLE (
  new_alert_id UUID,
  provider TEXT,
  alert_type TEXT,
  spend_eur NUMERIC,
  budget_eur NUMERIC,
  percentage NUMERIC
) AS $$
DECLARE
  v_month_year TEXT;
  v_provider_row RECORD;
  v_spend NUMERIC;
  v_percentage NUMERIC;
  v_alert_type TEXT;
  v_new_id UUID;
BEGIN
  v_month_year := to_char(CURRENT_DATE, 'YYYY-MM');

  FOR v_provider_row IN SELECT * FROM provider_budgets WHERE monthly_budget_eur > 0 LOOP
    -- Get current month spend
    SELECT COALESCE(SUM(cost_eur), 0) INTO v_spend
    FROM api_usage
    WHERE provider = v_provider_row.provider
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE);

    v_percentage := (v_spend / v_provider_row.monthly_budget_eur) * 100;

    -- Check thresholds from highest to lowest
    IF v_percentage >= 100 AND v_provider_row.alert_threshold_100 THEN
      v_alert_type := 'threshold_100';
    ELSIF v_percentage >= 90 AND v_provider_row.alert_threshold_90 THEN
      v_alert_type := 'threshold_90';
    ELSIF v_percentage >= 75 AND v_provider_row.alert_threshold_75 THEN
      v_alert_type := 'threshold_75';
    ELSIF v_percentage >= 50 AND v_provider_row.alert_threshold_50 THEN
      v_alert_type := 'threshold_50';
    ELSE
      CONTINUE;
    END IF;

    -- Try to insert alert (will fail if already exists due to unique constraint)
    BEGIN
      INSERT INTO provider_budget_alerts (
        provider, alert_type, month_year, spend_eur, budget_eur, percentage
      ) VALUES (
        v_provider_row.provider, v_alert_type, v_month_year, v_spend, v_provider_row.monthly_budget_eur, v_percentage
      )
      RETURNING id INTO v_new_id;

      -- Return the new alert
      RETURN QUERY SELECT v_new_id, v_provider_row.provider, v_alert_type, v_spend, v_provider_row.monthly_budget_eur, v_percentage;
    EXCEPTION WHEN unique_violation THEN
      -- Alert already exists for this threshold/month, skip
      NULL;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Update provider_budgets.updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_provider_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_provider_budgets_updated_at ON provider_budgets;
CREATE TRIGGER trigger_update_provider_budgets_updated_at
  BEFORE UPDATE ON provider_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_budgets_updated_at();

-- ============================================================================
-- RLS POLICIES (admin only)
-- ============================================================================

ALTER TABLE provider_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_budget_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify provider budgets
CREATE POLICY "Admins can manage provider budgets"
  ON provider_budgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Only admins can view/modify alerts
CREATE POLICY "Admins can manage provider alerts"
  ON provider_budget_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
