/**
 * Aitelier Workshop JSON Parser
 * Converts Aitelier workshop export format to course structure format
 *
 * Aitelier workshop structure (expected):
 * {
 *   title: string,
 *   description: string,
 *   objectives: [{ title, description }],
 *   activities: [
 *     {
 *       type: "theory" | "exercise" | "case-study" | "discussion" | "quiz",
 *       title: string,
 *       description: string,
 *       content?: string,
 *       duration?: number
 *     }
 *   ]
 * }
 */

export interface AitelierObjective {
  title: string;
  description?: string;
}

export interface AitelierActivity {
  type: string;
  title: string;
  description?: string;
  content?: string;
  duration?: number;
}

export interface AitelierWorkshop {
  title?: string;
  description?: string;
  objectives?: AitelierObjective[];
  activities?: AitelierActivity[];
  // Alternative formats
  modules?: Array<{
    title: string;
    description?: string;
    activities?: AitelierActivity[];
  }>;
  sections?: Array<{
    title: string;
    description?: string;
    items?: AitelierActivity[];
  }>;
}

export interface ParsedLearningObjective {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
}

export interface ParsedTopic {
  id: string;
  parent_id: string | null;
  title: string;
  description?: string;
  keywords: string[];
  sort_order: number;
}

export interface ParsedCourseStructure {
  objectives: ParsedLearningObjective[];
  topics: ParsedTopic[];
  workshopTitle?: string;
  workshopDescription?: string;
}

// Generate temp ID
const generateTempId = () =>
  `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Keywords based on activity type
const TYPE_KEYWORDS: Record<string, string[]> = {
  theory: ["théorie", "concept", "définition", "introduction", "cours"],
  exercise: ["exercice", "pratique", "application", "entraînement"],
  "case-study": ["cas", "étude de cas", "analyse", "situation"],
  discussion: ["discussion", "débat", "échange", "réflexion"],
  quiz: ["quiz", "évaluation", "test", "QCM"],
  video: ["vidéo", "tutoriel", "démonstration"],
  reading: ["lecture", "texte", "document", "article"],
};

/**
 * Parse Aitelier workshop JSON to course structure
 */
export function parseAitelierWorkshop(json: unknown): ParsedCourseStructure {
  const workshop = json as AitelierWorkshop;
  const objectives: ParsedLearningObjective[] = [];
  const topics: ParsedTopic[] = [];

  // Parse objectives
  if (workshop.objectives && Array.isArray(workshop.objectives)) {
    workshop.objectives.forEach((obj, index) => {
      objectives.push({
        id: generateTempId(),
        title: obj.title || `Objective ${index + 1}`,
        description: obj.description,
        sort_order: index,
      });
    });
  }

  // Parse activities directly
  if (workshop.activities && Array.isArray(workshop.activities)) {
    parseActivities(workshop.activities, topics, null);
  }

  // Parse modules (alternative structure)
  if (workshop.modules && Array.isArray(workshop.modules)) {
    workshop.modules.forEach((module, moduleIndex) => {
      const parentId = generateTempId();
      topics.push({
        id: parentId,
        parent_id: null,
        title: module.title || `Module ${moduleIndex + 1}`,
        description: module.description,
        keywords: [],
        sort_order: moduleIndex,
      });

      if (module.activities && Array.isArray(module.activities)) {
        parseActivities(module.activities, topics, parentId);
      }
    });
  }

  // Parse sections (another alternative structure)
  if (workshop.sections && Array.isArray(workshop.sections)) {
    workshop.sections.forEach((section, sectionIndex) => {
      const parentId = generateTempId();
      topics.push({
        id: parentId,
        parent_id: null,
        title: section.title || `Section ${sectionIndex + 1}`,
        description: section.description,
        keywords: [],
        sort_order: sectionIndex,
      });

      if (section.items && Array.isArray(section.items)) {
        parseActivities(section.items, topics, parentId);
      }
    });
  }

  return {
    objectives,
    topics,
    workshopTitle: workshop.title,
    workshopDescription: workshop.description,
  };
}

/**
 * Parse activities array to topics
 */
function parseActivities(
  activities: AitelierActivity[],
  topics: ParsedTopic[],
  parentId: string | null
) {
  // If no parent, group activities by type as parent topics
  if (parentId === null) {
    const activityGroups = new Map<string, AitelierActivity[]>();

    // Group activities by type
    activities.forEach((activity) => {
      const type = activity.type || "other";
      if (!activityGroups.has(type)) {
        activityGroups.set(type, []);
      }
      activityGroups.get(type)!.push(activity);
    });

    // Create parent topics for each type if multiple types exist
    if (activityGroups.size > 1) {
      let sortOrder = topics.length;
      activityGroups.forEach((groupActivities, type) => {
        const typeParentId = generateTempId();
        topics.push({
          id: typeParentId,
          parent_id: null,
          title: formatActivityType(type),
          description: `Activities of type: ${type}`,
          keywords: TYPE_KEYWORDS[type] || [],
          sort_order: sortOrder++,
        });

        // Add activities as children
        groupActivities.forEach((activity, index) => {
          topics.push({
            id: generateTempId(),
            parent_id: typeParentId,
            title: activity.title,
            description: activity.description || activity.content?.slice(0, 200),
            keywords: extractKeywords(activity),
            sort_order: index,
          });
        });
      });
    } else {
      // Single type or mixed - add directly as root topics
      activities.forEach((activity, index) => {
        topics.push({
          id: generateTempId(),
          parent_id: null,
          title: activity.title,
          description: activity.description || activity.content?.slice(0, 200),
          keywords: extractKeywords(activity),
          sort_order: topics.length + index,
        });
      });
    }
  } else {
    // Add as children of parent
    activities.forEach((activity, index) => {
      topics.push({
        id: generateTempId(),
        parent_id: parentId,
        title: activity.title,
        description: activity.description || activity.content?.slice(0, 200),
        keywords: extractKeywords(activity),
        sort_order: index,
      });
    });
  }
}

/**
 * Format activity type to human-readable label
 */
function formatActivityType(type: string): string {
  const labels: Record<string, string> = {
    theory: "Théorie",
    exercise: "Exercices",
    "case-study": "Études de cas",
    discussion: "Discussions",
    quiz: "Quiz",
    video: "Vidéos",
    reading: "Lectures",
    other: "Autres",
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Extract keywords from activity
 */
function extractKeywords(activity: AitelierActivity): string[] {
  const keywords: string[] = [];

  // Add type-based keywords
  if (activity.type && TYPE_KEYWORDS[activity.type]) {
    keywords.push(...TYPE_KEYWORDS[activity.type].slice(0, 2));
  }

  // Extract keywords from title (words > 4 chars)
  if (activity.title) {
    const titleWords = activity.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3);
    keywords.push(...titleWords);
  }

  // Deduplicate
  return [...new Set(keywords)];
}

/**
 * Validate if input is a valid Aitelier workshop JSON
 */
export function isValidAitelierWorkshop(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;

  const workshop = json as AitelierWorkshop;

  // Must have at least one of these arrays
  const hasObjectives = Array.isArray(workshop.objectives) && workshop.objectives.length > 0;
  const hasActivities = Array.isArray(workshop.activities) && workshop.activities.length > 0;
  const hasModules = Array.isArray(workshop.modules) && workshop.modules.length > 0;
  const hasSections = Array.isArray(workshop.sections) && workshop.sections.length > 0;

  return hasObjectives || hasActivities || hasModules || hasSections;
}

/**
 * Try to parse JSON string, returns null if invalid
 */
export function tryParseJSON(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
