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
  MessageSquare,
  Image as ImageIcon,
  Video,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

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
  rate_limit_tier: "economy" | "standard" | "premium";
  capabilities: {
    images?: boolean;
    pdf?: boolean;
    code?: boolean;
  };
  system_role: string | null;
  display_order: number;
  co2_per_million_tokens: number;
}

interface ImageModel {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  price_standard: number;
  price_hd: number | null;
  sizes: string[];
  styles: string[];
  supports_hd: boolean;
  supports_reference_image: boolean;
  max_prompt_length: number;
  is_active: boolean;
  is_recommended: boolean;
}

interface VideoModel {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  price_per_second: number;
  price_per_second_premium: number | null;
  resolutions: string[];
  max_duration_seconds: number;
  default_duration_seconds: number;
  supports_audio: boolean;
  supports_reference_image: boolean;
  supports_reference_video: boolean;
  max_prompt_length: number;
  is_active: boolean;
  is_recommended: boolean;
  display_order: number;
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

type TabType = "chat" | "image" | "video";

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES = [
  { value: "premium", label: "Premium" },
  { value: "balanced", label: "Équilibré" },
  { value: "fast", label: "Rapide" },
  { value: "economy", label: "Économique" },
  { value: "code", label: "Code" },
];

const RATE_LIMIT_TIERS = [
  { value: "economy", label: "Économique (20/min)" },
  { value: "standard", label: "Standard (10/min)" },
  { value: "premium", label: "Premium (3/min)" },
];

const SYSTEM_ROLES = [
  { value: "", label: "Aucun" },
  { value: "default_chat", label: "Chat par défaut" },
  { value: "analytics", label: "Analytics" },
  { value: "economy_fallback", label: "Fallback économique" },
];

const PROVIDERS = ["Anthropic", "OpenAI", "Google", "Mistral"];
const IMAGE_PROVIDERS = ["openai", "google"];
const VIDEO_PROVIDERS = ["openai", "google"];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ModelsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  // Chat models state
  const [chatModels, setChatModels] = useState<AIModel[]>([]);
  const [chatLoading, setChatLoading] = useState(true);

  // Image models state
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [imageLoading, setImageLoading] = useState(true);

  // Video models state
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [videoLoading, setVideoLoading] = useState(true);

  // Common state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchChatModels = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_models")
      .select("*")
      .order("provider", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setError("Erreur lors du chargement des modèles chat");
    } else {
      setChatModels(data || []);
    }
    setChatLoading(false);
  };

  const fetchImageModels = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("image_models")
      .select("*")
      .order("provider", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setError("Erreur lors du chargement des modèles image");
    } else {
      setImageModels(data || []);
    }
    setImageLoading(false);
  };

  const fetchVideoModels = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("video_models")
      .select("*")
      .order("provider", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) {
      setError("Erreur lors du chargement des modèles vidéo");
    } else {
      setVideoModels(data || []);
    }
    setVideoLoading(false);
  };

  useEffect(() => {
    fetchChatModels();
    fetchImageModels();
    fetchVideoModels();
  }, []);

  // ============================================================================
  // COMMON HANDLERS
  // ============================================================================

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({});
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

  // ============================================================================
  // CHAT MODELS HANDLERS
  // ============================================================================

  const startEditingChat = (model: AIModel) => {
    setEditingId(model.id);
    setFormData({ ...model, newId: model.id });
    setIsAdding(false);
  };

  const startAddingChat = () => {
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
      rate_limit_tier: "standard",
      capabilities: { images: false, pdf: false, code: false },
      system_role: null,
      display_order: 100,
      co2_per_million_tokens: 0.5,
    });
  };

  const saveChatModel = async () => {
    const supabase = createClient();
    setError("");
    setSuccess("");

    const idToUse = isAdding ? formData.id : formData.newId;

    if (!idToUse || !formData.name || !formData.provider) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const modelData = {
      id: idToUse,
      name: formData.name,
      provider: formData.provider,
      input_price: formData.input_price,
      output_price: formData.output_price,
      description: formData.description,
      category: formData.category,
      is_recommended: formData.is_recommended,
      is_active: formData.is_active,
      max_tokens: formData.max_tokens,
      rate_limit_tier: formData.rate_limit_tier,
      capabilities: formData.capabilities,
      system_role: formData.system_role || null,
      display_order: formData.display_order,
      co2_per_million_tokens: formData.co2_per_million_tokens,
    };

    if (isAdding) {
      const { error } = await supabase.from("ai_models").insert([modelData]);
      if (error) {
        setError("Erreur lors de l'ajout: " + error.message);
        return;
      }
      setSuccess("Modèle ajouté avec succès");
    } else if (formData.newId !== editingId) {
      // ID changed - insert new, delete old
      const { error: insertError } = await supabase.from("ai_models").insert([modelData]);
      if (insertError) {
        setError("Erreur: " + insertError.message);
        return;
      }
      await supabase.from("ai_models").delete().eq("id", editingId);
      setSuccess("Modèle mis à jour avec succès");
    } else {
      const { error } = await supabase
        .from("ai_models")
        .update(modelData)
        .eq("id", editingId);
      if (error) {
        setError("Erreur: " + error.message);
        return;
      }
      setSuccess("Modèle mis à jour avec succès");
    }

    cancelEdit();
    fetchChatModels();
  };

  const deleteChatModel = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("ai_models").delete().eq("id", id);
    if (error) {
      setError("Erreur: " + error.message);
    } else {
      setSuccess("Modèle supprimé");
      fetchChatModels();
    }
  };

  const toggleChatActive = async (model: AIModel) => {
    const supabase = createClient();
    await supabase.from("ai_models").update({ is_active: !model.is_active }).eq("id", model.id);
    fetchChatModels();
  };

  const toggleChatRecommended = async (model: AIModel) => {
    const supabase = createClient();
    if (!model.is_recommended) {
      await supabase.from("ai_models").update({ is_recommended: false }).neq("id", "");
    }
    await supabase.from("ai_models").update({ is_recommended: !model.is_recommended }).eq("id", model.id);
    fetchChatModels();
  };

  // ============================================================================
  // IMAGE MODELS HANDLERS
  // ============================================================================

  const startEditingImage = (model: ImageModel) => {
    setEditingId(model.id);
    setFormData({ ...model, newId: model.id, sizes: model.sizes?.join(", ") || "", styles: model.styles?.join(", ") || "" });
    setIsAdding(false);
  };

  const startAddingImage = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      id: "",
      name: "",
      provider: "openai",
      description: "",
      price_standard: 0.04,
      price_hd: null,
      sizes: "1024x1024",
      styles: "natural",
      supports_hd: false,
      supports_reference_image: false,
      max_prompt_length: 4000,
      is_active: true,
      is_recommended: false,
    });
  };

  const saveImageModel = async () => {
    const supabase = createClient();
    setError("");
    setSuccess("");

    const idToUse = isAdding ? formData.id : formData.newId;
    if (!idToUse || !formData.name || !formData.provider) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const sizesArray = typeof formData.sizes === "string"
      ? formData.sizes.split(",").map((s: string) => s.trim()).filter(Boolean)
      : formData.sizes || [];
    const stylesArray = typeof formData.styles === "string"
      ? formData.styles.split(",").map((s: string) => s.trim()).filter(Boolean)
      : formData.styles || [];

    const modelData = {
      id: idToUse,
      name: formData.name,
      provider: formData.provider,
      description: formData.description || null,
      price_standard: parseFloat(String(formData.price_standard)) || 0,
      price_hd: formData.price_hd ? parseFloat(String(formData.price_hd)) : null,
      sizes: sizesArray,
      styles: stylesArray,
      supports_hd: Boolean(formData.supports_hd),
      supports_reference_image: Boolean(formData.supports_reference_image),
      max_prompt_length: parseInt(String(formData.max_prompt_length)) || 4000,
      is_active: Boolean(formData.is_active),
      is_recommended: Boolean(formData.is_recommended),
    };

    if (isAdding) {
      const { error } = await supabase.from("image_models").insert([modelData]);
      if (error) {
        setError("Erreur: " + error.message);
        return;
      }
      setSuccess("Modèle image ajouté");
    } else if (formData.newId !== editingId) {
      const { error: insertError } = await supabase.from("image_models").insert([modelData]);
      if (insertError) {
        setError("Erreur: " + insertError.message);
        return;
      }
      await supabase.from("image_models").delete().eq("id", editingId);
      setSuccess("Modèle image mis à jour");
    } else {
      const { error } = await supabase.from("image_models").update(modelData).eq("id", editingId);
      if (error) {
        setError("Erreur: " + error.message);
        return;
      }
      setSuccess("Modèle image mis à jour");
    }

    cancelEdit();
    fetchImageModels();
  };

  const deleteImageModel = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("image_models").delete().eq("id", id);
    if (error) {
      setError("Erreur: " + error.message);
    } else {
      setSuccess("Modèle supprimé");
      fetchImageModels();
    }
  };

  const toggleImageActive = async (model: ImageModel) => {
    const supabase = createClient();
    await supabase.from("image_models").update({ is_active: !model.is_active }).eq("id", model.id);
    fetchImageModels();
  };

  const toggleImageRecommended = async (model: ImageModel) => {
    const supabase = createClient();
    if (!model.is_recommended) {
      await supabase.from("image_models").update({ is_recommended: false }).neq("id", "");
    }
    await supabase.from("image_models").update({ is_recommended: !model.is_recommended }).eq("id", model.id);
    fetchImageModels();
  };

  // ============================================================================
  // VIDEO MODELS HANDLERS
  // ============================================================================

  const startEditingVideo = (model: VideoModel) => {
    setEditingId(model.id);
    setFormData({ ...model, newId: model.id, resolutions: model.resolutions?.join(", ") || "" });
    setIsAdding(false);
  };

  const startAddingVideo = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      id: "",
      name: "",
      provider: "openai",
      description: "",
      price_per_second: 0.10,
      price_per_second_premium: null,
      resolutions: "720p",
      max_duration_seconds: 10,
      default_duration_seconds: 5,
      supports_audio: true,
      supports_reference_image: true,
      supports_reference_video: false,
      max_prompt_length: 1000,
      is_active: true,
      is_recommended: false,
      display_order: 100,
    });
  };

  const saveVideoModel = async () => {
    const supabase = createClient();
    setError("");
    setSuccess("");

    const idToUse = isAdding ? formData.id : formData.newId;
    if (!idToUse || !formData.name || !formData.provider) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const resolutionsArray = typeof formData.resolutions === "string"
      ? formData.resolutions.split(",").map((s: string) => s.trim()).filter(Boolean)
      : formData.resolutions || [];

    const modelData = {
      id: idToUse,
      name: formData.name,
      provider: formData.provider,
      description: formData.description || null,
      price_per_second: parseFloat(String(formData.price_per_second)) || 0,
      price_per_second_premium: formData.price_per_second_premium ? parseFloat(String(formData.price_per_second_premium)) : null,
      resolutions: resolutionsArray,
      max_duration_seconds: parseInt(String(formData.max_duration_seconds)) || 10,
      default_duration_seconds: parseInt(String(formData.default_duration_seconds)) || 5,
      supports_audio: Boolean(formData.supports_audio),
      supports_reference_image: Boolean(formData.supports_reference_image),
      supports_reference_video: Boolean(formData.supports_reference_video),
      max_prompt_length: parseInt(String(formData.max_prompt_length)) || 1000,
      is_active: Boolean(formData.is_active),
      is_recommended: Boolean(formData.is_recommended),
      display_order: parseInt(String(formData.display_order)) || 100,
    };

    if (isAdding) {
      const { error } = await supabase.from("video_models").insert([modelData]);
      if (error) {
        setError("Erreur: " + error.message);
        return;
      }
      setSuccess("Modèle vidéo ajouté");
    } else if (formData.newId !== editingId) {
      const { error: insertError } = await supabase.from("video_models").insert([modelData]);
      if (insertError) {
        setError("Erreur: " + insertError.message);
        return;
      }
      await supabase.from("video_models").delete().eq("id", editingId);
      setSuccess("Modèle vidéo mis à jour");
    } else {
      const { error } = await supabase.from("video_models").update(modelData).eq("id", editingId);
      if (error) {
        setError("Erreur: " + error.message);
        return;
      }
      setSuccess("Modèle vidéo mis à jour");
    }

    cancelEdit();
    fetchVideoModels();
  };

  const deleteVideoModel = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("video_models").delete().eq("id", id);
    if (error) {
      setError("Erreur: " + error.message);
    } else {
      setSuccess("Modèle supprimé");
      fetchVideoModels();
    }
  };

  const toggleVideoActive = async (model: VideoModel) => {
    const supabase = createClient();
    await supabase.from("video_models").update({ is_active: !model.is_active }).eq("id", model.id);
    fetchVideoModels();
  };

  const toggleVideoRecommended = async (model: VideoModel) => {
    const supabase = createClient();
    if (!model.is_recommended) {
      await supabase.from("video_models").update({ is_recommended: false }).neq("id", "");
    }
    await supabase.from("video_models").update({ is_recommended: !model.is_recommended }).eq("id", model.id);
    fetchVideoModels();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const isLoading = activeTab === "chat" ? chatLoading : activeTab === "image" ? imageLoading : videoLoading;

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Modèles IA</h1>
          <p className="text-[var(--muted-foreground)]">
            Gérer les modèles disponibles et leurs tarifs
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "chat" && (
            <Button variant="outline" onClick={() => {
              const activeModels = chatModels.filter((m) => m.is_active);
              activeModels.forEach((m) => testModel(m.id));
            }} disabled={testingModel !== null}>
              <Play className="w-4 h-4 mr-2" />
              Tester tous
            </Button>
          )}
          <Button onClick={() => {
            if (activeTab === "chat") startAddingChat();
            else if (activeTab === "image") startAddingImage();
            else startAddingVideo();
          }} disabled={isAdding}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => { setActiveTab("chat"); cancelEdit(); }}
          className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors ${
            activeTab === "chat"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat ({chatModels.length})
        </button>
        <button
          onClick={() => { setActiveTab("image"); cancelEdit(); }}
          className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors ${
            activeTab === "image"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Image ({imageModels.length})
        </button>
        <button
          onClick={() => { setActiveTab("video"); cancelEdit(); }}
          className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors ${
            activeTab === "video"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <Video className="w-4 h-4" />
          Vidéo ({videoModels.length})
        </button>
      </div>

      {/* Messages */}
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

      {/* ========== CHAT MODELS TAB ========== */}
      {activeTab === "chat" && (
        <>
          {isAdding && (
            <Card>
              <CardHeader><h2 className="font-semibold">Nouveau modèle chat</h2></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input label="ID *" placeholder="claude-sonnet-4-20250514" value={String(formData.id || "")} onChange={(e) => setFormData({ ...formData, id: e.target.value })} />
                  <Input label="Nom *" placeholder="Claude Sonnet 4" value={String(formData.name || "")} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Provider *</label>
                    <select className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]" value={String(formData.provider || "Anthropic")} onChange={(e) => setFormData({ ...formData, provider: e.target.value })}>
                      {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <Input label="Prix input ($/1M)" type="number" step="0.01" value={String(formData.input_price || 0)} onChange={(e) => setFormData({ ...formData, input_price: parseFloat(e.target.value) })} />
                  <Input label="Prix output ($/1M)" type="number" step="0.01" value={String(formData.output_price || 0)} onChange={(e) => setFormData({ ...formData, output_price: parseFloat(e.target.value) })} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Catégorie</label>
                    <select className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]" value={String(formData.category || "balanced")} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <Input label="Description" value={String(formData.description || "")} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  <Input label="Max tokens" type="number" value={String(formData.max_tokens || 4096)} onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Rate Limit</label>
                    <select className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]" value={String(formData.rate_limit_tier || "standard")} onChange={(e) => setFormData({ ...formData, rate_limit_tier: e.target.value })}>
                      {RATE_LIMIT_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.is_active)} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
                      Actif
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.is_recommended)} onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })} className="w-4 h-4" />
                      Recommandé
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={saveChatModel}>Enregistrer</Button>
                  <Button variant="outline" onClick={cancelEdit}>Annuler</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {PROVIDERS.map((provider) => {
            const providerModels = chatModels.filter((m) => m.provider === provider);
            if (providerModels.length === 0) return null;

            return (
              <div key={provider} className="space-y-3">
                <h2 className="text-lg font-semibold">{provider}</h2>
                {providerModels.map((model) => {
                  const testResult = testResults[model.id];
                  const isTesting = testingModel === model.id;

                  return (
                    <Card key={model.id} className={!model.is_active ? "opacity-50" : ""}>
                      <CardContent className="py-4">
                        {editingId === model.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <Input label="ID *" value={String(formData.newId || "")} onChange={(e) => setFormData({ ...formData, newId: e.target.value })} className="font-mono text-sm" />
                              <Input label="Nom" value={String(formData.name || "")} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                              <Input label="Prix input" type="number" step="0.01" value={String(formData.input_price || 0)} onChange={(e) => setFormData({ ...formData, input_price: parseFloat(e.target.value) })} />
                              <Input label="Prix output" type="number" step="0.01" value={String(formData.output_price || 0)} onChange={(e) => setFormData({ ...formData, output_price: parseFloat(e.target.value) })} />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveChatModel}><Check className="w-4 h-4 mr-1" />Enregistrer</Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Annuler</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{model.name}</span>
                                {model.is_recommended && (
                                  <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center gap-1">
                                    <Star className="w-3 h-3" />Recommandé
                                  </span>
                                )}
                                {!model.is_active && (
                                  <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">Inactif</span>
                                )}
                                <span className="px-2 py-0.5 text-xs bg-[var(--muted)] rounded-full">
                                  {CATEGORIES.find((c) => c.value === model.category)?.label}
                                </span>
                                {testResult && (
                                  <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${testResult.success ? "bg-green-100 dark:bg-green-900/30 text-green-700" : "bg-red-100 dark:bg-red-900/30 text-red-700"}`}>
                                    {testResult.success ? <><CheckCircle className="w-3 h-3" />{testResult.responseTime}ms</> : <><AlertCircle className="w-3 h-3" />Erreur</>}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[var(--muted-foreground)] mt-1">{model.description}</p>
                              <p className="text-xs text-[var(--muted-foreground)] mt-1 font-mono">ID: {model.id}</p>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm"><span className="text-[var(--muted-foreground)]">In:</span> ${model.input_price}/1M</p>
                                <p className="text-sm"><span className="text-[var(--muted-foreground)]">Out:</span> ${model.output_price}/1M</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => testModel(model.id)} disabled={isTesting || !model.is_active} className="p-2 rounded-lg hover:bg-[var(--muted)] disabled:opacity-50" title="Tester">
                                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                </button>
                                <button onClick={() => toggleChatRecommended(model)} className={`p-2 rounded-lg ${model.is_recommended ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600" : "hover:bg-[var(--muted)]"}`} title="Recommandé">
                                  <Star className="w-4 h-4" />
                                </button>
                                <button onClick={() => toggleChatActive(model)} className={`p-2 rounded-lg ${model.is_active ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-gray-100 dark:bg-gray-800"}`} title={model.is_active ? "Désactiver" : "Activer"}>
                                  {model.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                </button>
                                <button onClick={() => startEditingChat(model)} className="p-2 rounded-lg hover:bg-[var(--muted)]" title="Modifier">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteChatModel(model.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600" title="Supprimer">
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
        </>
      )}

      {/* ========== IMAGE MODELS TAB ========== */}
      {activeTab === "image" && (
        <>
          {isAdding && (
            <Card>
              <CardHeader><h2 className="font-semibold">Nouveau modèle image</h2></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input label="ID *" placeholder="imagen-3" value={String(formData.id || "")} onChange={(e) => setFormData({ ...formData, id: e.target.value })} />
                  <Input label="Nom *" placeholder="Imagen 3" value={String(formData.name || "")} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Provider *</label>
                    <select className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]" value={String(formData.provider || "openai")} onChange={(e) => setFormData({ ...formData, provider: e.target.value })}>
                      {IMAGE_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <Input label="Prix standard ($)" type="number" step="0.01" value={String(formData.price_standard || 0)} onChange={(e) => setFormData({ ...formData, price_standard: parseFloat(e.target.value) })} />
                  <Input label="Prix HD ($)" type="number" step="0.01" value={String(formData.price_hd || "")} onChange={(e) => setFormData({ ...formData, price_hd: e.target.value ? parseFloat(e.target.value) : null })} />
                  <Input label="Tailles (comma-sep)" placeholder="1024x1024, 1536x1024" value={String(formData.sizes || "")} onChange={(e) => setFormData({ ...formData, sizes: e.target.value })} />
                  <Input label="Styles (comma-sep)" placeholder="natural, vivid" value={String(formData.styles || "")} onChange={(e) => setFormData({ ...formData, styles: e.target.value })} />
                  <Input label="Description" value={String(formData.description || "")} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.supports_hd)} onChange={(e) => setFormData({ ...formData, supports_hd: e.target.checked })} className="w-4 h-4" />
                      HD
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.supports_reference_image)} onChange={(e) => setFormData({ ...formData, supports_reference_image: e.target.checked })} className="w-4 h-4" />
                      Ref Image
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.is_active)} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
                      Actif
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.is_recommended)} onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })} className="w-4 h-4" />
                      Recommandé
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={saveImageModel}>Enregistrer</Button>
                  <Button variant="outline" onClick={cancelEdit}>Annuler</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {IMAGE_PROVIDERS.map((provider) => {
            const providerModels = imageModels.filter((m) => m.provider === provider);
            if (providerModels.length === 0) return null;

            return (
              <div key={provider} className="space-y-3">
                <h2 className="text-lg font-semibold capitalize">{provider}</h2>
                {providerModels.map((model) => (
                  <Card key={model.id} className={!model.is_active ? "opacity-50" : ""}>
                    <CardContent className="py-4">
                      {editingId === model.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input label="ID *" value={String(formData.newId || "")} onChange={(e) => setFormData({ ...formData, newId: e.target.value })} className="font-mono text-sm" />
                            <Input label="Nom" value={String(formData.name || "")} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            <Input label="Prix standard" type="number" step="0.01" value={String(formData.price_standard || 0)} onChange={(e) => setFormData({ ...formData, price_standard: parseFloat(e.target.value) })} />
                            <Input label="Prix HD" type="number" step="0.01" value={String(formData.price_hd || "")} onChange={(e) => setFormData({ ...formData, price_hd: e.target.value ? parseFloat(e.target.value) : null })} />
                            <Input label="Tailles" value={String(formData.sizes || "")} onChange={(e) => setFormData({ ...formData, sizes: e.target.value })} />
                            <Input label="Styles" value={String(formData.styles || "")} onChange={(e) => setFormData({ ...formData, styles: e.target.value })} />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={Boolean(formData.supports_hd)} onChange={(e) => setFormData({ ...formData, supports_hd: e.target.checked })} className="w-4 h-4" />
                              HD
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={Boolean(formData.supports_reference_image)} onChange={(e) => setFormData({ ...formData, supports_reference_image: e.target.checked })} className="w-4 h-4" />
                              Ref Image
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveImageModel}><Check className="w-4 h-4 mr-1" />Enregistrer</Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{model.name}</span>
                              {model.is_recommended && (
                                <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 rounded-full flex items-center gap-1">
                                  <Star className="w-3 h-3" />Recommandé
                                </span>
                              )}
                              {!model.is_active && <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full">Inactif</span>}
                              {model.supports_hd && <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 rounded-full">HD</span>}
                              {model.supports_reference_image && <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 rounded-full">Ref</span>}
                            </div>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">{model.description}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              <span className="font-mono">ID: {model.id}</span> | Tailles: {model.sizes?.join(", ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm"><span className="text-[var(--muted-foreground)]">Std:</span> ${model.price_standard}</p>
                              {model.price_hd && <p className="text-sm"><span className="text-[var(--muted-foreground)]">HD:</span> ${model.price_hd}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => toggleImageRecommended(model)} className={`p-2 rounded-lg ${model.is_recommended ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600" : "hover:bg-[var(--muted)]"}`}>
                                <Star className="w-4 h-4" />
                              </button>
                              <button onClick={() => toggleImageActive(model)} className={`p-2 rounded-lg ${model.is_active ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-gray-100 dark:bg-gray-800"}`}>
                                {model.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              </button>
                              <button onClick={() => startEditingImage(model)} className="p-2 rounded-lg hover:bg-[var(--muted)]">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteImageModel(model.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </>
      )}

      {/* ========== VIDEO MODELS TAB ========== */}
      {activeTab === "video" && (
        <>
          {isAdding && (
            <Card>
              <CardHeader><h2 className="font-semibold">Nouveau modèle vidéo</h2></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input label="ID *" placeholder="sora-2" value={String(formData.id || "")} onChange={(e) => setFormData({ ...formData, id: e.target.value })} />
                  <Input label="Nom *" placeholder="Sora 2" value={String(formData.name || "")} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Provider *</label>
                    <select className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]" value={String(formData.provider || "openai")} onChange={(e) => setFormData({ ...formData, provider: e.target.value })}>
                      {VIDEO_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <Input label="Prix/sec standard ($)" type="number" step="0.01" value={String(formData.price_per_second || 0)} onChange={(e) => setFormData({ ...formData, price_per_second: parseFloat(e.target.value) })} />
                  <Input label="Prix/sec premium ($)" type="number" step="0.01" value={String(formData.price_per_second_premium || "")} onChange={(e) => setFormData({ ...formData, price_per_second_premium: e.target.value ? parseFloat(e.target.value) : null })} />
                  <Input label="Résolutions (comma-sep)" placeholder="720p, 1080p" value={String(formData.resolutions || "")} onChange={(e) => setFormData({ ...formData, resolutions: e.target.value })} />
                  <Input label="Durée max (sec)" type="number" value={String(formData.max_duration_seconds || 10)} onChange={(e) => setFormData({ ...formData, max_duration_seconds: parseInt(e.target.value) })} />
                  <Input label="Durée défaut (sec)" type="number" value={String(formData.default_duration_seconds || 5)} onChange={(e) => setFormData({ ...formData, default_duration_seconds: parseInt(e.target.value) })} />
                  <Input label="Description" value={String(formData.description || "")} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  <div className="flex items-center gap-4 pt-6 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.supports_audio)} onChange={(e) => setFormData({ ...formData, supports_audio: e.target.checked })} className="w-4 h-4" />
                      Audio
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.supports_reference_image)} onChange={(e) => setFormData({ ...formData, supports_reference_image: e.target.checked })} className="w-4 h-4" />
                      Ref Image
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.is_active)} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
                      Actif
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={Boolean(formData.is_recommended)} onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })} className="w-4 h-4" />
                      Recommandé
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={saveVideoModel}>Enregistrer</Button>
                  <Button variant="outline" onClick={cancelEdit}>Annuler</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {VIDEO_PROVIDERS.map((provider) => {
            const providerModels = videoModels.filter((m) => m.provider === provider);
            if (providerModels.length === 0) return null;

            return (
              <div key={provider} className="space-y-3">
                <h2 className="text-lg font-semibold capitalize">{provider}</h2>
                {providerModels.map((model) => (
                  <Card key={model.id} className={!model.is_active ? "opacity-50" : ""}>
                    <CardContent className="py-4">
                      {editingId === model.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input label="ID *" value={String(formData.newId || "")} onChange={(e) => setFormData({ ...formData, newId: e.target.value })} className="font-mono text-sm" />
                            <Input label="Nom" value={String(formData.name || "")} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            <Input label="Prix/sec std" type="number" step="0.01" value={String(formData.price_per_second || 0)} onChange={(e) => setFormData({ ...formData, price_per_second: parseFloat(e.target.value) })} />
                            <Input label="Prix/sec prem" type="number" step="0.01" value={String(formData.price_per_second_premium || "")} onChange={(e) => setFormData({ ...formData, price_per_second_premium: e.target.value ? parseFloat(e.target.value) : null })} />
                            <Input label="Résolutions" value={String(formData.resolutions || "")} onChange={(e) => setFormData({ ...formData, resolutions: e.target.value })} />
                            <Input label="Durée max" type="number" value={String(formData.max_duration_seconds || 10)} onChange={(e) => setFormData({ ...formData, max_duration_seconds: parseInt(e.target.value) })} />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={Boolean(formData.supports_audio)} onChange={(e) => setFormData({ ...formData, supports_audio: e.target.checked })} className="w-4 h-4" />
                              Audio
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" checked={Boolean(formData.supports_reference_image)} onChange={(e) => setFormData({ ...formData, supports_reference_image: e.target.checked })} className="w-4 h-4" />
                              Ref Image
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveVideoModel}><Check className="w-4 h-4 mr-1" />Enregistrer</Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{model.name}</span>
                              {model.is_recommended && (
                                <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 rounded-full flex items-center gap-1">
                                  <Star className="w-3 h-3" />Recommandé
                                </span>
                              )}
                              {!model.is_active && <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full">Inactif</span>}
                              {model.supports_audio && <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 rounded-full">Audio</span>}
                              {model.supports_reference_image && <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 rounded-full">Ref</span>}
                            </div>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">{model.description}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              <span className="font-mono">ID: {model.id}</span> | Max: {model.max_duration_seconds}s | Résolutions: {model.resolutions?.join(", ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm"><span className="text-[var(--muted-foreground)]">Std:</span> ${model.price_per_second}/s</p>
                              {model.price_per_second_premium && <p className="text-sm"><span className="text-[var(--muted-foreground)]">Prem:</span> ${model.price_per_second_premium}/s</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => toggleVideoRecommended(model)} className={`p-2 rounded-lg ${model.is_recommended ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600" : "hover:bg-[var(--muted)]"}`}>
                                <Star className="w-4 h-4" />
                              </button>
                              <button onClick={() => toggleVideoActive(model)} className={`p-2 rounded-lg ${model.is_active ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-gray-100 dark:bg-gray-800"}`}>
                                {model.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              </button>
                              <button onClick={() => startEditingVideo(model)} className="p-2 rounded-lg hover:bg-[var(--muted)]">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteVideoModel(model.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
