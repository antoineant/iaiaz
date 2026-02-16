"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Save, RefreshCw, MessageSquare, FileText, Zap, Users } from "lucide-react";

interface AppSetting {
  id: string;
  key: string;
  value: { percentage?: number; amount?: number; model_id?: string };
  description: string;
  updated_at: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  input_price: number;
  output_price: number;
  is_recommended: boolean;
  category: string;
}

// Use case definitions (in tokens)
const USE_CASES = {
  simpleQuestion: {
    name: "Question simple",
    description: "Une question courte avec réponse directe",
    inputTokens: 150,
    outputTokens: 300,
    icon: MessageSquare,
  },
  complexQuestion: {
    name: "Question complexe",
    description: "Explication détaillée, code, analyse",
    inputTokens: 500,
    outputTokens: 1000,
    icon: MessageSquare,
  },
  dissertation: {
    name: "Dissertation",
    description: "Texte long structuré (intro, développement, conclusion)",
    inputTokens: 800,
    outputTokens: 3000,
    icon: FileText,
  },
  codeReview: {
    name: "Revue de code",
    description: "Analyse et suggestions sur du code",
    inputTokens: 1500,
    outputTokens: 1000,
    icon: Zap,
  },
};

function calculateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number,
  markupPercent: number
): number {
  const baseCost =
    (inputTokens * model.input_price + outputTokens * model.output_price) / 1_000_000;
  return baseCost * (1 + markupPercent / 100);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form values
  const [markup, setMarkup] = useState(50);
  const [familiaMarkup, setFamiliaMarkup] = useState(0);
  const [freeCredits, setFreeCredits] = useState(1.0);
  const [minBalanceWarning, setMinBalanceWarning] = useState(0.5);

  // Model role selections
  const [defaultChatModel, setDefaultChatModel] = useState("");
  const [analyticsModel, setAnalyticsModel] = useState("");
  const [economyModel, setEconomyModel] = useState("");
  const [courseStructureModel, setCourseStructureModel] = useState("");

  const fetchData = async () => {
    const supabase = createClient();

    // Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("app_settings")
      .select("*")
      .order("key");

    if (settingsError) {
      setError("Erreur lors du chargement des paramètres");
    } else {
      setSettings(settingsData || []);
      settingsData?.forEach((setting) => {
        if (setting.key === "markup" && setting.value.percentage) {
          setMarkup(setting.value.percentage);
        }
        if (setting.key === "familia_markup" && setting.value.percentage !== undefined) {
          setFamiliaMarkup(setting.value.percentage);
        }
        if (setting.key === "free_credits" && setting.value.amount) {
          setFreeCredits(setting.value.amount);
        }
        if (setting.key === "min_balance_warning" && setting.value.amount) {
          setMinBalanceWarning(setting.value.amount);
        }
        if (setting.key === "default_chat_model" && setting.value.model_id) {
          setDefaultChatModel(setting.value.model_id);
        }
        if (setting.key === "analytics_model" && setting.value.model_id) {
          setAnalyticsModel(setting.value.model_id);
        }
        if (setting.key === "economy_model" && setting.value.model_id) {
          setEconomyModel(setting.value.model_id);
        }
        if (setting.key === "course_structure_model" && setting.value.model_id) {
          setCourseStructureModel(setting.value.model_id);
        }
      });
    }

    // Fetch models
    const { data: modelsData, error: modelsError } = await supabase
      .from("ai_models")
      .select("id, name, provider, input_price, output_price, is_recommended, category")
      .eq("is_active", true)
      .order("provider")
      .order("name");

    if (!modelsError && modelsData) {
      setModels(modelsData);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveSetting = async (key: string, value: object, description?: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from("app_settings")
      .upsert({
        key,
        value,
        description: description || key,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }, { onConflict: "key" });

    return error;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      let err = await saveSetting("markup", { percentage: markup });
      if (err) throw new Error("Erreur lors de la sauvegarde du markup");

      err = await saveSetting("familia_markup", { percentage: familiaMarkup });
      if (err) throw new Error("Erreur lors de la sauvegarde du markup Familia");

      err = await saveSetting("free_credits", { amount: freeCredits });
      if (err) throw new Error("Erreur lors de la sauvegarde des crédits gratuits");

      err = await saveSetting("min_balance_warning", { amount: minBalanceWarning });
      if (err) throw new Error("Erreur lors de la sauvegarde du seuil d'alerte");

      // Save model role settings and sync to ai_models.system_role
      const supabase = createClient();

      // Clear existing system_role assignments for roles we're updating
      await supabase
        .from("ai_models")
        .update({ system_role: null })
        .in("system_role", ["default_chat", "analytics", "economy_fallback"]);

      if (defaultChatModel) {
        err = await saveSetting("default_chat_model", { model_id: defaultChatModel });
        if (err) throw new Error("Erreur lors de la sauvegarde du modèle par défaut");
        // Sync to ai_models
        await supabase
          .from("ai_models")
          .update({ system_role: "default_chat" })
          .eq("id", defaultChatModel);
      }

      if (analyticsModel) {
        err = await saveSetting("analytics_model", { model_id: analyticsModel });
        if (err) throw new Error("Erreur lors de la sauvegarde du modèle analytics");
        // Sync to ai_models
        await supabase
          .from("ai_models")
          .update({ system_role: "analytics" })
          .eq("id", analyticsModel);
      }

      if (economyModel) {
        err = await saveSetting("economy_model", { model_id: economyModel });
        if (err) throw new Error("Erreur lors de la sauvegarde du modèle économique");
        // Sync to ai_models
        await supabase
          .from("ai_models")
          .update({ system_role: "economy_fallback" })
          .eq("id", economyModel);
      }

      // Always save course_structure_model (even if empty to clear it)
      err = await saveSetting(
        "course_structure_model",
        { model_id: courseStructureModel },
        "Model for AI course structure generation"
      );
      if (err) throw new Error("Erreur lors de la sauvegarde du modèle structure de cours");

      // Invalidate server-side model cache by calling the API
      await fetch("/api/admin/invalidate-cache", { method: "POST" }).catch(() => {});

      setSuccess("Paramètres sauvegardés avec succès");
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }

    setIsSaving(false);
  };

  // Get key models for pricing display
  const recommendedModel = models.find((m) => m.is_recommended);
  const cheapestModel = models.reduce(
    (min, m) => (!min || m.input_price + m.output_price < min.input_price + min.output_price ? m : min),
    null as AIModel | null
  );
  const premiumModel = models.find((m) => m.category === "premium");

  // Calculate costs for use cases
  const getUseCaseCosts = (model: AIModel | null) => {
    if (!model) return null;
    return {
      simpleQuestion: calculateCost(
        model,
        USE_CASES.simpleQuestion.inputTokens,
        USE_CASES.simpleQuestion.outputTokens,
        markup
      ),
      complexQuestion: calculateCost(
        model,
        USE_CASES.complexQuestion.inputTokens,
        USE_CASES.complexQuestion.outputTokens,
        markup
      ),
      dissertation: calculateCost(
        model,
        USE_CASES.dissertation.inputTokens,
        USE_CASES.dissertation.outputTokens,
        markup
      ),
      codeReview: calculateCost(
        model,
        USE_CASES.codeReview.inputTokens,
        USE_CASES.codeReview.outputTokens,
        markup
      ),
    };
  };

  const recommendedCosts = getUseCaseCosts(recommendedModel || null);
  const cheapestCosts = getUseCaseCosts(cheapestModel);
  const premiumCosts = getUseCaseCosts(premiumModel || null);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--muted)] rounded w-48"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-[var(--muted)] rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-[var(--muted-foreground)]">
            Configurer les paramètres de la plateforme
          </p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder
        </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Markup */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Markup sur les prix API</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Pourcentage ajouté aux coûts API pour générer du profit
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Pourcentage de markup
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={markup}
                  onChange={(e) => setMarkup(parseInt(e.target.value))}
                  className="flex-1"
                />
                <Input
                  type="number"
                  className="w-24"
                  value={markup}
                  onChange={(e) => setMarkup(parseInt(e.target.value) || 0)}
                />
                <span className="text-lg font-bold">%</span>
              </div>
            </div>

            {recommendedModel && recommendedCosts && (
              <div className="p-4 bg-[var(--muted)] rounded-lg">
                <h3 className="font-medium mb-2">
                  Exemple avec {recommendedModel.name}
                </h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(USE_CASES).map(([key, useCase]) => {
                    const cost = recommendedCosts[key as keyof typeof recommendedCosts];
                    return (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-[var(--muted-foreground)]">
                          {useCase.name}:
                        </span>
                        <span className="font-medium">{cost.toFixed(4)} €</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Familia Markup */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Markup Familia
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Markup appliqué aux utilisateurs Familia (enfants & parents)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Pourcentage de markup Familia
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={familiaMarkup}
                  onChange={(e) => setFamiliaMarkup(parseInt(e.target.value))}
                  className="flex-1"
                />
                <Input
                  type="number"
                  className="w-24"
                  value={familiaMarkup}
                  onChange={(e) => setFamiliaMarkup(parseInt(e.target.value) || 0)}
                />
                <span className="text-lg font-bold">%</span>
              </div>
            </div>

            {familiaMarkup === 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                Les crédits Familia sont facturés au prix API (aucun markup)
              </div>
            )}

            {recommendedModel && (
              <div className="p-4 bg-[var(--muted)] rounded-lg">
                <h3 className="font-medium mb-2">
                  Exemple avec {recommendedModel.name} (Familia)
                </h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(USE_CASES).map(([key, useCase]) => {
                    const cost = calculateCost(
                      recommendedModel,
                      useCase.inputTokens,
                      useCase.outputTokens,
                      familiaMarkup
                    );
                    return (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-[var(--muted-foreground)]">
                          {useCase.name}:
                        </span>
                        <span className="font-medium">{cost.toFixed(4)} €</span>
                      </div>
                    );
                  })}
                </div>
                {recommendedModel && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-3">
                    5€ = ~{Math.floor(5 / calculateCost(recommendedModel, USE_CASES.simpleQuestion.inputTokens, USE_CASES.simpleQuestion.outputTokens, familiaMarkup))} questions simples
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Free Credits with dynamic calculations */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Crédits gratuits</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Montant offert aux nouveaux utilisateurs à l'inscription
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Montant en euros
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={freeCredits}
                  onChange={(e) => setFreeCredits(parseFloat(e.target.value) || 0)}
                />
                <span className="text-lg font-bold">€</span>
              </div>
            </div>

            <div className="p-4 bg-[var(--muted)] rounded-lg space-y-4">
              <h3 className="font-medium">
                Impact avec {freeCredits.toFixed(2)} € de crédits
              </h3>

              {/* Recommended model */}
              {recommendedModel && recommendedCosts && (
                <div>
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    {recommendedModel.name} (Recommandé)
                  </p>
                  <ul className="mt-1 text-sm space-y-1 text-[var(--muted-foreground)]">
                    <li>
                      • ~{Math.floor(freeCredits / recommendedCosts.simpleQuestion)} questions simples
                    </li>
                    <li>
                      • ~{Math.floor(freeCredits / recommendedCosts.complexQuestion)} questions complexes
                    </li>
                    <li>
                      • ~{Math.floor(freeCredits / recommendedCosts.dissertation)} dissertations
                    </li>
                  </ul>
                </div>
              )}

              {/* Cheapest model */}
              {cheapestModel && cheapestCosts && cheapestModel.id !== recommendedModel?.id && (
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {cheapestModel.name} (Le moins cher)
                  </p>
                  <ul className="mt-1 text-sm space-y-1 text-[var(--muted-foreground)]">
                    <li>
                      • ~{Math.floor(freeCredits / cheapestCosts.simpleQuestion)} questions simples
                    </li>
                    <li>
                      • ~{Math.floor(freeCredits / cheapestCosts.complexQuestion)} questions complexes
                    </li>
                    <li>
                      • ~{Math.floor(freeCredits / cheapestCosts.dissertation)} dissertations
                    </li>
                  </ul>
                </div>
              )}

              {/* Premium model */}
              {premiumModel && premiumCosts && (
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {premiumModel.name} (Premium)
                  </p>
                  <ul className="mt-1 text-sm space-y-1 text-[var(--muted-foreground)]">
                    <li>
                      • ~{Math.floor(freeCredits / premiumCosts.simpleQuestion)} questions simples
                    </li>
                    <li>
                      • ~{Math.floor(freeCredits / premiumCosts.complexQuestion)} questions complexes
                    </li>
                    <li>
                      • ~{Math.floor(freeCredits / premiumCosts.dissertation)} dissertations
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold">Grille tarifaire actuelle</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Prix par cas d'usage avec le markup de {markup}%
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 font-medium">Modèle</th>
                    <th className="text-right py-2 font-medium">Question simple</th>
                    <th className="text-right py-2 font-medium">Question complexe</th>
                    <th className="text-right py-2 font-medium">Dissertation</th>
                    <th className="text-right py-2 font-medium">Revue de code</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => {
                    const costs = getUseCaseCosts(model);
                    if (!costs) return null;
                    return (
                      <tr
                        key={model.id}
                        className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50"
                      >
                        <td className="py-2">
                          <span className="font-medium">{model.name}</span>
                          {model.is_recommended && (
                            <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded">
                              Recommandé
                            </span>
                          )}
                          <span className="block text-xs text-[var(--muted-foreground)]">
                            {model.provider}
                          </span>
                        </td>
                        <td className="text-right py-2 font-mono">
                          {costs.simpleQuestion.toFixed(4)} €
                        </td>
                        <td className="text-right py-2 font-mono">
                          {costs.complexQuestion.toFixed(4)} €
                        </td>
                        <td className="text-right py-2 font-mono">
                          {costs.dissertation.toFixed(4)} €
                        </td>
                        <td className="text-right py-2 font-mono">
                          {costs.codeReview.toFixed(4)} €
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-4">
              * Estimations basées sur: Question simple (~150 tokens in, ~300 out),
              Question complexe (~500 in, ~1000 out),
              Dissertation (~800 in, ~3000 out),
              Revue de code (~1500 in, ~1000 out)
            </p>
          </CardContent>
        </Card>

        {/* Min Balance Warning */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Alerte solde bas</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Seuil en dessous duquel l'utilisateur voit une alerte
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Seuil d'alerte en euros
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={minBalanceWarning}
                  onChange={(e) =>
                    setMinBalanceWarning(parseFloat(e.target.value) || 0)
                  }
                />
                <span className="text-lg font-bold">€</span>
              </div>
            </div>

            {recommendedCosts && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Avec {minBalanceWarning.toFixed(2)} €, l'utilisateur peut encore faire
                  environ <strong>{Math.floor(minBalanceWarning / recommendedCosts.simpleQuestion)}</strong> questions
                  simples avant épuisement.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Roles Configuration */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Configuration des modèles</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Définir quel modèle utiliser pour chaque fonction
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Modèle par défaut (Chat)
              </label>
              <select
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                value={defaultChatModel}
                onChange={(e) => setDefaultChatModel(e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Modèle sélectionné par défaut pour les nouvelles conversations
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Modèle Analytics
              </label>
              <select
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                value={analyticsModel}
                onChange={(e) => setAnalyticsModel(e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Modèle utilisé pour générer les insights des classes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Modèle économique (fallback)
              </label>
              <select
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                value={economyModel}
                onChange={(e) => setEconomyModel(e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Modèle utilisé pour les tâches de fond (économique)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Modèle génération structure de cours
              </label>
              <select
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                value={courseStructureModel}
                onChange={(e) => setCourseStructureModel(e.target.value)}
              >
                <option value="">-- Utiliser modèle économique --</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Modèle utilisé pour générer les objectifs et thèmes de cours via IA
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Raw settings info */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Valeurs en base</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.map((setting) => (
              <div
                key={setting.key}
                className="flex justify-between text-sm py-2 border-b border-[var(--border)] last:border-0"
              >
                <div>
                  <span className="font-medium">{setting.key}</span>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {setting.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs">
                    {JSON.stringify(setting.value)}
                  </span>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(setting.updated_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}

            <button
              onClick={fetchData}
              className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
