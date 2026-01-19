"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Star,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface AIModel {
  id: string;
  name: string;
  provider: string;
  input_price: number;
  output_price: number;
  description: string;
  category: string;
  is_recommended: boolean;
  is_active: boolean;
  max_tokens: number;
}

interface TestResult {
  modelId: string;
  success: boolean;
  responseTime?: number;
  tokensInput?: number;
  tokensOutput?: number;
  response?: string;
  error?: string;
}

const CATEGORIES = [
  { value: "premium", label: "Premium" },
  { value: "balanced", label: "Équilibré" },
  { value: "fast", label: "Rapide" },
  { value: "economy", label: "Économique" },
  { value: "code", label: "Code" },
];

const PROVIDERS = ["Anthropic", "OpenAI", "Google", "Mistral"];

export default function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<AIModel> & { newId?: string }>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const fetchModels = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_models")
      .select("*")
      .order("provider", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setError("Erreur lors du chargement des modèles");
    } else {
      setModels(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const startEditing = (model: AIModel) => {
    setEditingId(model.id);
    setFormData({ ...model, newId: model.id });
    setIsAdding(false);
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      id: "",
      newId: "",
      name: "",
      provider: "Anthropic",
      input_price: 0,
      output_price: 0,
      description: "",
      category: "balanced",
      is_recommended: false,
      is_active: true,
      max_tokens: 4096,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({});
  };

  const saveModel = async () => {
    const supabase = createClient();
    setError("");
    setSuccess("");

    const idToUse = isAdding ? formData.id : formData.newId;

    if (!idToUse || !formData.name || !formData.provider) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (isAdding) {
      const { error } = await supabase.from("ai_models").insert([
        {
          id: formData.id,
          name: formData.name,
          provider: formData.provider,
          input_price: formData.input_price,
          output_price: formData.output_price,
          description: formData.description,
          category: formData.category,
          is_recommended: formData.is_recommended,
          is_active: formData.is_active,
          max_tokens: formData.max_tokens,
        },
      ]);

      if (error) {
        setError("Erreur lors de l'ajout du modèle: " + error.message);
        return;
      }
      setSuccess("Modèle ajouté avec succès");
    } else {
      // Check if ID is being changed
      if (formData.newId && formData.newId !== editingId) {
        // Need to delete old and insert new (ID is primary key)
        const { error: insertError } = await supabase.from("ai_models").insert([
          {
            id: formData.newId,
            name: formData.name,
            provider: formData.provider,
            input_price: formData.input_price,
            output_price: formData.output_price,
            description: formData.description,
            category: formData.category,
            is_recommended: formData.is_recommended,
            is_active: formData.is_active,
            max_tokens: formData.max_tokens,
          },
        ]);

        if (insertError) {
          setError("Erreur lors de la mise à jour de l'ID: " + insertError.message);
          return;
        }

        const { error: deleteError } = await supabase
          .from("ai_models")
          .delete()
          .eq("id", editingId);

        if (deleteError) {
          setError("Erreur lors de la suppression de l'ancien modèle: " + deleteError.message);
          return;
        }

        setSuccess("Modèle mis à jour avec succès (ID modifié)");
      } else {
        const { error } = await supabase
          .from("ai_models")
          .update({
            name: formData.name,
            provider: formData.provider,
            input_price: formData.input_price,
            output_price: formData.output_price,
            description: formData.description,
            category: formData.category,
            is_recommended: formData.is_recommended,
            is_active: formData.is_active,
            max_tokens: formData.max_tokens,
          })
          .eq("id", editingId);

        if (error) {
          setError("Erreur lors de la mise à jour: " + error.message);
          return;
        }
        setSuccess("Modèle mis à jour avec succès");
      }
    }

    cancelEdit();
    fetchModels();
  };

  const deleteModel = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("ai_models").delete().eq("id", id);

    if (error) {
      setError("Erreur lors de la suppression: " + error.message);
    } else {
      setSuccess("Modèle supprimé");
      fetchModels();
    }
  };

  const toggleActive = async (model: AIModel) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("ai_models")
      .update({ is_active: !model.is_active })
      .eq("id", model.id);

    if (error) {
      setError("Erreur lors de la mise à jour");
    } else {
      fetchModels();
    }
  };

  const toggleRecommended = async (model: AIModel) => {
    const supabase = createClient();

    // First, remove recommended from all models
    if (!model.is_recommended) {
      await supabase.from("ai_models").update({ is_recommended: false }).neq("id", "");
    }

    // Then set this one as recommended (or toggle off)
    const { error } = await supabase
      .from("ai_models")
      .update({ is_recommended: !model.is_recommended })
      .eq("id", model.id);

    if (error) {
      setError("Erreur lors de la mise à jour");
    } else {
      fetchModels();
    }
  };

  const testModel = async (modelId: string) => {
    setTestingModel(modelId);
    setTestResults((prev) => ({
      ...prev,
      [modelId]: { modelId, success: false },
    }));

    try {
      const response = await fetch("/api/admin/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
      });

      const data = await response.json();

      setTestResults((prev) => ({
        ...prev,
        [modelId]: {
          modelId,
          success: data.success,
          responseTime: data.responseTime,
          tokensInput: data.tokensInput,
          tokensOutput: data.tokensOutput,
          response: data.response,
          error: data.error,
        },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [modelId]: {
          modelId,
          success: false,
          error: err instanceof Error ? err.message : "Test failed",
        },
      }));
    } finally {
      setTestingModel(null);
    }
  };

  const testAllModels = async () => {
    const activeModels = models.filter((m) => m.is_active);
    for (const model of activeModels) {
      await testModel(model.id);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--muted)] rounded w-48"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-[var(--muted)] rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Modèles IA</h1>
          <p className="text-[var(--muted-foreground)]">
            Gérer les modèles disponibles et leurs tarifs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={testAllModels} disabled={testingModel !== null}>
            <Play className="w-4 h-4 mr-2" />
            Tester tous
          </Button>
          <Button onClick={startAdding} disabled={isAdding}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un modèle
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Add form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Nouveau modèle</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="ID du modèle *"
                placeholder="claude-sonnet-4-20250514"
                value={formData.id || ""}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              />
              <Input
                label="Nom *"
                placeholder="Claude Sonnet 4"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium mb-1.5">Provider *</label>
                <select
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                  value={formData.provider || "Anthropic"}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Prix input ($/1M tokens)"
                type="number"
                step="0.01"
                value={formData.input_price || 0}
                onChange={(e) =>
                  setFormData({ ...formData, input_price: parseFloat(e.target.value) })
                }
              />
              <Input
                label="Prix output ($/1M tokens)"
                type="number"
                step="0.01"
                value={formData.output_price || 0}
                onChange={(e) =>
                  setFormData({ ...formData, output_price: parseFloat(e.target.value) })
                }
              />
              <div>
                <label className="block text-sm font-medium mb-1.5">Catégorie</label>
                <select
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                  value={formData.category || "balanced"}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Description"
                placeholder="Description du modèle"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Input
                label="Max tokens"
                type="number"
                value={formData.max_tokens || 4096}
                onChange={(e) =>
                  setFormData({ ...formData, max_tokens: parseInt(e.target.value) })
                }
              />
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active || false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Actif
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_recommended || false}
                    onChange={(e) =>
                      setFormData({ ...formData, is_recommended: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  Recommandé
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={saveModel}>Enregistrer</Button>
              <Button variant="outline" onClick={cancelEdit}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Models list by provider */}
      {PROVIDERS.map((provider) => {
        const providerModels = models.filter((m) => m.provider === provider);
        if (providerModels.length === 0) return null;

        return (
          <div key={provider} className="space-y-3">
            <h2 className="text-lg font-semibold">{provider}</h2>
            {providerModels.map((model) => {
              const testResult = testResults[model.id];
              const isTesting = testingModel === model.id;

              return (
                <Card
                  key={model.id}
                  className={!model.is_active ? "opacity-50" : ""}
                >
                  <CardContent className="py-4">
                    {editingId === model.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Input
                            label="ID du modèle *"
                            value={formData.newId || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, newId: e.target.value })
                            }
                            className="font-mono text-sm"
                          />
                          <Input
                            label="Nom"
                            value={formData.name || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                          />
                          <Input
                            label="Prix input"
                            type="number"
                            step="0.01"
                            value={formData.input_price || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                input_price: parseFloat(e.target.value),
                              })
                            }
                          />
                          <Input
                            label="Prix output"
                            type="number"
                            step="0.01"
                            value={formData.output_price || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                output_price: parseFloat(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveModel}>
                            <Check className="w-4 h-4 mr-1" />
                            Enregistrer
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="w-4 h-4 mr-1" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name}</span>
                            {model.is_recommended && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Recommandé
                              </span>
                            )}
                            {!model.is_active && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                                Inactif
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-xs bg-[var(--muted)] rounded-full">
                              {CATEGORIES.find((c) => c.value === model.category)?.label}
                            </span>
                            {/* Test status indicator */}
                            {testResult && (
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${
                                  testResult.success
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                }`}
                              >
                                {testResult.success ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    {testResult.responseTime}ms
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3" />
                                    Erreur
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            {model.description}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1 font-mono">
                            ID: {model.id}
                          </p>
                          {/* Test error message */}
                          {testResult && !testResult.success && testResult.error && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Erreur: {testResult.error}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm">
                              <span className="text-[var(--muted-foreground)]">Input:</span>{" "}
                              <span className="font-medium">${model.input_price}/1M</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-[var(--muted-foreground)]">Output:</span>{" "}
                              <span className="font-medium">${model.output_price}/1M</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Test button */}
                            <button
                              onClick={() => testModel(model.id)}
                              disabled={isTesting || !model.is_active}
                              className={`p-2 rounded-lg transition-colors ${
                                isTesting
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                                  : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                              } disabled:opacity-50`}
                              title="Tester le modèle"
                            >
                              {isTesting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => toggleRecommended(model)}
                              className={`p-2 rounded-lg transition-colors ${
                                model.is_recommended
                                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"
                                  : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                              }`}
                              title="Recommandé"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleActive(model)}
                              className={`p-2 rounded-lg transition-colors ${
                                model.is_active
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                              }`}
                              title={model.is_active ? "Désactiver" : "Activer"}
                            >
                              {model.is_active ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => startEditing(model)}
                              className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteModel(model.id)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted-foreground)] hover:text-red-600"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
