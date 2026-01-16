# Student AI Access Platform - Project Specification

## Project Overview

### Problem Statement
Students with limited budgets are being left behind in AI adoption because:
- They perceive AI as expensive (€20/month subscriptions)
- They don't know API/PAYG access exists
- Free tiers are heavily rate-limited and use degraded models
- Setting up API access requires technical knowledge they don't have

### Solution
A simple web application that acts as a middleman, providing students with:
- Pay-as-you-go access to premium AI models (Claude, GPT-4, Gemini, Mistral)
- Simple credit-based billing (no subscriptions required)
- User-friendly chat interface (no technical setup)
- Transparent usage tracking

### Target Audience
- University students (France/EU primarily)
- Limited purchasing power (€5-20/month budget)
- Need quality AI for academic work
- Non-technical users

---

## Business Model

### Revenue Model
Credit-based system with markup on API costs.

| Credit Pack | Price | Estimated Cost | Margin |
|-------------|-------|----------------|--------|
| Starter | €5 | ~€2.50-3 | ~€2 |
| Regular | €10 | ~€5-6 | ~€4 |
| Power | €20 | ~€10-12 | ~€8 |

### Unit Economics (Example: Claude Sonnet)
- Input: $3/1M tokens
- Output: $15/1M tokens
- Typical session (2K in, 1K out): ~€0.015
- 100 sessions/month: ~€1.50 actual cost
- With 50% markup: ~€2.25/month to student

### Markup Strategy
- 50-100% markup on API costs
- Still significantly cheaper than €20/month subscriptions
- Transparent pricing displayed to users

---

## Legal Considerations

### What Makes This Legal
1. Building an application layer (not just proxying API keys)
2. Adding value: UI, billing, usage tracking, multi-model access
3. Passing through provider Acceptable Use Policies to users
4. Not claiming the AI is ours

### Provider ToS Summary

| Provider | Status | Key Requirement |
|----------|--------|-----------------|
| Anthropic (Claude) | ✅ Allowed | Build app layer, pass through AUP |
| OpenAI (GPT-4) | ✅ Allowed | Build app layer, no raw API resale |
| Google (Gemini) | ✅ Allowed | Use paid tier, restrictions on search features |
| Mistral | ✅ Allowed | Partner program available |
| xAI (Grok) | ❌ Prohibited | Explicitly bans similar services |

### Required Legal Documents
1. Terms of Service (referencing each provider's AUP)
2. Privacy Policy (GDPR compliant - French/EU users)
3. Acceptable Use Policy (passthrough from providers)

---

## Technical Architecture

### High-Level Flow
```
Student → Frontend (Vue.js) → Backend API → AI Provider APIs
              ↓                    ↓
         Auth/Session         Credit System
                                  ↓
                            PostgreSQL DB
                                  ↓
                          Stripe/PayPal
```

### Tech Stack (Recommended)
- **Frontend**: Vue.js 3 + Tailwind CSS
- **Backend**: Node.js (Express) or Python (FastAPI)
- **Database**: PostgreSQL
- **Payments**: Stripe (supports EU, good student UX)
- **Hosting**: Vercel/Railway or VPS
- **AI SDKs**: Official SDKs for each provider

### Database Schema (Core Tables)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  credits_balance DECIMAL(10,4) DEFAULT 0
);

-- Credit Transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,4) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'refund'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  model VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  tokens_input INT,
  tokens_output INT,
  cost DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Usage Log
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  message_id UUID REFERENCES messages(id),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  tokens_input INT NOT NULL,
  tokens_output INT NOT NULL,
  cost_eur DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Features - MVP (Phase 1)

### Core Features
1. **User Authentication**
   - Email/password registration
   - Email verification
   - Password reset
   - (Optional) Google OAuth

2. **Chat Interface**
   - Simple, clean chat UI
   - Conversation history
   - Model selector dropdown
   - Token/cost display per message

3. **Credit System**
   - Buy credits via Stripe
   - Real-time balance display
   - Usage deducted per message
   - Low balance warning

4. **Model Access**
   - Claude Sonnet (default, best value)
   - GPT-4o
   - Gemini Pro
   - Mistral Large

5. **Usage Dashboard**
   - Credits remaining
   - Usage history
   - Cost breakdown by model

### UI/UX Requirements
- Mobile-responsive (students use phones)
- Dark/light mode
- French + English language support
- Simple onboarding (< 2 minutes to first chat)

---

## Features - Phase 2 (Future)

- File upload (PDFs, images) for multimodal
- Conversation sharing/export
- Preset prompts for academic use (essay feedback, research, citations)
- Referral system (invite friends, get credits)
- Student verification for discounts
- Group accounts for student associations

---

## API Integration Details

### Anthropic (Claude)
```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: userMessage }]
});

// Token tracking
const inputTokens = response.usage.input_tokens;
const outputTokens = response.usage.output_tokens;
```

### OpenAI (GPT-4)
```javascript
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: userMessage }]
});

const inputTokens = response.usage.prompt_tokens;
const outputTokens = response.usage.completion_tokens;
```

### Cost Calculation Logic
```javascript
const PRICING = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 }, // per 1M tokens
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'mistral-large': { input: 2.0, output: 6.0 }
};

const MARKUP = 1.5; // 50% markup

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = PRICING[model];
  const baseCost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return baseCost * MARKUP;
}
```

---

## Security Considerations

1. **API Keys**: Store in environment variables, never expose to frontend
2. **Rate Limiting**: Prevent abuse, implement per-user limits
3. **Input Validation**: Sanitize all user inputs
4. **Credit System**: Prevent negative balances, atomic transactions
5. **HTTPS**: Mandatory for all endpoints
6. **GDPR**: Data minimization, right to deletion, privacy policy

---

## Deployment Checklist

- [ ] Domain name registered
- [ ] SSL certificate configured
- [ ] Environment variables set for all API keys
- [ ] Stripe account configured (test + live)
- [ ] Database backups scheduled
- [ ] Error monitoring (Sentry or similar)
- [ ] Analytics (privacy-friendly: Plausible/Umami)
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Contact/support email

---

## Success Metrics

| Metric | Target (3 months) |
|--------|-------------------|
| Registered users | 100+ |
| Monthly active users | 50+ |
| Average spend per user | €5-10/month |
| Gross margin | 40-50% |
| Churn rate | <20%/month |

---

## Naming Ideas (to validate)

- StudyAI
- TokenBox
- AIPass
- CampusAI
- LearnToken
- SmartCredit

---

## Next Steps

1. Validate idea with 10 students (quick survey)
2. Build MVP (2-3 weeks)
3. Beta test with training cohort
4. Iterate based on feedback
5. Soft launch

---

## Notes for Development

- Keep it simple - students want to chat, not configure
- Mobile-first design
- Fast onboarding is critical
- Show cost transparency (builds trust)
- Consider free trial credits (€1-2) for new signups
