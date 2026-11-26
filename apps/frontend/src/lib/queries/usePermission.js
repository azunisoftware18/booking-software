"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";


export const fetchAllPermissions = async () => {
  const { data } = await api.get("/permission");
  return data?.data ?? [];
};

export const fetchAvailablePermissions = async () => {
  const { data } = await api.get("/permission/available");
  return data?.data ?? [];
};

export const useAvailablePermissions = (options = {}) => {
  return useQuery({
    queryKey: ["permission", "available"],
    queryFn: fetchAvailablePermissions,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const usePermissions = (options = {}) => {
  return useQuery({
    queryKey: ["permission"],
    queryFn: fetchAllPermissions,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
