# Pedagogical Analytics - Implementation Plan

## Overview

A unique differentiator for iaiaz: analytics that help trainers understand how their students use AI.

---

## 1. Three Tiers of Analytics

### Tier 1: Usage Stats (Included in base plan)

**What trainers see:**
- Active students count
- Total conversations
- Messages per conversation average
- Activity timeline (by day/hour)
- Model usage distribution
- Inactive student alerts

**Value**: Trainers see engagement, can follow up with inactive students.

---

### Tier 2: Learning Insights (+€2/student/month)

**What trainers see:**
- Topics discussed (AI-extracted)
- Usage type classification (research, writing help, explanation, correction)
- Group trends and patterns
- Insights on difficult topics (multiple reformulations)

**Value**: Trainers understand what topics need more attention in class.

---

### Tier 3: Quality & Competency (+€5/student/month)

**What trainers see:**
- Prompt quality scoring (clarity, context, specificity, critical thinking)
- Student distribution by skill level
- Critical thinking indicators
- Individual student profiles with progression
- Pedagogical alerts (copy-paste detection, AI dependency)

**Value**: Trainers can coach students on AI literacy, identify at-risk students.

---

## 2. Privacy Framework

### Student Consent Levels

1. **Nothing** - 100% private conversations
2. **Statistics only** (recommended) - Aggregated data, no content access
3. **Full analysis** - AI summaries visible to trainer (not exact text)

### What Trainers CANNOT See

- Exact conversation content (only AI-generated summaries)
- Personal conversations marked as private
- Usage outside school hours (optional)
- Conversations with other organizations

---

## 3. Technical Implementation

### Data Pipeline

```
Conversation saved
       ↓
  [Async Job Queue]
       ↓
┌─────────────────────────────────────────┐
│ Analysis Worker (runs every hour)       │
├─────────────────────────────────────────┤
│ 1. Extract topics (embeddings + LLM)    │
│ 2. Classify usage type                  │
│ 3. Score prompt quality                 │
│ 4. Detect patterns (copy-paste, etc.)   │
│ 5. Aggregate to org-level stats         │
└─────────────────────────────────────────┘
       ↓
  [Analytics DB]
       ↓
  Trainer Dashboard
```

### Database Schema

```sql
-- Conversation analytics (one row per conversation)
CREATE TABLE conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  org_id UUID REFERENCES organizations(id),

  -- Basic stats
  message_count INT,
  user_message_count INT,
  total_tokens INT,
  duration_seconds INT,

  -- AI-extracted insights
  topics JSONB,              -- ["SWOT", "pricing strategy"]
  usage_type TEXT,           -- research, writing, explanation, correction
  prompt_quality_score FLOAT,
  critical_thinking_score FLOAT,

  -- Flags
  is_copy_paste_detected BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,

  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated org stats (daily rollup)
CREATE TABLE org_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE,

  active_users INT,
  total_conversations INT,
  total_messages INT,

  topics_distribution JSONB,
  usage_types_distribution JSONB,
  avg_prompt_quality FLOAT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, date)
);

-- Indexes
CREATE INDEX idx_conversation_analytics_org ON conversation_analytics(org_id);
CREATE INDEX idx_conversation_analytics_user ON conversation_analytics(user_id);
CREATE INDEX idx_conversation_analytics_created ON conversation_analytics(created_at);
CREATE INDEX idx_org_analytics_daily_org_date ON org_analytics_daily(org_id, date);
```

---

## 4. Pricing Strategy

| Plan | What's Included | Price |
|------|-----------------|-------|
| **Base** | Usage stats, activity timeline, inactive alerts | Included |
| **Insights** | Topic analysis, usage patterns, group trends | +€2/student/month |
| **Premium** | Quality scores, individual profiles, alerts, export | +€5/student/month |

### Example Revenue

School with 200 students:
- Base subscription: 200 × €1 = €200/month
- With Insights: 200 × €3 = €600/month
- With Premium: 200 × €6 = €1,200/month

**6x revenue uplift** from analytics alone.

---

## 5. Competitive Advantage

| Competitor | Analytics? |
|------------|------------|
| ChatGPT Team | ❌ None |
| Claude for Work | ❌ None |
| Perplexity | ❌ None |
| iaiaz | ✅ Full pedagogical suite |

**This is a unique differentiator for education.**

---

## 6. Implementation Roadmap

| Phase | Features | Effort |
|-------|----------|--------|
| **MVP** | Usage stats dashboard (Tier 1) | 2-3 weeks |
| **V1** | Topic extraction, usage classification | 3-4 weeks |
| **V2** | Quality scoring, individual profiles | 4-6 weeks |
| **V3** | Alerts, recommendations, export | 2-3 weeks |

---

## 7. Dashboard Mockups

### Group Overview (Tier 1)

```
┌─────────────────────────────────────────────────────────────┐
│ Vue d'ensemble - Marketing M1 Groupe A                      │
│ Période: 1-15 janvier 2026                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👥 32/35 étudiants actifs     💬 287 conversations         │
│  📊 8.9 messages/conversation  ⏱️ Pic: mardi 14h-16h        │
│                                                             │
│  Modèles utilisés:                                          │
│  ████████████████░░░░ Claude 3.5 Sonnet (68%)              │
│  ████████░░░░░░░░░░░░ GPT-4o (32%)                         │
│                                                             │
│  Activité par jour:                                         │
│  L  ██████                                                  │
│  M  ████████████████  ← Deadline projet?                   │
│  M  ████████                                                │
│  J  ██████████                                              │
│  V  ████                                                    │
│  S  ██                                                      │
│  D  █                                                       │
│                                                             │
│  ⚠️ 3 étudiants inactifs: Martin D., Sophie L., Lucas R.   │
└─────────────────────────────────────────────────────────────┘
```

### Learning Insights (Tier 2)

```
┌─────────────────────────────────────────────────────────────┐
│ Analyse des apprentissages                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📚 THÈMES ABORDÉS                                         │
│  analyse SWOT ████████████████████ 34 conversations        │
│  persona client ██████████████ 24 conversations            │
│  stratégie prix ████████████ 21 conversations              │
│                                                             │
│  🎯 TYPES D'UTILISATION                                    │
│  Recherche/Brainstorming      ████████████████ 45%         │
│  Explication de concepts      ████████████ 30%             │
│  Aide à la rédaction          ██████ 15%                   │
│  Correction/Amélioration      ████ 10%                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Quality Analysis (Tier 3)

```
┌─────────────────────────────────────────────────────────────┐
│ Analyse qualitative                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🧠 QUALITÉ DES PROMPTS (moyenne: 6.2/10)                  │
│  • Clarté de la demande         ████████░░ 7.1             │
│  • Contexte fourni              █████░░░░░ 4.8             │
│  • Spécificité                  ██████░░░░ 5.9             │
│  • Esprit critique              ███████░░░ 6.8             │
│                                                             │
│  Distribution des étudiants:                                │
│  Experts (8+)    ████ 4 étudiants                          │
│  Compétents (6-8) ████████████████ 18 étudiants            │
│  En progression  ████████ 10 étudiants                     │
│  À accompagner   ███ 3 étudiants                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
