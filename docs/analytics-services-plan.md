# Analytics Services Plan

## Pedagogical Framework

### Two Dimensions of Assessment

```
                    AI LITERACY (horizontal)
                    ────────────────────────►

    │   Knows subject     │   Knows subject
    │   Poor AI use       │   Good AI use
    │   → Needs AI        │   → IDEAL
D   │     training        │     STUDENT
O   │                     │
M   ├─────────────────────┼─────────────────────
A   │                     │
I   │   Doesn't know      │   Doesn't know
N   │   Poor AI use       │   Good AI use
    │   → AT RISK         │   → Superficial
K   │                     │     learning
N   │                     │
O   │                     │
W   ▼                     │
```

**Goal:** Move all students to top-right quadrant.

---

## Dimension 1: AI Literacy Metrics

### 1.1 Prompt Quality Score (0-100)

| Signal | Weight | What it measures |
|--------|--------|------------------|
| Specificity | 25% | Vague "explain X" vs precise "compare X and Y in context Z" |
| Context provided | 20% | Does student give background, constraints? |
| Iteration rate | 20% | Refines prompts based on responses? |
| Follow-up depth | 15% | Surface questions vs probing deeper |
| Format requests | 10% | Asks for structure (lists, tables, steps)? |
| Critical challenges | 10% | Questions AI's answers, asks for sources? |

**Computation:** NLP analysis on user messages in conversations.

### 1.2 AI Dependency Index

| Behavior | Score impact |
|----------|--------------|
| Very short prompts, long AI responses | High dependency (bad) |
| Balanced exchange, editing AI output | Healthy use (good) |
| Never returns to refine | Over-trust (bad) |
| Multiple models for same question | Critical thinking (good) |

### 1.3 Usage Patterns

- **Session duration** - Too short (copy-paste) vs engaged
- **Questions per session** - Single-shot vs dialogue
- **Time between messages** - Reading/thinking vs rapid-fire
- **Edit rate** - Do they modify AI suggestions?

---

## Dimension 2: Domain Knowledge Metrics

### 2.1 Topic Extraction & Mapping

From each conversation, extract:
- Main subject/topic (via NLP/AI classification)
- Sub-topics covered
- Complexity level (introductory → advanced)
- Alignment with class learning objectives (if defined)

### 2.2 Understanding Indicators

| Signal | What it reveals |
|--------|-----------------|
| Question sophistication | Surface ("what is X?") vs deep ("why does X cause Y in context Z?") |
| Misconception patterns | Wrong assumptions in prompts reveal gaps |
| Vocabulary usage | Using domain-specific terms correctly? |
| Connection-making | Linking concepts across topics |

### 2.3 Progress Tracking

- Topics covered over time
- Complexity progression (are questions getting deeper?)
- Recurring confusion areas
- Breadth vs depth of exploration

---

## Trainer Analytics Dashboard

### Priority: Actionable insights for teaching

#### View 1: Class Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLASSE: Marketing Digital L3          28 étudiants actifs  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CETTE SEMAINE                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Sessions │  │ Questions│  │ Crédits  │  │ Qualité  │    │
│  │   142    │  │   487    │  │  12.40€  │  │  68/100  │    │
│  │  +23%    │  │  +15%    │  │  -5%     │  │  +4pts   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                             │
│  ALERTES                                                    │
│  ⚠️ 3 étudiants inactifs depuis 7 jours                    │
│  ⚠️ 5 étudiants avec dépendance IA élevée                  │
│  ✓ Qualité des prompts en progression                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### View 2: Student Grid (Quick Scan)

```
┌─────────────────────────────────────────────────────────────┐
│  Trier par: [Activité ▼]  Filtrer: [Tous ▼]                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NOM           ACTIVITÉ   QUALITÉ IA   SUJETS      ALERTE  │
│  ─────────────────────────────────────────────────────────  │
│  Martin L.     ████████   ██████░░     SEO, Ads     -      │
│  Dupont S.     ████░░░░   ████████     Analytics    -      │
│  Petit J.      ██░░░░░░   ██░░░░░░     -           ⚠️      │
│  ...                                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### View 3: Individual Student Deep Dive

- Conversation history (titles, not content - privacy)
- Topic cloud of subjects explored
- AI literacy score evolution (graph)
- Prompt quality examples (anonymized for feedback)
- Recommendations for trainer intervention

#### View 4: Topic Analysis

```
┌─────────────────────────────────────────────────────────────┐
│  SUJETS LES PLUS EXPLORÉS (cette semaine)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SEO technique         ████████████████  34 sessions    │
│  2. Google Analytics      ████████████      28 sessions    │
│  3. Stratégie contenu     ████████          19 sessions    │
│  4. Publicité Meta        ██████            14 sessions    │
│                                                             │
│  SUJETS PROBLÉMATIQUES (questions répétées, confusion)     │
│  ⚠️ Attribution marketing - 12 étudiants bloqués           │
│  ⚠️ UTM parameters - questions basiques récurrentes        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Value for trainers:** "I see 12 students struggling with attribution - I'll cover it in next class"

---

## School Analytics Dashboard

### Priority: Institutional oversight, ROI, compliance

#### View 1: Institution Overview

```
┌─────────────────────────────────────────────────────────────┐
│  ÉTABLISSEMENT: École de Commerce XYZ                       │
│  Ce semestre: 1,240 étudiants | 45 formateurs | 89 classes │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  UTILISATION                 BUDGET                         │
│  ┌────────────────────┐     ┌────────────────────┐         │
│  │ Étudiants actifs   │     │ Consommé           │         │
│  │ 892 (72%)          │     │ 1,847€ / 3,000€    │         │
│  │ Cible: 80%         │     │ ████████████░░░░   │         │
│  └────────────────────┘     └────────────────────┘         │
│                                                             │
│  QUALITÉ APPRENTISSAGE                                      │
│  Score IA literacy moyen: 64/100 (+8 vs sept.)             │
│  Progression domain knowledge: +12%                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### View 2: Department/Program Comparison

```
┌─────────────────────────────────────────────────────────────┐
│  COMPARAISON PAR PROGRAMME                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PROGRAMME        USAGE    QUALITÉ   COÛT/ÉTUD   TREND     │
│  ───────────────────────────────────────────────────────    │
│  Marketing L3     89%      68/100    2.40€       ↑         │
│  Finance M1       67%      71/100    1.80€       →         │
│  RH M2            45%      52/100    3.10€       ↓         │
│  Data Science L3  94%      82/100    4.20€       ↑         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Value for schools:** "RH M2 has low adoption and high cost per student - investigate"

#### View 3: Trainer Leaderboard (Optional/Sensitive)

- Classes with highest AI literacy improvement
- Most engaged trainers
- Best practices identification
- NOT for punishment - for sharing success

#### View 4: Compliance & Reporting

- Export PDF/CSV reports for administration
- Semester-over-semester comparisons
- ROI calculation: cost vs learning outcomes
- Usage audit trails

#### View 5: Trend Analysis

- AI literacy progression across cohorts
- Topic coverage alignment with curriculum
- Seasonal patterns (exams, projects)
- Predictive: at-risk students early warning

---

## Feature Comparison: Trainer vs School

| Feature | Trainer | School |
|---------|:-------:|:------:|
| Class overview | ✓ | ✓ (all classes) |
| Individual student view | ✓ | ✓ (aggregated) |
| Topic analysis | ✓ | ✓ |
| AI literacy scores | ✓ | ✓ |
| Cross-class comparison | - | ✓ |
| Department/program view | - | ✓ |
| Trainer performance | - | ✓ |
| Export reports | Basic | Advanced |
| Budget tracking | Own classes | Institution-wide |
| Trend analysis | Limited | Full |
| API access | - | ✓ |

---

## Data Model Requirements

### New Tables

```sql
-- Per-conversation analytics (computed async)
CREATE TABLE conversation_analytics (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),

  -- AI Literacy metrics
  prompt_quality_score numeric(5,2),
  specificity_score numeric(5,2),
  iteration_count integer,
  critical_challenges integer,
  dependency_index numeric(5,2),

  -- Domain metrics
  topics jsonb,  -- [{topic: "SEO", confidence: 0.9}, ...]
  complexity_level text,  -- 'intro', 'intermediate', 'advanced'
  misconceptions jsonb,

  -- Usage metrics
  session_duration_seconds integer,
  message_count integer,
  avg_response_time_seconds numeric(8,2),

  computed_at timestamptz DEFAULT now()
);

-- Aggregated daily metrics per student
CREATE TABLE student_daily_metrics (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  class_id uuid REFERENCES classes(id),
  date date,

  sessions_count integer,
  total_messages integer,
  credits_used numeric(10,4),
  avg_prompt_quality numeric(5,2),
  topics_explored jsonb,

  UNIQUE(user_id, class_id, date)
);

-- Aggregated class metrics (for trainer dashboard)
CREATE TABLE class_daily_metrics (
  id uuid PRIMARY KEY,
  class_id uuid REFERENCES classes(id),
  date date,

  active_students integer,
  total_sessions integer,
  total_credits numeric(10,4),
  avg_prompt_quality numeric(5,2),
  top_topics jsonb,
  struggling_topics jsonb,

  UNIQUE(class_id, date)
);

-- Organization-level metrics (for school dashboard)
CREATE TABLE organization_daily_metrics (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  date date,

  active_students integer,
  active_trainers integer,
  total_sessions integer,
  total_credits numeric(10,4),
  avg_ai_literacy numeric(5,2),

  UNIQUE(organization_id, date)
);
```

### Background Jobs

1. **Per-conversation analysis** (after conversation ends)
   - Extract topics via AI classification
   - Compute prompt quality scores
   - Identify misconceptions

2. **Daily aggregation** (nightly cron)
   - Roll up to student_daily_metrics
   - Roll up to class_daily_metrics
   - Roll up to organization_daily_metrics

3. **Weekly insights** (weekly cron)
   - Generate alerts (inactive students, dependency issues)
   - Compute trends
   - Identify struggling topics

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- Basic usage metrics (sessions, messages, credits)
- Class overview for trainers
- Simple activity tracking

### Phase 2: AI Literacy
- Prompt quality scoring algorithm
- Dependency index calculation
- Student comparison view

### Phase 3: Domain Knowledge
- Topic extraction from conversations
- Topic-based class analysis
- Struggling topics identification

### Phase 4: School Features
- Cross-class comparison
- Department/program views
- Export and reporting

### Phase 5: Advanced
- Trend analysis
- Predictive alerts
- API for LMS integration

---

## Privacy Considerations

- Trainers see **metrics**, not conversation content
- Schools see **aggregates**, not individual conversations
- Students can view their own analytics
- All data computation happens server-side
- Option to anonymize for research/benchmarking

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Trainer dashboard usage | >3x/week per trainer |
| "Aha moment" rate | Trainers act on insights |
| AI literacy improvement | +15% over semester |
| Student engagement | Steady or increasing usage |
| School renewal rate | >80% |
