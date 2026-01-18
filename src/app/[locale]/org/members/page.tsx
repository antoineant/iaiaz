"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Search,
  MoreVertical,
  Loader2,
  UserPlus,
} from "lucide-react";
import NextLink from "next/link";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: string;
  class_name?: string;
  credit_allocated: number;
  credit_used: number;
  status: string;
  joined_at: string;
}

export default function OrgMembersPage() {
  const t = useTranslations("org.members");
  const tRoles = useTranslations("org.roles");
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const loadMembers = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user's organization
      const { data: orgMember } = await supabase.rpc("get_user_organization", {
        p_user_id: user.id,
      });

      if (!orgMember || orgMember.length === 0) return;

      const organizationId = orgMember[0].organization_id;
      setOrgId(organizationId);

      // Get all members with their profile info
      const { data: membersData } = await supabase
        .from("organization_members")
        .select(
          `
          id,
          user_id,
          role,
          class_name,
          credit_allocated,
          credit_used,
          status,
          joined_at,
          profiles(email)
        `
        )
        .eq("organization_id", organizationId)
        .order("joined_at", { ascending: false });

      if (membersData) {
        const formattedMembers = membersData.map((m) => {
          const profile = m.profiles as unknown as { email: string } | null;
          return {
            id: m.id,
            user_id: m.user_id,
            email: profile?.email || "Unknown",
            role: m.role,
            class_name: m.class_name,
            credit_allocated: m.credit_allocated,
            credit_used: m.credit_used,
            status: m.status,
            joined_at: m.joined_at,
          };
        });
        setMembers(formattedMembers);
        setFilteredMembers(formattedMembers);
      }

      setIsLoading(false);
    };

    loadMembers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredMembers(
        members.filter(
          (m) =>
            m.email.toLowerCase().includes(query) ||
            m.class_name?.toLowerCase().includes(query) ||
            m.role.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, members]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "admin":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "teacher":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <NextLink href="/org/invites">
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            {t("addMember")}
          </Button>
        </NextLink>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <Input
            type="text"
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Members table */}
      <Card>
        <CardContent className="p-0">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              {t("noMembers")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("email")}
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("role")}
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("class")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("allocated")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("used")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("remaining")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{member.email}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            member.role
                          )}`}
                        >
                          {tRoles(member.role)}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--muted-foreground)]">
                        {member.class_name || "-"}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {member.credit_allocated.toFixed(2)}€
                      </td>
                      <td className="p-4 text-right font-mono text-[var(--muted-foreground)]">
                        {member.credit_used.toFixed(2)}€
                      </td>
                      <td className="p-4 text-right font-mono">
                        <span
                          className={
                            member.credit_allocated - member.credit_used <= 0
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          }
                        >
                          {(member.credit_allocated - member.credit_used).toFixed(2)}€
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-2 hover:bg-[var(--muted)] rounded-lg">
                          <MoreVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="mt-4 text-sm text-[var(--muted-foreground)]">
        {filteredMembers.length} {t("members").toLowerCase()}
        {searchQuery && ` (${members.length} total)`}
      </div>
    </div>
  );
}
