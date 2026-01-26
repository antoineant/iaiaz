import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/providers";
import { getEconomyModel } from "@/lib/models";

interface GeneratedObjective {
  title: string;
  description: string;
}

interface GeneratedTopic {
  title: string;
  description: string;
  keywords: string[];
  subtopics?: Array<{
    title: string;
    description: string;
    keywords: string[];
  }>;
}

interface GeneratedStructure {
  objectives: GeneratedObjective[];
  topics: GeneratedTopic[];
  suggestedName?: string;
  suggestedDescription?: string;
}

const GENERATION_PROMPT = `You are an expert instructional designer helping trainers create effective course structures.

Based on the trainer's description, generate:
1. 3-5 clear, measurable learning objectives (what students will be able to do)
2. 3-7 main topics with optional subtopics (the content structure)
3. Keywords for each topic (to help classify student questions)

Guidelines:
- Objectives should start with action verbs (Master, Apply, Analyze, Create, Evaluate...)
- Topics should be logically sequenced from foundational to advanced
- Keywords should include French and English terms relevant to the topic
- Keep descriptions concise but informative

IMPORTANT: Return ONLY valid JSON with this exact structure:
{
  "objectives": [
    { "title": "Objective title with action verb", "description": "Brief explanation" }
  ],
  "topics": [
    {
      "title": "Topic name",
      "description": "What this topic covers",
      "keywords": ["keyword1", "keyword2"],
      "subtopics": [
        { "title": "Subtopic name", "description": "Details", "keywords": ["keyword"] }
      ]
    }
  ],
  "suggestedName": "If the description doesn't include a clear course name, suggest one",
  "suggestedDescription": "If helpful, suggest a polished course description"
}

Trainer's description:
`;

// POST /api/ai/generate-course-structure
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a trainer
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .single();

    if (!profile || !["trainer", "admin"].includes(profile.account_type)) {
      return NextResponse.json({ error: "Trainer access required" }, { status: 403 });
    }

    const body = await request.json();
    const { description, locale = "fr" } = body;

    if (!description || typeof description !== "string" || description.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide a description of at least 20 characters" },
        { status: 400 }
      );
    }

    // Get the economy model for cost-effective generation
    const model = await getEconomyModel();

    // Build prompt with locale hint
    const localeHint = locale === "fr"
      ? "\n\nNote: The course is in French. Generate content in French, but include both French and English keywords."
      : "\n\nNote: Generate content in the same language as the description.";

    const fullPrompt = GENERATION_PROMPT + description.trim() + localeHint;

    // Call AI
    const response = await callAI(model, [
      { role: "user", content: fullPrompt }
    ]);

    // Parse response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse AI response:", response.content);
      return NextResponse.json(
        { error: "Failed to generate structure. Please try again." },
        { status: 500 }
      );
    }

    let structure: GeneratedStructure;
    try {
      structure = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Invalid JSON from AI:", jsonMatch[0]);
      return NextResponse.json(
        { error: "Failed to parse generated structure. Please try again." },
        { status: 500 }
      );
    }

    // Validate structure
    if (!Array.isArray(structure.objectives) || !Array.isArray(structure.topics)) {
      return NextResponse.json(
        { error: "Invalid structure generated. Please try again." },
        { status: 500 }
      );
    }

    // Transform to the format expected by CourseStructureEditor
    const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const objectives = structure.objectives.map((obj, index) => ({
      id: generateTempId(),
      title: obj.title,
      description: obj.description,
      sort_order: index,
    }));

    const topics: Array<{
      id: string;
      parent_id: string | null;
      title: string;
      description: string;
      keywords: string[];
      sort_order: number;
    }> = [];

    structure.topics.forEach((topic, topicIndex) => {
      const parentId = generateTempId();
      topics.push({
        id: parentId,
        parent_id: null,
        title: topic.title,
        description: topic.description || "",
        keywords: topic.keywords || [],
        sort_order: topicIndex,
      });

      // Add subtopics if present
      if (topic.subtopics && Array.isArray(topic.subtopics)) {
        topic.subtopics.forEach((subtopic, subIndex) => {
          topics.push({
            id: generateTempId(),
            parent_id: parentId,
            title: subtopic.title,
            description: subtopic.description || "",
            keywords: subtopic.keywords || [],
            sort_order: subIndex,
          });
        });
      }
    });

    return NextResponse.json({
      objectives,
      topics,
      suggestedName: structure.suggestedName,
      suggestedDescription: structure.suggestedDescription,
      tokensUsed: response.tokensInput + response.tokensOutput,
    });

  } catch (error) {
    console.error("Course structure generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
