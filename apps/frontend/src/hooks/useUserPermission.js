"use client";
import { useUserPermissions } from "@/lib/queries/useUserPermission";
import { useAssignPermission } from "@/lib/mutations/useAssignPermission";


export const useUserPermission = (userId) => {
  const query = useUserPermissions(userId);
  const mutation = useAssignPermission();

  
  const save = (payload) => {
    return mutation.mutateAsync({
      userId,
      assignPermissionIds: payload?.assignPermissionIds ?? [],
      removePermissionIds: payload?.removePermissionIds ?? [],
    });
  };

  return {
    permissions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    save,
    isSaving: mutation.isPending,
  };
};
