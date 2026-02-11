import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Receipt, ExternalLink, CreditCard, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function PurchasesPage() {
  const t = await getTranslations("purchases");
  const supabase = await createClient();

  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch personal purchases (type = 'purchase' with positive amount)
  const { data: personalPurchases } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "purchase")
    .gt("amount", 0)
    .order("created_at", { ascending: false });

  // Check if user is in an organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .single();

  // Fetch organization purchases if user is owner/admin
  let orgPurchases: Array<{
    id: string;
    amount: number;
    description: string;
    receipt_url: string | null;
    created_at: string;
    org_name: string;
  }> = [];

  if (membership?.organization_id) {
    const { data: orgTx } = await supabase
      .from("organization_transactions")
      .select("id, amount, description, receipt_url, created_at")
      .eq("organization_id", membership.organization_id)
      .eq("type", "purchase")
      .order("created_at", { ascending: false });

    if (orgTx) {
      // Handle the nested organization object from Supabase join
      const orgData = membership.organizations as unknown as { name: string } | null;
      const orgName = orgData?.name || "";

      orgPurchases = orgTx.map((tx) => ({
        ...tx,
        org_name: orgName,
      }));
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasAnyPurchases = (personalPurchases?.length || 0) > 0 || orgPurchases.length > 0;

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-600" />
            <h1 className="text-xl font-semibold">{t("title")}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!hasAnyPurchases ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
              <h2 className="text-lg font-medium mb-2">{t("noPurchases")}</h2>
              <p className="text-[var(--muted-foreground)] mb-6">
                {t("noPurchasesDescription")}
              </p>
              <Link
                href="/dashboard/credits"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                {t("buyCredits")}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Personal Purchases */}
            {personalPurchases && personalPurchases.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                    <h2 className="font-semibold">{t("personalPurchases")}</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-[var(--border)]">
                    {personalPurchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="py-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {purchase.description || t("creditPurchase")}
                          </p>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {formatDate(purchase.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-green-600">
                            +{formatCurrency(purchase.amount)}
                          </span>
                          {purchase.receipt_url ? (
                            <a
                              href={purchase.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors text-sm font-medium"
                            >
                              <Receipt className="w-4 h-4" />
                              {t("viewReceipt")}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-sm text-[var(--muted-foreground)]">
                              {t("noReceipt")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organization Purchases */}
            {orgPurchases.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-accent-600" />
                    <h2 className="font-semibold">{t("organizationPurchases")}</h2>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      ({orgPurchases[0].org_name})
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-[var(--border)]">
                    {orgPurchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="py-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {purchase.description || t("creditPurchase")}
                          </p>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {formatDate(purchase.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-green-600">
                            +{formatCurrency(purchase.amount)}
                          </span>
                          {purchase.receipt_url ? (
                            <a
                              href={purchase.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 hover:bg-accent-100 dark:hover:bg-accent-900/30 transition-colors text-sm font-medium"
                            >
                              <Receipt className="w-4 h-4" />
                              {t("viewReceipt")}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-sm text-[var(--muted-foreground)]">
                              {t("noReceipt")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Info notice */}
        <div className="mt-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t("receiptInfo")}
          </p>
        </div>
      </main>
    </div>
  );
}
