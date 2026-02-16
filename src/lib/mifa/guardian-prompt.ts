import type { CustomAssistant } from "@/types";

// --- Parent prompt types & template ---

export interface ChildContext {
  name: string;
  age?: number | null;
  schoolYear?: string | null;
  supervisionMode: string;
  recentSubjects?: { subject: string; count: number; struggleCount: number }[];
}

const PARENT_PROMPT_TEMPLATE = `You are an AI assistant on Mifa by iaiaz, a family learning platform.
You are chatting with a parent from the family "{org_name}".

FAMILY OVERVIEW:
{children_summary}

YOUR ROLE:
- Help the parent understand their children's learning progress
- Offer practical, age-appropriate parenting advice about AI and education
- When discussing a specific child, use their name and reference their age/school level
- Suggest ways parents can support their children's learning
- Answer questions about responsible AI use for families
- Respond in the same language the parent writes in
- Be warm, non-judgmental, and supportive

IMPORTANT:
- You have context about the family's children to give personalized advice
- Do NOT fabricate data — only reference information provided above
- If asked about specific conversation content, explain you only see activity summaries, not actual messages`;

export function buildParentSystemPrompt(
  orgName: string,
  children: ChildContext[]
): string {
  const childrenSummary = children.length > 0
    ? children.map((c) => {
        const agePart = c.age ? `${c.age} years old` : "age unknown";
        const yearLabel = c.schoolYear
          ? SCHOOL_YEAR_LABELS[c.schoolYear] || c.schoolYear
          : null;
        const yearPart = yearLabel ? `, ${yearLabel}` : "";
        const recentPart =
          c.recentSubjects && c.recentSubjects.length > 0
            ? ` Recent activity: ${c.recentSubjects
                .map(
                  (s) =>
                    `${s.subject} (${s.count} message${s.count > 1 ? "s" : ""}${s.struggleCount > 0 ? `, ${s.struggleCount} struggle${s.struggleCount > 1 ? "s" : ""}` : ""})`
                )
                .join(", ")}.`
            : " No recent activity.";
        return `- ${c.name}, ${agePart}${yearPart}. Supervision: ${c.supervisionMode}.${recentPart}`;
      }).join("\n")
    : "No children registered yet.";

  return PARENT_PROMPT_TEMPLATE
    .replace(/\{org_name\}/g, orgName)
    .replace(/\{children_summary\}/g, childrenSummary);
}

// --- Child prompt (existing) ---

const GUARDIAN_PROMPT_TEMPLATE = `You are an AI assistant on Mifa by iaiaz, a family learning platform.
You are helping {user_name}, {age_description}.
Supervision mode: {supervision_mode}.
{school_year_context}
EDUCATIONAL ROLE:
- Guide understanding, don't give direct answers
- Adapt language and complexity to {user_name}'s age{school_year_instruction}
- Be encouraging: celebrate effort, not just results
- When {user_name} struggles with a topic repeatedly, mention it naturally
  ("I notice fractions keep coming up — want me to explain differently?")
- If they ask you to do their homework, redirect to helping them understand
- Respond in the same language {user_name} writes in
- Address {user_name} by their first name naturally when appropriate

SAFETY — CRITICAL:
If the user brings up serious personal issues (depression, self-harm,
bullying, eating disorders, abuse, intense loneliness, or any mental
health concern), you MUST:
1. Acknowledge their feelings with empathy — never dismiss or minimize
2. Tell them clearly: "I'm an AI, and this is too important for me to
   handle alone. You deserve to talk to someone who can really help."
3. Encourage them to talk to a trusted adult (parent, teacher, school
   counselor, doctor)
4. Provide these resources:
   - Fil Sante Jeunes : 0 800 235 236 (anonyme, gratuit, 12-25 ans)
   - 3114 : numero national de prevention du suicide
   - 3020 : Non au harcelement
   - 119 : Enfance en danger
5. Do NOT attempt to be their therapist or counselor
6. Do NOT store, repeat, or reference what they shared in future messages

ACTIVITY METADATA:
At the very end of each response, append a hidden tag that will be
stripped before display. Format:
<mifa_meta>{"subject":"maths","topic":"fractions","type":"homework","struggle":false}</mifa_meta>

Fields:
- subject: school subject (maths, francais, histoire, svt, anglais, philo, etc.) or "general"
- topic: specific topic within the subject
- type: homework | essay | creative | revision | general
- struggle: true if the user seems confused or keeps asking about the same concept`;

const SCHOOL_YEAR_LABELS: Record<string, string> = {
  "6eme": "6ème (11-12 ans, premier cycle collège)",
  "5eme": "5ème (12-13 ans, collège)",
  "4eme": "4ème (13-14 ans, collège)",
  "3eme": "3ème (14-15 ans, fin de collège, brevet)",
  "seconde": "Seconde (15-16 ans, lycée général)",
  "premiere": "Première (16-17 ans, lycée, épreuves anticipées du bac)",
  "terminale": "Terminale (17-18 ans, baccalauréat)",
  "superieur": "Enseignement supérieur",
};

export function buildGuardianPrompt(
  ageBracket: string,
  supervisionMode: string,
  userName: string,
  schoolYear?: string | null,
  exactAge?: number | null
): string {
  // Use exact age when available, fall back to bracket
  const ageDescription = exactAge
    ? `a ${exactAge}-year-old teenager`
    : `a ${ageBracket} teenager`;

  const schoolYearLabel = schoolYear ? SCHOOL_YEAR_LABELS[schoolYear] || schoolYear : null;
  const schoolYearContext = schoolYearLabel
    ? `School year: ${schoolYearLabel}.`
    : "";
  const schoolYearInstruction = schoolYearLabel
    ? `\n- Align explanations with the French national curriculum for ${schoolYearLabel}. Reference concepts they should already know and build from there.`
    : "";

  return GUARDIAN_PROMPT_TEMPLATE
    .replace(/\{age_description\}/g, ageDescription)
    .replace(/\{supervision_mode\}/g, supervisionMode)
    .replace(/\{user_name\}/g, userName)
    .replace(/\{school_year_context\}/g, schoolYearContext ? schoolYearContext + "\n" : "")
    .replace(/\{school_year_instruction\}/g, schoolYearInstruction);
}

export function buildMifaSystemPrompt(
  ageBracket: string,
  supervisionMode: string,
  userName: string,
  assistant?: Pick<CustomAssistant, "name" | "system_prompt"> | null,
  schoolYear?: string | null,
  exactAge?: number | null
): string {
  let prompt = buildGuardianPrompt(ageBracket, supervisionMode, userName, schoolYear, exactAge);

  if (assistant) {
    prompt += `\n\nAdditionally, you are "${assistant.name}".\n${assistant.system_prompt}`;
  }

  return prompt;
}

export interface MifaMetadata {
  subject?: string;
  topic?: string;
  type?: string;
  struggle?: boolean;
}

/**
 * Parses and strips <mifa_meta> tags from AI response content.
 * Returns the clean content (without meta tag) and parsed metadata.
 */
export function parseMifaMetadata(content: string): {
  cleanContent: string;
  metadata: MifaMetadata | null;
} {
  const metaRegex = /<mifa_meta>([\s\S]*?)<\/mifa_meta>/;
  const match = content.match(metaRegex);

  if (!match) {
    return { cleanContent: content, metadata: null };
  }

  const cleanContent = content.replace(metaRegex, "").trimEnd();

  try {
    const metadata = JSON.parse(match[1]) as MifaMetadata;
    return { cleanContent, metadata };
  } catch {
    return { cleanContent, metadata: null };
  }
}

/**
 * For streaming: buffers content and strips mifa_meta tag in real-time.
 * Returns the content safe to send to client and any detected metadata.
 */
export function createMifaMetaStripper() {
  let buffer = "";
  let metadataFound: MifaMetadata | null = null;
  const TAG_START = "<mifa_meta>";

  return {
    /** Process a new chunk. Returns the content safe to send to the client. */
    processChunk(chunk: string): string {
      buffer += chunk;

      // Check if we might be starting a meta tag
      const tagStartIdx = buffer.indexOf("<mifa_");
      if (tagStartIdx === -1) {
        // No tag starting, safe to flush everything
        const safe = buffer;
        buffer = "";
        return safe;
      }

      // Check if we have a complete tag
      const fullTagRegex = /<mifa_meta>([\s\S]*?)<\/mifa_meta>/;
      const match = buffer.match(fullTagRegex);
      if (match) {
        // Extract metadata and remove the tag
        try {
          metadataFound = JSON.parse(match[1]) as MifaMetadata;
        } catch {
          // Invalid JSON, ignore
        }
        const cleaned = buffer.replace(fullTagRegex, "");
        buffer = "";
        return cleaned;
      }

      // Partial tag detected — only send content before the tag start
      const safe = buffer.substring(0, tagStartIdx);
      buffer = buffer.substring(tagStartIdx);
      return safe;
    },

    /** Flush remaining buffer (call at end of stream). */
    flush(): string {
      const remaining = buffer;
      buffer = "";
      return remaining;
    },

    /** Get extracted metadata (available after stream completes). */
    getMetadata(): MifaMetadata | null {
      return metadataFound;
    },
  };
}
