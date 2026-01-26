"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Target,
  BookOpen,
  FileUp,
  Save,
  AlertCircle,
  Check,
} from "lucide-react";

export interface LearningObjective {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
}

export interface Topic {
  id: string;
  parent_id: string | null;
  title: string;
  description?: string;
  keywords?: string[];
  sort_order: number;
}

interface CourseStructureEditorProps {
  classId: string;
  onImportClick?: () => void;
}

export function CourseStructureEditor({
  classId,
  onImportClick,
}: CourseStructureEditorProps) {
  const t = useTranslations("org.classes.courseStructure");

  const [objectives, setObjectives] = useState<LearningObjective[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Expanded topics for tree view
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Load course structure
  const loadCourseStructure = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/org/classes/${classId}/course-structure`);
      if (!response.ok) throw new Error("Failed to load course structure");
      const data = await response.json();
      setObjectives(data.objectives || []);
      setTopics(data.topics || []);
      setHasChanges(false);
    } catch {
      setError("Failed to load course structure");
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadCourseStructure();
  }, [loadCourseStructure]);

  // Save course structure
  const saveCourseStructure = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch(`/api/org/classes/${classId}/course-structure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectives, topics }),
      });
      if (!response.ok) throw new Error("Failed to save");
      const data = await response.json();
      setObjectives(data.objectives || []);
      setTopics(data.topics || []);
      setHasChanges(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save course structure");
    } finally {
      setIsSaving(false);
    }
  };

  // Generate temp ID for new items
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // === Objectives Management ===
  const addObjective = () => {
    const newObjective: LearningObjective = {
      id: generateTempId(),
      title: "",
      description: "",
      sort_order: objectives.length,
    };
    setObjectives([...objectives, newObjective]);
    setHasChanges(true);
  };

  const updateObjective = (id: string, field: keyof LearningObjective, value: string) => {
    setObjectives(
      objectives.map((obj) => (obj.id === id ? { ...obj, [field]: value } : obj))
    );
    setHasChanges(true);
  };

  const deleteObjective = (id: string) => {
    setObjectives(objectives.filter((obj) => obj.id !== id));
    setHasChanges(true);
  };

  const moveObjective = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === objectives.length - 1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newObjectives = [...objectives];
    [newObjectives[index], newObjectives[newIndex]] = [newObjectives[newIndex], newObjectives[index]];
    // Update sort orders
    newObjectives.forEach((obj, i) => (obj.sort_order = i));
    setObjectives(newObjectives);
    setHasChanges(true);
  };

  // === Topics Management ===
  const addTopic = (parentId: string | null = null) => {
    const newTopic: Topic = {
      id: generateTempId(),
      parent_id: parentId,
      title: "",
      description: "",
      keywords: [],
      sort_order: topics.filter((t) => t.parent_id === parentId).length,
    };
    setTopics([...topics, newTopic]);
    if (parentId) {
      setExpandedTopics((prev) => new Set([...prev, parentId]));
    }
    setHasChanges(true);
  };

  const updateTopic = (id: string, field: keyof Topic, value: string | string[] | null) => {
    setTopics(
      topics.map((topic) => (topic.id === id ? { ...topic, [field]: value } : topic))
    );
    setHasChanges(true);
  };

  const deleteTopic = (id: string) => {
    // Delete topic and its children
    const idsToDelete = new Set([id]);
    topics.forEach((t) => {
      if (t.parent_id === id) idsToDelete.add(t.id);
    });
    setTopics(topics.filter((t) => !idsToDelete.has(t.id)));
    setHasChanges(true);
  };

  const toggleTopicExpand = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get parent topics (topics with no parent)
  const parentTopics = topics.filter((t) => !t.parent_id);

  // Get children of a topic
  const getChildTopics = (parentId: string) => topics.filter((t) => t.parent_id === parentId);

  // Handle keywords as comma-separated string
  const keywordsToString = (keywords?: string[]) => (keywords || []).join(", ");
  const stringToKeywords = (str: string) =>
    str
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

  // Import data from Aitelier parser
  const importFromAitelier = (importedObjectives: LearningObjective[], importedTopics: Topic[]) => {
    setObjectives(importedObjectives);
    setTopics(importedTopics);
    setHasChanges(true);
  };

  // Expose import function for parent component
  (window as unknown as Record<string, unknown>).__importCourseStructure = importFromAitelier;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t("title")}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onImportClick && (
            <Button variant="outline" onClick={onImportClick}>
              <FileUp className="w-4 h-4 mr-2" />
              {t("importAitelier")}
            </Button>
          )}
          <Button
            onClick={saveCourseStructure}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t("save")}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {t("saved")}
        </div>
      )}

      {/* Learning Objectives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t("objectives")}
            </h3>
            <Button variant="outline" size="sm" onClick={addObjective}>
              <Plus className="w-4 h-4 mr-1" />
              {t("addObjective")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {objectives.length === 0 ? (
            <p className="text-center text-[var(--muted-foreground)] py-8">
              {t("noObjectives")}
            </p>
          ) : (
            <div className="space-y-3">
              {objectives.map((obj, index) => (
                <div
                  key={obj.id}
                  className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg bg-[var(--muted)]/30"
                >
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      onClick={() => moveObjective(index, "up")}
                      disabled={index === 0}
                      className="p-1 hover:bg-[var(--muted)] rounded disabled:opacity-30"
                    >
                      <ChevronRight className="w-3 h-3 rotate-[-90deg]" />
                    </button>
                    <GripVertical className="w-3 h-3 text-[var(--muted-foreground)]" />
                    <button
                      onClick={() => moveObjective(index, "down")}
                      disabled={index === objectives.length - 1}
                      className="p-1 hover:bg-[var(--muted)] rounded disabled:opacity-30"
                    >
                      <ChevronRight className="w-3 h-3 rotate-90" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={obj.title}
                      onChange={(e) => updateObjective(obj.id, "title", e.target.value)}
                      placeholder={t("objectiveTitle")}
                      className="font-medium"
                    />
                    <textarea
                      value={obj.description || ""}
                      onChange={(e) => updateObjective(obj.id, "description", e.target.value)}
                      placeholder={t("objectiveDescription")}
                      className="w-full p-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] resize-none"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={() => deleteObjective(obj.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {t("topics")}
            </h3>
            <Button variant="outline" size="sm" onClick={() => addTopic(null)}>
              <Plus className="w-4 h-4 mr-1" />
              {t("addTopic")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {parentTopics.length === 0 ? (
            <p className="text-center text-[var(--muted-foreground)] py-8">
              {t("noTopics")}
            </p>
          ) : (
            <div className="space-y-3">
              {parentTopics.map((topic) => (
                <TopicItem
                  key={topic.id}
                  topic={topic}
                  childTopics={getChildTopics(topic.id)}
                  isExpanded={expandedTopics.has(topic.id)}
                  onToggleExpand={() => toggleTopicExpand(topic.id)}
                  onUpdate={updateTopic}
                  onDelete={deleteTopic}
                  onAddChild={() => addTopic(topic.id)}
                  keywordsToString={keywordsToString}
                  stringToKeywords={stringToKeywords}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Topic item component with children support
interface TopicItemProps {
  topic: Topic;
  childTopics: Topic[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: string, field: keyof Topic, value: string | string[] | null) => void;
  onDelete: (id: string) => void;
  onAddChild: () => void;
  keywordsToString: (keywords?: string[]) => string;
  stringToKeywords: (str: string) => string[];
  t: ReturnType<typeof useTranslations<string>>;
  isChild?: boolean;
}

function TopicItem({
  topic,
  childTopics,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onAddChild,
  keywordsToString,
  stringToKeywords,
  t,
  isChild = false,
}: TopicItemProps) {
  const hasChildren = childTopics.length > 0;

  return (
    <div className={`${isChild ? "ml-8" : ""}`}>
      <div className="flex items-start gap-2 p-3 border border-[var(--border)] rounded-lg bg-[var(--muted)]/30">
        {!isChild && (
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-[var(--muted)] rounded mt-2"
          >
            {isExpanded || hasChildren ? (
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="flex-1 space-y-2">
          <Input
            value={topic.title}
            onChange={(e) => onUpdate(topic.id, "title", e.target.value)}
            placeholder={t("topicTitle")}
            className="font-medium"
          />
          <textarea
            value={topic.description || ""}
            onChange={(e) => onUpdate(topic.id, "description", e.target.value)}
            placeholder={t("topicDescription")}
            className="w-full p-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] resize-none"
            rows={2}
          />
          <Input
            value={keywordsToString(topic.keywords)}
            onChange={(e) => onUpdate(topic.id, "keywords", stringToKeywords(e.target.value))}
            placeholder={t("keywords")}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          {!isChild && (
            <button
              onClick={onAddChild}
              className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded"
              title={t("addSubtopic")}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(topic.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Child topics */}
      {isExpanded && childTopics.length > 0 && (
        <div className="mt-2 space-y-2">
          {childTopics.map((child) => (
            <TopicItem
              key={child.id}
              topic={child}
              childTopics={[]}
              isExpanded={false}
              onToggleExpand={() => {}}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={() => {}}
              keywordsToString={keywordsToString}
              stringToKeywords={stringToKeywords}
              t={t}
              isChild
            />
          ))}
        </div>
      )}
    </div>
  );
}
