import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Analytics
export function useFamilyAnalytics(orgId: string | undefined) {
  return useQuery({
    queryKey: ["familyAnalytics", orgId],
    queryFn: () => api.getFamilyAnalytics(orgId!),
    enabled: !!orgId,
  });
}

export function useChildAnalytics(
  orgId: string | undefined,
  childId: string | undefined
) {
  return useQuery({
    queryKey: ["childAnalytics", orgId, childId],
    queryFn: () => api.getChildAnalytics(orgId!, childId!),
    enabled: !!orgId && !!childId,
  });
}

export function useChildInsights(
  orgId: string | undefined,
  childId: string | undefined
) {
  return useQuery({
    queryKey: ["childInsights", orgId, childId],
    queryFn: () => api.getChildInsights(orgId!, childId!),
    enabled: !!orgId && !!childId,
  });
}

export function useMyStats() {
  return useQuery({
    queryKey: ["myStats"],
    queryFn: () => api.getMyStats(),
  });
}

// Controls
export function useControls(
  orgId: string | undefined,
  childId: string | undefined
) {
  return useQuery({
    queryKey: ["controls", orgId, childId],
    queryFn: () => api.getControls(orgId!, childId!),
    enabled: !!orgId && !!childId,
  });
}

export function useUpdateControls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      childId,
      settings,
    }: {
      orgId: string;
      childId: string;
      settings: Record<string, any>;
    }) => api.updateControls(orgId, childId, settings),
    onSuccess: (_, { orgId, childId }) => {
      queryClient.invalidateQueries({
        queryKey: ["controls", orgId, childId],
      });
      queryClient.invalidateQueries({ queryKey: ["familyAnalytics", orgId] });
    },
  });
}

// Assistants
export function useAssistants() {
  return useQuery({
    queryKey: ["assistants"],
    queryFn: () => api.getAssistants(),
  });
}

export function useCreateAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createAssistant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
    },
  });
}

export function useDeleteAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAssistant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
    },
  });
}

export function useUpdateAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      api.updateAssistant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
    },
  });
}

export function useAssistantXp(id: string | undefined) {
  return useQuery({
    queryKey: ["assistantXp", id],
    queryFn: () => api.getAssistantXp(id!),
    enabled: !!id,
  });
}

export function useAdoptAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareCode: string) => api.adoptAssistant(shareCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
    },
  });
}

export function useGenerateShareCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.generateShareCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
    },
  });
}

// Credits
export function useTransferCredits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      childId,
      amount,
    }: {
      orgId: string;
      childId: string;
      amount: number;
    }) => api.transferCredits(orgId, childId, amount),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ["familyAnalytics", orgId] });
    },
  });
}

export function useRequestCredits() {
  return useMutation({
    mutationFn: (orgId: string) => api.requestCredits(orgId),
  });
}

// Conversations
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.getConversations(),
  });
}

// Child Profile
export function useChildProfile(
  orgId: string | undefined,
  childId: string | undefined
) {
  return useQuery({
    queryKey: ["childProfile", orgId, childId],
    queryFn: () => api.getChildProfile(orgId!, childId!),
    enabled: !!orgId && !!childId,
  });
}

// Invites
export function useSendInvite() {
  return useMutation({
    mutationFn: ({
      orgId,
      email,
      role,
    }: {
      orgId: string;
      email: string;
      role: string;
    }) => api.sendInvite(orgId, email, role),
  });
}

// Theme
export function useUpdateTheme() {
  return useMutation({
    mutationFn: (color: string) => api.updateTheme(color),
  });
}
