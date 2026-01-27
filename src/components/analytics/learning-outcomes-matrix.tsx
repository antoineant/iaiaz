"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target,
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  HelpCircle,
} from "lucide-react";

// Types matching the API response
type TopicStatus = "strong" | "on_track" | "needs_attention" | "no_data";

interface StudentTopicScore {
  topic_id: string;
  message_count: number;
  avg_bloom: number;
  score: number;
  status: TopicStatus;
}

interface StudentOutcome {
  id: string;
  name: string;
  email: string;
  topics: StudentTopicScore[];
  overall_score: number;
}

interface TopicInfo {
  id: string;
  name: string;
  description: string | null;
}

interface ClassAverage {
  topic_id: string;
  avg_score: number;
  std_dev: number;
}

interface LearningOutcomesMatrixProps {
  students: StudentOutcome[];
  topics: TopicInfo[];
  classAverages: ClassAverage[];
  hasStructure: boolean;
}

// Status color configuration
const STATUS_CONFIG = {
  strong: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-300 dark:border-green-700",
  },
  on_track: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-700",
  },
  needs_attention: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-700",
  },
  no_data: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-500 dark:text-gray-400",
    border: "border-gray-300 dark:border-gray-600",
  },
};

// Bloom level labels (1-6)
const BLOOM_LABELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

type SortField = "name" | "overall_score";
type SortDirection = "asc" | "desc";

export function LearningOutcomesMatrix({
  students,
  topics,
  classAverages,
  hasStructure,
}: LearningOutcomesMatrixProps) {
  const t = useTranslations("org.classes.analytics.learningOutcomes");
  const [sortField, setSortField] = useState<SortField>("overall_score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [hoveredCell, setHoveredCell] = useState<{ studentId: string; topicId: string } | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // If no course structure, show empty state
  if (!hasStructure) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            {t("title")}
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("noStructure")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no students, show empty state
  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            {t("title")}
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("noStudents")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create a lookup map for class averages
  const avgMap = new Map<string, ClassAverage>();
  for (const ca of classAverages) {
    avgMap.set(ca.topic_id, ca);
  }

  // Sort students
  const sortedStudents = [...students].sort((a, b) => {
    let comparison = 0;
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else {
      comparison = a.overall_score - b.overall_score;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  // Get sort icon for a field
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Student", "Email", ...topics.map((t) => t.name), "Overall Score"];
    const rows = sortedStudents.map((student) => {
      const topicScores = topics.map((topic) => {
        const score = student.topics.find((ts) => ts.topic_id === topic.id);
        if (!score || score.status === "no_data") return "N/A";
        return score.score.toFixed(3);
      });
      return [student.name, student.email, ...topicScores, student.overall_score.toFixed(3)];
    });

    // Add class averages row
    const avgRow = [
      t("classAverage"),
      "",
      ...topics.map((topic) => {
        const avg = avgMap.get(topic.id);
        return avg ? avg.avg_score.toFixed(3) : "N/A";
      }),
      "",
    ];
    rows.push(avgRow);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `learning-outcomes-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF using html2canvas and jsPDF
  const exportToPDF = async () => {
    try {
      // Dynamically import the libraries
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      const element = document.getElementById("learning-outcomes-matrix");
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`learning-outcomes-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
    }
  };

  // Get tooltip content for a cell
  const getTooltipContent = (student: StudentOutcome, topicId: string) => {
    const score = student.topics.find((ts) => ts.topic_id === topicId);
    const avg = avgMap.get(topicId);
    if (!score) return null;

    return {
      messages: score.message_count,
      avgBloom: score.avg_bloom,
      bloomLabel: score.avg_bloom > 0 ? BLOOM_LABELS[Math.round(score.avg_bloom) - 1] : null,
      score: score.score,
      classAvg: avg?.avg_score || 0,
      diff: avg ? score.score - avg.avg_score : 0,
      status: score.status,
    };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            {t("title")}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("subtitle", { students: students.length, topics: topics.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLegend(!showLegend)}
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            {t("legend")}
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-1" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        {showLegend && (
          <div className="mb-4 p-4 bg-[var(--muted)] rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {t("legendTitle")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_CONFIG.strong.bg} ${STATUS_CONFIG.strong.border} border`} />
                <span>{t("status.strong")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_CONFIG.on_track.bg} ${STATUS_CONFIG.on_track.border} border`} />
                <span>{t("status.onTrack")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_CONFIG.needs_attention.bg} ${STATUS_CONFIG.needs_attention.border} border`} />
                <span>{t("status.needsAttention")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_CONFIG.no_data.bg} ${STATUS_CONFIG.no_data.border} border`} />
                <span>{t("status.noData")}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              {t("legendDescription")}
            </p>
          </div>
        )}

        {/* Matrix Table */}
        <div id="learning-outcomes-matrix" className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th
                  className="text-left p-2 font-medium cursor-pointer hover:bg-[var(--muted)] transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    {t("student")}
                    {getSortIcon("name")}
                  </div>
                </th>
                {topics.map((topic) => (
                  <th
                    key={topic.id}
                    className="text-center p-2 font-medium min-w-[80px]"
                    title={topic.description || topic.name}
                  >
                    <span className="line-clamp-2 text-xs">{topic.name}</span>
                  </th>
                ))}
                <th
                  className="text-center p-2 font-medium cursor-pointer hover:bg-[var(--muted)] transition-colors min-w-[80px]"
                  onClick={() => handleSort("overall_score")}
                >
                  <div className="flex items-center justify-center gap-1">
                    {t("overall")}
                    {getSortIcon("overall_score")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => (
                <tr key={student.id} className="border-b hover:bg-[var(--muted)]/50">
                  <td className="p-2">
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)] truncate max-w-[150px]">
                      {student.email}
                    </div>
                  </td>
                  {topics.map((topic) => {
                    const topicScore = student.topics.find((ts) => ts.topic_id === topic.id);
                    const status = topicScore?.status || "no_data";
                    const config = STATUS_CONFIG[status];
                    const isHovered =
                      hoveredCell?.studentId === student.id &&
                      hoveredCell?.topicId === topic.id;
                    const tooltip = getTooltipContent(student, topic.id);

                    return (
                      <td
                        key={topic.id}
                        className="p-1 text-center relative"
                        onMouseEnter={() =>
                          setHoveredCell({ studentId: student.id, topicId: topic.id })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          className={`
                            p-2 rounded border cursor-default
                            ${config.bg} ${config.border} ${config.text}
                            transition-all
                          `}
                        >
                          {status === "no_data" ? (
                            <span className="text-xs">—</span>
                          ) : (
                            <span className="text-xs font-medium">
                              {((topicScore?.score || 0) * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        {/* Tooltip */}
                        {isHovered && tooltip && tooltip.status !== "no_data" && (
                          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-3 bg-[var(--background)] border rounded-lg shadow-lg text-left">
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[var(--muted-foreground)]">
                                  {t("messages")}:
                                </span>
                                <span className="font-medium">{tooltip.messages}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--muted-foreground)]">
                                  {t("avgBloom")}:
                                </span>
                                <span className="font-medium">
                                  {tooltip.bloomLabel || "—"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--muted-foreground)]">
                                  {t("score")}:
                                </span>
                                <span className="font-medium">
                                  {(tooltip.score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--muted-foreground)]">
                                  {t("classAvg")}:
                                </span>
                                <span className="font-medium">
                                  {(tooltip.classAvg * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between border-t pt-1 mt-1">
                                <span className="text-[var(--muted-foreground)]">
                                  {t("vsAvg")}:
                                </span>
                                <span
                                  className={`font-medium ${
                                    tooltip.diff > 0
                                      ? "text-green-600"
                                      : tooltip.diff < 0
                                      ? "text-red-600"
                                      : ""
                                  }`}
                                >
                                  {tooltip.diff > 0 ? "+" : ""}
                                  {(tooltip.diff * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            {/* Tooltip arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[var(--border)]" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    <div className="font-medium text-primary-600">
                      {(student.overall_score * 100).toFixed(0)}%
                    </div>
                  </td>
                </tr>
              ))}

              {/* Class Average Row */}
              <tr className="bg-[var(--muted)]/50 font-medium">
                <td className="p-2">{t("classAverage")}</td>
                {topics.map((topic) => {
                  const avg = avgMap.get(topic.id);
                  return (
                    <td key={topic.id} className="p-2 text-center text-xs">
                      {avg ? `${(avg.avg_score * 100).toFixed(0)}%` : "—"}
                    </td>
                  );
                })}
                <td className="p-2 text-center">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
