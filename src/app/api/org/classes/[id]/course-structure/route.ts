import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageClass } from "@/lib/org";

type RouteParams = { params: Promise<{ id: string }> };

interface ObjectiveInput {
  id?: string;
  title: string;
  description?: string;
  sort_order: number;
}

interface TopicInput {
  id?: string;
  parent_id?: string | null;
  title: string;
  description?: string;
  keywords?: string[];
  sort_order: number;
}

interface CourseStructureInput {
  objectives: ObjectiveInput[];
  topics: TopicInput[];
}

// GET /api/org/classes/[id]/course-structure - Get course structure
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Fetch objectives
    const { data: objectives, error: objError } = await supabase
      .from("class_learning_objectives")
      .select("id, title, description, sort_order, created_at, updated_at")
      .eq("class_id", id)
      .order("sort_order", { ascending: true });

    if (objError) {
      console.error("Error fetching objectives:", objError);
      return NextResponse.json(
        { error: "Failed to fetch objectives" },
        { status: 500 }
      );
    }

    // Fetch topics (flat list, build tree on client)
    const { data: topics, error: topicError } = await supabase
      .from("class_topics")
      .select("id, parent_id, title, description, keywords, sort_order, created_at, updated_at")
      .eq("class_id", id)
      .order("sort_order", { ascending: true });

    if (topicError) {
      console.error("Error fetching topics:", topicError);
      return NextResponse.json(
        { error: "Failed to fetch topics" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      objectives: objectives || [],
      topics: topics || [],
    });
  } catch (error) {
    console.error("Course structure fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/org/classes/[id]/course-structure - Create/update course structure (bulk upsert)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body: CourseStructureInput = await request.json();

    const { objectives = [], topics = [] } = body;

    // Validate input
    if (!Array.isArray(objectives) || !Array.isArray(topics)) {
      return NextResponse.json(
        { error: "Invalid input: objectives and topics must be arrays" },
        { status: 400 }
      );
    }

    // === Process Objectives ===
    // Get existing objective IDs
    const { data: existingObjectives } = await supabase
      .from("class_learning_objectives")
      .select("id")
      .eq("class_id", id);

    const existingObjIds = new Set((existingObjectives || []).map(o => o.id));
    const inputObjIds = new Set(objectives.filter(o => o.id).map(o => o.id));

    // Delete objectives that are no longer in input
    const objIdsToDelete = [...existingObjIds].filter(id => !inputObjIds.has(id));
    if (objIdsToDelete.length > 0) {
      await supabase
        .from("class_learning_objectives")
        .delete()
        .in("id", objIdsToDelete);
    }

    // Upsert objectives
    for (const obj of objectives) {
      if (obj.id && existingObjIds.has(obj.id)) {
        // Update existing
        await supabase
          .from("class_learning_objectives")
          .update({
            title: obj.title,
            description: obj.description || null,
            sort_order: obj.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", obj.id);
      } else {
        // Insert new
        await supabase
          .from("class_learning_objectives")
          .insert({
            class_id: id,
            title: obj.title,
            description: obj.description || null,
            sort_order: obj.sort_order,
          });
      }
    }

    // === Process Topics ===
    // Get existing topic IDs
    const { data: existingTopics } = await supabase
      .from("class_topics")
      .select("id")
      .eq("class_id", id);

    const existingTopicIds = new Set((existingTopics || []).map(t => t.id));
    const inputTopicIds = new Set(topics.filter(t => t.id).map(t => t.id));

    // Delete topics that are no longer in input
    const topicIdsToDelete = [...existingTopicIds].filter(id => !inputTopicIds.has(id));
    if (topicIdsToDelete.length > 0) {
      // First delete children, then parents (to avoid FK constraint issues)
      await supabase
        .from("class_topics")
        .delete()
        .in("id", topicIdsToDelete)
        .not("parent_id", "is", null);

      await supabase
        .from("class_topics")
        .delete()
        .in("id", topicIdsToDelete)
        .is("parent_id", null);
    }

    // Track ID mapping for new topics (temp_id -> real_id)
    const idMapping = new Map<string, string>();

    // Insert/update parent topics first (parent_id is null)
    const parentTopics = topics.filter(t => !t.parent_id);
    for (const topic of parentTopics) {
      if (topic.id && existingTopicIds.has(topic.id)) {
        // Update existing
        await supabase
          .from("class_topics")
          .update({
            title: topic.title,
            description: topic.description || null,
            keywords: topic.keywords || [],
            sort_order: topic.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", topic.id);
        idMapping.set(topic.id, topic.id);
      } else {
        // Insert new
        const { data: newTopic } = await supabase
          .from("class_topics")
          .insert({
            class_id: id,
            parent_id: null,
            title: topic.title,
            description: topic.description || null,
            keywords: topic.keywords || [],
            sort_order: topic.sort_order,
          })
          .select("id")
          .single();

        if (newTopic && topic.id) {
          idMapping.set(topic.id, newTopic.id);
        }
      }
    }

    // Then insert/update child topics
    const childTopics = topics.filter(t => t.parent_id);
    for (const topic of childTopics) {
      // Resolve parent_id (might be a temp ID that was just inserted)
      const resolvedParentId = topic.parent_id ? (idMapping.get(topic.parent_id) || topic.parent_id) : null;

      if (topic.id && existingTopicIds.has(topic.id)) {
        // Update existing
        await supabase
          .from("class_topics")
          .update({
            parent_id: resolvedParentId,
            title: topic.title,
            description: topic.description || null,
            keywords: topic.keywords || [],
            sort_order: topic.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", topic.id);
      } else {
        // Insert new
        await supabase
          .from("class_topics")
          .insert({
            class_id: id,
            parent_id: resolvedParentId,
            title: topic.title,
            description: topic.description || null,
            keywords: topic.keywords || [],
            sort_order: topic.sort_order,
          });
      }
    }

    // Return updated course structure
    const { data: finalObjectives } = await supabase
      .from("class_learning_objectives")
      .select("id, title, description, sort_order, created_at, updated_at")
      .eq("class_id", id)
      .order("sort_order", { ascending: true });

    const { data: finalTopics } = await supabase
      .from("class_topics")
      .select("id, parent_id, title, description, keywords, sort_order, created_at, updated_at")
      .eq("class_id", id)
      .order("sort_order", { ascending: true });

    return NextResponse.json({
      success: true,
      objectives: finalObjectives || [],
      topics: finalTopics || [],
    });
  } catch (error) {
    console.error("Course structure save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
