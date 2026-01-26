"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditAdjustmentModal } from "@/components/admin/credit-adjustment-modal";
import {
  Search,
  Building2,
  Users,
  Loader2,
  CreditCard,
  Settings2,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  owner_id: string;
  owner_email: string | null;
  credit_balance: number;
  credit_allocated: number;
  available_credits: number;
  member_count: number;
  type: string;
  created_at: string;
}

export default function AdminOrganizationsPage() {
  const t = useTranslations("admin.organizations");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/admin/organizations?limit=200");
      if (!response.ok) {
        throw new Error("Failed to fetch organizations");
      }
      const data = await response.json();
      setOrganizations(data.organizations || []);
      setFilteredOrgs(data.organizations || []);
    } catch {
      setError("Erreur lors du chargement des organisations");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = organizations.filter(
        (o) =>
          o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(organizations);
    }
  }, [searchQuery, organizations]);

  const handleAdjustCredits = (org: Organization) => {
    setSelectedOrg(org);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSuccess = () => {
    setSuccess("Crédits ajustés avec succès");
    setTimeout(() => setSuccess(""), 3000);
    fetchOrganizations();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--muted)] rounded w-48"></div>
        <div className="h-10 bg-[var(--muted)] rounded"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-[var(--muted)] rounded-xl"></div>
        ))}
      </div>
    );
  }

  // Calculate totals
  const totalCredits = organizations.reduce(
    (sum, o) => sum + (o.credit_balance || 0),
    0
  );
  const totalAllocated = organizations.reduce(
    (sum, o) => sum + (o.credit_allocated || 0),
    0
  );
  const totalMembers = organizations.reduce(
    (sum, o) => sum + (o.member_count || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-[var(--muted-foreground)]">{t("subtitle")}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder={t("search")}
          className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" />
              <p className="text-sm text-[var(--muted-foreground)]">
                Organisations
              </p>
            </div>
            <p className="text-2xl font-bold">{organizations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-500" />
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("creditPool")}
              </p>
            </div>
            <p className="text-2xl font-bold">{totalCredits.toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("allocated")}
              </p>
            </div>
            <p className="text-2xl font-bold">{totalAllocated.toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("members")}
              </p>
            </div>
            <p className="text-2xl font-bold">{totalMembers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Organizations list */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {filteredOrgs.length} organisation
            {filteredOrgs.length > 1 ? "s" : ""}
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrgs.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("noOrganizations")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--muted-foreground)]">
                    <th className="p-4">Organisation</th>
                    <th className="p-4">{t("owner")}</th>
                    <th className="p-4">{t("creditPool")}</th>
                    <th className="p-4">{t("allocated")}</th>
                    <th className="p-4">{t("available")}</th>
                    <th className="p-4">{t("members")}</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              Créée le{" "}
                              {new Date(org.created_at).toLocaleDateString(
                                "fr-FR"
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {org.owner_email || "-"}
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-medium">
                          {org.credit_balance.toFixed(2)}€
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-blue-600 dark:text-blue-400">
                          {org.credit_allocated.toFixed(2)}€
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-green-600 dark:text-green-400">
                          {org.available_credits.toFixed(2)}€
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-[var(--muted-foreground)]" />
                          <span>{org.member_count}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdjustCredits(org)}
                        >
                          <Settings2 className="w-4 h-4 mr-1" />
                          {t("adjustCredits")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Adjustment Modal */}
      {selectedOrg && (
        <CreditAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setSelectedOrg(null);
          }}
          organizationId={selectedOrg.id}
          organizationName={selectedOrg.name}
          organizationBalance={selectedOrg.credit_balance}
          onSuccess={handleAdjustSuccess}
        />
      )}
    </div>
  );
}
