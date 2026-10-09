
"use client";
import { useMemo } from "react";
import { usePermissions } from "@/lib/queries/usePermission";

export const usePermission = () => {
  const { data, isLoading, isError, error, refetch } = usePermissions();

  // group by resource
  const grouped = useMemo(() => {
    return (data ?? []).reduce((acc, perm) => {
      if (!acc[perm.resource]) acc[perm.resource] = [];
      acc[perm.resource].push(perm);
      return acc;
    }, {});
  }, [data]);

  return {
    permissions: data ?? [],
    grouped,
    isLoading,
    isError,
    error,
    refetch,
  };
};