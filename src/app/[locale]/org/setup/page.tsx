"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Loader2, ArrowRight } from "lucide-react";

type OrgType = "school" | "university" | "business_school" | "training_center";

export default function OrgSetupPage() {
  const t = useTranslations("org.setup");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("school");
  const [contactEmail, setContactEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  useEffect(() => {
    const loadOrgData = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/org/setup");
        return;
      }

      // Get user's organization
      const { data: orgMember } = await supabase.rpc("get_user_organization", {
        p_user_id: user.id,
      });

      if (!orgMember || orgMember.length === 0) {
        // No org found - redirect to chat
        router.push("/chat");
        return;
      }

      const member = orgMember[0];

      // Only owners can setup org
      if (member.role !== "owner") {
        router.push("/org");
        return;
      }

      setOrganizationId(member.organization_id);

      // Get existing org data
      const { data: org } = await supabase
        .from("organizations")
        .select("name, type, settings")
        .eq("id", member.organization_id)
        .single();

      if (org) {
        setName(org.name || "");
        setOrgType((org.type as OrgType) || "school");
        if (org.settings) {
          const settings = org.settings as { contact_email?: string; billing_email?: string };
          setContactEmail(settings.contact_email || "");
          setBillingEmail(settings.billing_email || "");
        }
      }

      // Pre-fill contact email with user email
      if (!contactEmail) {
        setContactEmail(user.email || "");
      }

      setIsLoading(false);
    };

    loadOrgData();
  }, [router]);

  const handleSave = async () => {
    if (!organizationId || !name.trim()) return;

    setIsSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("organizations")
        .update({
          name: name.trim(),
          type: orgType,
          settings: {
            contact_email: contactEmail.trim() || null,
            billing_email: billingEmail.trim() || null,
            setup_completed: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (error) {
        console.error("Error saving org:", error);
        alert(t("error"));
        return;
      }

      // Redirect to org dashboard
      router.push("/org");
    } catch {
      alert(t("error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-[var(--muted-foreground)] mt-2">{t("subtitle")}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Organization Name */}
          <div>
            <label className="text-sm font-medium block mb-2">
              {t("orgName")} <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("orgNamePlaceholder")}
            />
          </div>

          {/* Organization Type */}
          <div>
            <label className="text-sm font-medium block mb-2">{t("orgType")}</label>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value as OrgType)}
              className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
            >
              <option value="school">{t("types.school")}</option>
              <option value="university">{t("types.university")}</option>
              <option value="business_school">{t("types.businessSchool")}</option>
              <option value="training_center">{t("types.trainingCenter")}</option>
            </select>
          </div>

          {/* Contact Email */}
          <div>
            <label className="text-sm font-medium block mb-2">{t("contactEmail")}</label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder={t("contactEmailPlaceholder")}
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{t("contactEmailHint")}</p>
          </div>

          {/* Billing Email */}
          <div>
            <label className="text-sm font-medium block mb-2">{t("billingEmail")}</label>
            <Input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder={t("billingEmailPlaceholder")}
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{t("billingEmailHint")}</p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="w-full"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {t("continue")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          {/* Skip Link */}
          <button
            onClick={() => router.push("/org")}
            className="w-full text-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {t("skipForNow")}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
