"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";


export const fetchAllPermissions = async () => {
  const { data } = await api.get("/permission");
  return data?.data ?? [];
};


export const usePermissions = (options = {}) => {
  return useQuery({
    queryKey: ["permission"],
    queryFn: fetchAllPermissions,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
